import os
import httpx
import logging
from typing import Optional, List
from fastapi import APIRouter, Request, Depends
from fastapi.security import HTTPAuthorizationCredentials
from schemas.models import ChatRequest
from core.database import query_db, get_user_uuid, calculator_db, goals_db, activities_db
from core.security import security_bearer, decode_optional_jwt
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter(prefix="/api/coach", tags=["coach"])
limiter = Limiter(key_func=get_remote_address)
logger = logging.getLogger("greenbit")

@router.post("/chat")
@limiter.limit("10/minute")
async def chat_with_coach(request: Request, req: ChatRequest) -> dict:
    user_query = req.message.lower()

    latest_calc: Optional[dict] = None
    active_goals: List[dict] = []
    recent_acts: List[dict] = []

    db_url = os.getenv("DATABASE_URL")
    auth_header = request.headers.get("Authorization", "")
    _creds: Optional[HTTPAuthorizationCredentials] = None
    if auth_header.startswith("Bearer "):
        parts = auth_header.split(" ", 1)
        if len(parts) == 2 and parts[1].strip():
            _creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=parts[1].strip())
    email: Optional[str] = decode_optional_jwt(_creds)

    if db_url and email:
        uid = get_user_uuid(email)
        if uid:
            latest_calc = query_db(
                "SELECT * FROM calculator_records WHERE user_id = %s ORDER BY timestamp DESC LIMIT 1",
                (uid,), one=True,
            )
            active_goals = query_db(
                "SELECT * FROM goals WHERE user_id = %s AND completed = false", (uid,)
            )
            recent_acts = query_db(
                "SELECT * FROM activities WHERE user_id = %s ORDER BY date DESC, id DESC LIMIT 3",
                (uid,),
            )
    else:
        latest_calc = calculator_db[-1] if calculator_db else None
        active_goals = [g for g in goals_db if not g["completed"]]
        recent_acts = activities_db[-3:]

    system_prompt = (
        "You are GreenBit's AI Sustainability Coach. You analyze the user's habits, footprint, "
        "and active goals to suggest actionable sustainability advice. Answer in clean markdown. "
        "Keep it concise, professional, and positive. CRITICAL: For every recommendation you provide, "
        "you MUST include the Estimated CO2 reduction, Difficulty (Easy/Medium/Hard), and Cost (Free/$). "
        "Format them clearly using bullet points or inline text.\n\n"
        f"USER PROFILE/CONTEXT:\n"
        f"- Carbon calculator baseline: {latest_calc or 'No baseline recorded'}\n"
        f"- Active goals: {active_goals}\n"
        f"- Recent logged activities: {recent_acts}\n"
    )

    api_key_gemini = os.getenv("GEMINI_API_KEY")
    api_key_openai = os.getenv("OPENAI_API_KEY")

    if api_key_gemini:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key_gemini}"
            payload = {"contents": [{"role": "user", "parts": [{"text": system_prompt + f"\nUser Query: {req.message}"}]}]}
            async with httpx.AsyncClient() as client:
                res = await client.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=10.0)
                if res.status_code == 200:
                    data = res.json()
                    ai_text = data["candidates"][0]["content"]["parts"][0]["text"]
                    return {"response": ai_text, "source": "gemini"}
        except Exception:
            logger.warning("Gemini API call failed, falling back to OpenAI or local engine.")

    if api_key_openai:
        try:
            payload = {
                "model": "gpt-4o-mini",
                "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": req.message}],
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
                    return {"response": ai_text, "source": "openai"}
        except Exception:
            logger.warning("OpenAI API call failed, falling back to local engine.")

    if "reduce" in user_query or "footprint" in user_query or "habit" in user_query:
        advices = []
        if latest_calc:
            if latest_calc.get("travel_distance", 0) > 100:
                advices.append("* **Transportation**: Consider carpooling or switching to public transit.\n  - *Estimated CO₂ reduction*: **150 kg CO₂e/mo**\n  - *Difficulty*: **Medium**\n  - *Cost*: **Free/Low**")
            if latest_calc.get("electricity_usage", 0) > 150:
                advices.append("* **Electricity**: Unplug appliances in standby modes or switch to LED bulbs.\n  - *Estimated CO₂ reduction*: **40 kg CO₂e/mo**\n  - *Difficulty*: **Easy**\n  - *Cost*: **Free to $$**")
            if latest_calc.get("diet_preference") == "meat":
                advices.append("* **Diet**: Swap 3 beef/pork meals for vegetarian alternatives weekly.\n  - *Estimated CO₂ reduction*: **50 kg CO₂e/mo**\n  - *Difficulty*: **Medium**\n  - *Cost*: **Free**")
        if not advices:
            advices = [
                "* **Commutes**: Switch drive times to train/bus rides or bicycling.\n  - *Estimated CO₂ reduction*: **60 kg CO₂e/mo**\n  - *Difficulty*: **Medium**\n  - *Cost*: **Free**",
                "* **Power**: Switch off unused appliances and unplug chargers.\n  - *Estimated CO₂ reduction*: **20 kg CO₂e/mo**\n  - *Difficulty*: **Easy**\n  - *Cost*: **Free**",
                "* **Meals**: Try to incorporate vegetarian lunch breaks twice a week.\n  - *Estimated CO₂ reduction*: **30 kg CO₂e/mo**\n  - *Difficulty*: **Easy**\n  - *Cost*: **Free**",
            ]
        reply = (
            "### AI Coach Footprint Reduction Plan 🌿\n\n"
            "Here are tailored steps based on your current tracking profile:\n\n"
            + "\n".join(advices)
            + "\n\nWould you like me to convert one of these recommendations into an active goal tracking milestone?"
        )
        return {"response": reply, "source": "local_coach_engine"}

    elif "contribute" in user_query or "most" in user_query or "source" in user_query or "emission" in user_query:
        if latest_calc:
            travel = latest_calc.get("travel_distance", 0) * 0.15
            elec = latest_calc.get("electricity_usage", 0) * 0.4
            food = 80 if latest_calc.get("diet_preference") == "meat" else 30
            waste = latest_calc.get("waste_generation", 0) * 2.0
            contribs = sorted(
                [("Transportation", travel), ("Energy & Power", elec), ("Food & Meals", food), ("Waste Disposal", waste)],
                key=lambda x: x[1], reverse=True,
            )
            breakdown = "\n".join([f"- **{name}**: ~{v:.1f} kg CO₂e/mo" for name, v in contribs])
            reply = (
                f"### Emissions Contribution Analysis 📊\n\n"
                f"Based on your calculated baseline profile, your **biggest contributor** is **{contribs[0][0]}**.\n\n"
                f"Here is your estimated monthly emissions distribution:\n{breakdown}\n\n"
                "I suggest we create a challenge specifically targeting this area!"
            )
        else:
            reply = (
                "### Emissions Source Breakdown\n\n"
                "You haven't recorded a baseline profile in our Carbon Calculator yet! "
                "Go to the **Activity Tracker** → **Calculator** sub-tab to fill in your details."
            )
        return {"response": reply, "source": "local_coach_engine"}

    elif "improve" in user_query or "week" in user_query or "next" in user_query:
        if active_goals:
            next_goal = active_goals[0]
            reply = (
                f"### Weekly Improvement Recommendations 🎯\n\n"
                f"This week, let's focus on completing your goal: **\"{next_goal['title']}\"**.\n\n"
                f"You have completed **{next_goal['current_value']} / {next_goal['target_value']} {next_goal['unit']}** so far.\n\n"
                "Tips to push it over the line:\n"
                "- If transport-related, try logging a train commute today.\n"
                "- If electricity-related, switch appliances off when leaving the workspace.\n\n"
                "Let's get those points! 🚀"
            )
        else:
            reply = (
                "### Weekly Improvement Recommendations 🌟\n\n"
                "All your active sustainability goals are completed! Awesome job! 🌳\n\n"
                "For your next challenge this week, I recommend:\n"
                "1. **Bicycle commute challenge**: Log at least 15 km of non-car transport.\n"
                "2. **Eco electricity logging**: Unplug 3 standby devices.\n\n"
                "Navigate to the **Sustainability Goals** page to create one of these challenges!"
            )
        return {"response": reply, "source": "local_coach_engine"}

    else:
        reply = (
            "### Welcome to the GreenBit Coach! 🤖\n\n"
            "Hello! I am your AI-powered Sustainability Coach. I analyze your carbon baseline, "
            "tracker logs, and goals to build custom reduction strategies.\n\n"
            "Feel free to ask me:\n"
            "- *How can I reduce my footprint?*\n"
            "- *What contributes most to my emissions?*\n"
            "- *What should I improve this week?*"
        )
        return {"response": reply, "source": "local_coach_engine"}
