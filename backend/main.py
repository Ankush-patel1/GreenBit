import os
from typing import Any
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from core.config import allow_origins, logger
from core.database import query_db

from routers.auth import router as auth_router
from routers.calculator import router as calculator_router
from routers.activities import router as activities_router
from routers.goals import router as goals_router
from routers.gamification import router as gamification_router
from routers.coach import router as coach_router
from routers.simulator import router as simulator_router
from routers.predictions import router as predictions_router
from routers.rag import router as rag_router
from routers.rag import RAG_AVAILABLE

app = FastAPI(
    title="GreenBit API",
    version="1.0.0",
    description="Climate intelligence platform — carbon tracking, AI coaching, and sustainability goals.",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
)

@app.middleware("http")
async def add_security_headers(request: Request, call_next: Any) -> Response:
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    return response

app.include_router(auth_router)
app.include_router(calculator_router)
app.include_router(activities_router)
app.include_router(goals_router)
app.include_router(gamification_router)
app.include_router(coach_router)
app.include_router(simulator_router)
app.include_router(predictions_router)
app.include_router(rag_router)

@app.on_event("startup")
async def startup_event() -> None:
    db_url = os.getenv("DATABASE_URL")
    logger.info("GreenBit API starting up — version 1.0.0")
    logger.info("Database: %s", "PostgreSQL (connected)" if db_url else "In-memory fallback")
    logger.info("CORS origins: %s", allow_origins)
    logger.info("RAG (FAISS): %s", "available" if RAG_AVAILABLE else "unavailable (langchain not installed)")

@app.get("/api/health")
def health() -> dict:
    db_url = os.getenv("DATABASE_URL")
    db_status = "unavailable"
    if db_url:
        try:
            result = query_db("SELECT 1 AS ok", one=True)
            db_status = "connected" if result else "degraded"
        except Exception:
            db_status = "disconnected"
    else:
        db_status = "in-memory"

    return {
        "status": "healthy",
        "service": "GreenBit API",
        "version": "1.0.0",
        "database": db_status,
    }
