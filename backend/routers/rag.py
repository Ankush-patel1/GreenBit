import os
import httpx
import logging
from typing import List
import numpy as np
from fastapi import APIRouter, Request
from schemas.models import RAGRequest
from slowapi import Limiter
from slowapi.util import get_remote_address

try:
    from langchain_core.embeddings import Embeddings
    from langchain_community.vectorstores import FAISS
    from langchain_core.documents import Document
    RAG_AVAILABLE = True
except ImportError:
    RAG_AVAILABLE = False

router = APIRouter(prefix="/api/rag", tags=["rag"])
limiter = Limiter(key_func=get_remote_address)
logger = logging.getLogger("greenbit")

_KNOWLEDGE_DOCS_CONTENT = [
    {
        "page_content": (
            "Carbon neutrality is achieving net-zero carbon dioxide emissions by balancing carbon "
            "emissions with carbon removal, or simply by eliminating carbon emissions altogether. "
            "It is used in the context of carbon dioxide-releasing processes associated with "
            "transportation, energy production, agriculture, and industry."
        ),
        "metadata": {"title": "Carbon Neutrality Guide", "source": "sustainability_guides.md"},
    },
    {
        "page_content": (
            "Households can reduce carbon emissions significantly through three main areas: "
            "Energy (unplugging standby appliances, installing LED bulbs, lowering thermostat values), "
            "Food (swapping beef/pork meals for plant-based vegetarian options to save up to 1.5kg CO2e "
            "per meal), and Waste (separating recycling indexes for glass and plastics)."
        ),
        "metadata": {"title": "Household Emission Reduction Report", "source": "carbon_reduction_reports.md"},
    },
    {
        "page_content": (
            "Public transport plays a major role in climate offset actions. Commuting via metro, trains, "
            "or clean buses instead of personal fossil-fuel vehicles reduces individual transportation "
            "emissions by up to 80% per kilometer. Logged transits have shown to save approximately "
            "4.2kg CO2e per average trip."
        ),
        "metadata": {"title": "Climate Transit Awareness Document", "source": "climate_awareness_documents.md"},
    },
]

if RAG_AVAILABLE:
    class SimpleLocalEmbeddings(Embeddings):
        def embed_documents(self, texts: List[str]) -> List[List[float]]:
            return [self._embed_text(t) for t in texts]

        def embed_query(self, text: str) -> List[float]:
            return self._embed_text(text)

        def _embed_text(self, text: str) -> List[float]:
            vector = [0.0] * 64
            cleaned = text.lower()
            for idx, char in enumerate("abcdefghijklmnopqrstuvwxyz"):
                weight = cleaned.count(char) / (len(cleaned) + 1)
                vector[idx % 64] += weight
            norm = np.linalg.norm(vector)
            if norm > 0:
                vector = [float(v / norm) for v in vector]
            return vector

    _docs = [
        Document(page_content=d["page_content"], metadata=d["metadata"])
        for d in _KNOWLEDGE_DOCS_CONTENT
    ]
    faiss_db = FAISS.from_documents(_docs, SimpleLocalEmbeddings())
else:
    faiss_db = None

_LOCAL_DOCS = [
    {
        "title": d["metadata"]["title"],
        "source": d["metadata"]["source"],
        "content": d["page_content"],
    }
    for d in _KNOWLEDGE_DOCS_CONTENT
]

@router.post("/ask")
@limiter.limit("10/minute")
async def ask_rag_assistant(request: Request, req: RAGRequest) -> dict:
    user_query = req.query.lower()
    retrieved_chunks: List[dict] = []
    
    if RAG_AVAILABLE and faiss_db:
        try:
            results = faiss_db.similarity_search(req.query, k=2)
            retrieved_chunks = [
                {"title": doc.metadata.get("title"), "source": doc.metadata.get("source"), "content": doc.page_content}
                for doc in results
            ]
        except Exception:
            logger.warning("FAISS similarity search failed, using keyword fallback.")

    if not retrieved_chunks:
        if "neutral" in user_query or "neutrality" in user_query:
            retrieved_chunks.append(_LOCAL_DOCS[0])
        if any(kw in user_query for kw in ("household", "reduce", "home", "energy")):
            retrieved_chunks.append(_LOCAL_DOCS[1])
        if any(kw in user_query for kw in ("transport", "metro", "bus", "train", "commute")):
            retrieved_chunks.append(_LOCAL_DOCS[2])
        if not retrieved_chunks:
            retrieved_chunks = _LOCAL_DOCS[:2]

    context_str = "\n\n".join([f"Source: {c['title']}\n{c['content']}" for c in retrieved_chunks])
    system_prompt = (
        "You are GreenBit's AI Sustainability Library Assistant. Answer the user's question using "
        "ONLY the provided retrieved context. Include reference tags (e.g. [Carbon Neutrality Guide]) "
        "matching where the information came from. Keep it concise, friendly, and factual.\n\n"
        f"RETRIEVED KNOWLEDGE CONTEXT:\n{context_str}"
    )

    api_key_gemini = os.getenv("GEMINI_API_KEY")
    api_key_openai = os.getenv("OPENAI_API_KEY")

    if api_key_gemini:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key_gemini}"
            payload = {"contents": [{"role": "user", "parts": [{"text": system_prompt + f"\nUser Query: {req.query}"}]}]}
            async with httpx.AsyncClient() as client:
                res = await client.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=10.0)
                if res.status_code == 200:
                    ai_text = res.json()["candidates"][0]["content"]["parts"][0]["text"]
                    return {"response": ai_text, "sources": retrieved_chunks, "engine": "gemini"}
        except Exception:
            logger.warning("RAG: Gemini API call failed, falling back.")

    if api_key_openai:
        try:
            payload = {
                "model": "gpt-4o-mini",
                "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": req.query}],
            }
            async with httpx.AsyncClient() as client:
                res = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    json=payload,
                    headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key_openai}"},
                    timeout=10.0,
                )
                if res.status_code == 200:
                    ai_text = res.json()["choices"][0]["message"]["content"]
                    return {"response": ai_text, "sources": retrieved_chunks, "engine": "openai"}
        except Exception:
            logger.warning("RAG: OpenAI API call failed, falling back.")

    synthesized: List[str] = []
    if "neutral" in user_query or "neutrality" in user_query:
        synthesized.append(
            "According to the **Carbon Neutrality Guide**, carbon neutrality means achieving **net-zero carbon dioxide emissions** "
            "by balancing existing emissions with removal, or eliminating them altogether."
        )
    if any(kw in user_query for kw in ("household", "reduce", "home", "energy")):
        synthesized.append(
            "As detailed in the **Household Emission Reduction Report**, households can optimize offsets in: "
            "1) **Energy**: turn off standby appliances, lower thermostats, use LEDs. "
            "2) **Food**: swap meat for vegetarian options to save up to **1.5kg CO₂e** per meal. "
            "3) **Waste**: separate plastics and glass."
        )
    if any(kw in user_query for kw in ("transport", "metro", "bus", "train", "commute")):
        synthesized.append(
            "Based on the **Climate Transit Awareness Document**, commuting via public transport "
            "reduces transportation footprint by up to **80% per kilometer**, saving roughly **4.2kg CO₂e** per trip."
        )
    if not synthesized:
        synthesized.append(
            f"Here is what I found in our Climate Library regarding \"{req.query}\":\n\n"
            "1. **Carbon Neutrality**: balancing carbon output with removal ([Carbon Neutrality Guide]).\n"
            "2. **Household Actions**: optimize energy standby settings and diet ([Household Emission Reduction Report])."
        )

    return {"response": "\n\n".join(synthesized), "sources": retrieved_chunks, "engine": "local_rag_synthesis"}
