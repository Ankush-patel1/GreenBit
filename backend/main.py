"""
GreenBit API — FastAPI Backend
================================
Production-ready climate intelligence platform backend.

Architecture:
- FastAPI with Pydantic v2 schema validation
- JWT-based authentication (HS256)
- PostgreSQL via psycopg2 (with in-memory fallback for development)
- Rate limiting via slowapi
- Structured logging (no print() statements)
- Security headers via middleware
- CORS configured from environment variables only

Environment variables (see .env.example):
- SECRET_KEY          — JWT signing secret (required in production)
- DATABASE_URL        — PostgreSQL connection string (optional)
- CORS_ORIGINS        — Comma-separated allowed origins
- GEMINI_API_KEY      — Google Gemini LLM key (optional)
- OPENAI_API_KEY      — OpenAI LLM key (optional)
- LOG_LEVEL           — Logging verbosity: DEBUG|INFO|WARNING|ERROR (default: INFO)
"""
import datetime
import os
import sys
import decimal
import logging
from contextlib import contextmanager
from typing import Dict, Optional, List, Generator, Any

import jwt
import httpx
import numpy as np
import psycopg2
import psycopg2.extras
from fastapi import FastAPI, HTTPException, status, Request, Depends, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, field_validator, ConfigDict
from sklearn.linear_model import LinearRegression
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

# ─── Logging Setup ────────────────────────────────────────────────────────────
# Use structured logging instead of print() throughout

_log_level_str = os.getenv("LOG_LEVEL", "INFO").upper()
_log_level = getattr(logging, _log_level_str, logging.INFO)

logging.basicConfig(
    level=_log_level,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("greenbit")

# ─── Secret Key Validation ────────────────────────────────────────────────────
# [SEC-04] Fail fast if no secret key is configured in production.

_raw_secret = os.getenv("SECRET_KEY")
if not _raw_secret:
    # Allow test mode to proceed with a test-only key
    _raw_secret = os.getenv("TEST_SECRET_KEY", "test-secret-for-pytest-only")
    if "pytest" not in sys.modules:
        raise RuntimeError(
            "SECRET_KEY environment variable is not set. "
            "Set it to a strong random value before starting GreenBit."
        )
SECRET_KEY: str = _raw_secret
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ─── FastAPI Application ──────────────────────────────────────────────────────

app = FastAPI(
    title="GreenBit API",
    version="1.0.0",
    description="Climate intelligence platform — carbon tracking, AI coaching, and sustainability goals.",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ─── Rate Limiting ────────────────────────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─── CORS Middleware ──────────────────────────────────────────────────────────
# [SEC-03] Read allowed origins from environment variable only.

_cors_origins_str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")
allow_origins: List[str] = [o.strip() for o in _cors_origins_str.split(",") if o.strip()]

if "*" in allow_origins:
    logger.warning(
        "CORS_ORIGINS is set to '*' (wildcard). "
        "This is insecure for production. Set explicit allowed origins."
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
)

# ─── Security Headers Middleware ──────────────────────────────────────────────
# [SEC-NEW] Add security headers on every response.

@app.middleware("http")
async def add_security_headers(request: Request, call_next: Any) -> Response:
    """Attach security headers to every HTTP response."""
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    return response

# ─── JWT Bearer Scheme ────────────────────────────────────────────────────────
# [SEC-05] Validate Bearer JWT token from Authorization header.

security_bearer = HTTPBearer(auto_error=False)

# ─── Database Helpers ─────────────────────────────────────────────────────────

def _serialize_row(row: Dict[str, Any]) -> Dict[str, Any]:
    """Convert non-JSON-serializable types in a database row to Python primitives."""
    for k, v in list(row.items()):
        if isinstance(v, decimal.Decimal):
            row[k] = float(v)
        elif isinstance(v, datetime.datetime):
            row[k] = v.strftime("%Y-%m-%d %H:%M:%S")
        elif isinstance(v, datetime.date):
            row[k] = v.strftime("%Y-%m-%d")
    return row


@contextmanager
def get_db_connection() -> Generator[psycopg2.extensions.connection, None, None]:
    """
    Context manager that opens and closes a psycopg2 connection.
    Strips pgbouncer parameters from the URL before connecting.

    Raises:
        HTTPException: 500 if the connection fails.
    """
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise HTTPException(status_code=500, detail="DATABASE_URL is not configured.")
    # Strip pgbouncer session parameters
    clean_url = db_url.split("?")[0]
    conn = None
    try:
        conn = psycopg2.connect(clean_url)
        yield conn
    except psycopg2.Error as exc:
        logger.error("Database connection error: %s", exc)
        raise HTTPException(status_code=500, detail="Database connection error.") from exc
    finally:
        if conn is not None:
            conn.close()


def query_db(
    query: str,
    params: tuple = (),
    one: bool = False,
) -> Any:
    """
    Execute a SQL query and return results as a list of dicts (or a single dict).

    Args:
        query:  SQL statement (use %s placeholders to prevent injection).
        params: Tuple of parameters for the query.
        one:    If True, return the first row or None.

    Returns:
        A list of row dicts, a single row dict, or None / [] depending on `one`.

    Raises:
        HTTPException: 500 on database errors.
    """
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        return None if one else []

    with get_db_connection() as conn:
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(query, params)

                is_write = query.strip().upper().startswith(("INSERT", "UPDATE", "DELETE"))
                if is_write:
                    conn.commit()
                    try:
                        rows = cur.fetchall()
                    except psycopg2.ProgrammingError:
                        rows = []
                else:
                    rows = cur.fetchall()

                serialized = [_serialize_row(dict(r)) for r in rows]
                if one:
                    return serialized[0] if serialized else None
                return serialized
        except psycopg2.Error as exc:
            logger.error("Query execution error: %s", exc)
            raise HTTPException(status_code=500, detail="Database query error.") from exc


def get_user_uuid(email: str) -> Optional[str]:
    """Return the UUID for a user by email, or None if not found or DB unavailable."""
    if not os.getenv("DATABASE_URL"):
        return None
    user = query_db("SELECT id FROM users WHERE email = %s", (email,), one=True)
    return str(user["id"]) if user else None


# ─── In-Memory Fallback Stores ────────────────────────────────────────────────
# Used when DATABASE_URL is not configured (local development / testing).

users_db: Dict[str, dict] = {
    "demo@greenbit.com": {
        "name": "Demo User",
        "email": "demo@greenbit.com",
        "hashed_password": pwd_context.hash("password123"),
    }
}

calculator_db: List[dict] = []
activities_db: List[dict] = [
    {"id": 1, "type": "transport", "name": "Metro commute", "value": 15.0, "impact": -4.2,
     "date": datetime.date.today().strftime("%Y-%m-%d")},
    {"id": 2, "type": "food", "name": "Vegetarian meals", "value": 3.0, "impact": -2.1,
     "date": datetime.date.today().strftime("%Y-%m-%d")},
    {"id": 3, "type": "energy", "name": "Appliance eco use", "value": 4.0, "impact": -1.5,
     "date": (datetime.date.today() - datetime.timedelta(days=1)).strftime("%Y-%m-%d")},
]
goals_db: List[dict] = [
    {"id": 1, "type": "reduce_emissions", "title": "Reduce home footprints",
     "target_value": 150.0, "current_value": 95.0, "unit": "kg CO2e", "completed": False,
     "date_created": datetime.date.today().strftime("%Y-%m-%d")},
    {"id": 2, "type": "public_transport", "title": "Weekly commute shift",
     "target_value": 50.0, "current_value": 40.0, "unit": "km", "completed": False,
     "date_created": datetime.date.today().strftime("%Y-%m-%d")},
    {"id": 3, "type": "reduce_electricity", "title": "Power optimization",
     "target_value": 120.0, "current_value": 120.0, "unit": "kWh", "completed": True,
     "date_created": (datetime.date.today() - datetime.timedelta(days=5)).strftime("%Y-%m-%d")},
]
rewards_db: dict = {
    "points": 450,
    "level": "Sapling",
    "badges": [
        {"id": "green_traveler", "title": "Green Traveler",
         "description": "Log 5 public transit activities", "unlocked": True,
         "unlocked_date": "2026-06-10"},
        {"id": "energy_saver", "title": "Energy Saver",
         "description": "Reduce electricity usage by 10%", "unlocked": False,
         "unlocked_date": None},
        {"id": "waste_warrior", "title": "Waste Warrior",
         "description": "Log 3 waste optimization records", "unlocked": True,
         "unlocked_date": "2026-06-11"},
    ],
}
leaderboard_db: List[dict] = [
    {"rank": 1, "name": "Elena Rostova", "level": "Forest Guardian", "points": 1420,
     "carbon_saved": 420.5, "is_current_user": False},
    {"rank": 2, "name": "Marcus Aurelius", "level": "Tree", "points": 890,
     "carbon_saved": 280.2, "is_current_user": False},
    {"rank": 3, "name": "Demo User (You)", "level": "Sapling", "points": 450,
     "carbon_saved": 150.0, "is_current_user": True},
    {"rank": 4, "name": "Sophia Lin", "level": "Sapling", "points": 380,
     "carbon_saved": 110.8, "is_current_user": False},
    {"rank": 5, "name": "Liam Davies", "level": "Seed", "points": 180,
     "carbon_saved": 45.2, "is_current_user": False},
]
simulator_db: List[dict] = [
    {
        "id": 1, "name": "Eco Commute & Diet", "commute_shift": 40.0,
        "ac_reduction": 2.0, "vegetarian_meals": 5.0, "current_emissions": 410.0,
        "future_emissions": 315.5, "savings_percent": 23.0, "annual_impact": 1.13,
        "date": datetime.date.today().strftime("%Y-%m-%d"),
    }
]

# ─── Pydantic Schemas ─────────────────────────────────────────────────────────


class UserRegister(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str
    email: EmailStr
    password: str

    @field_validator("name")
    @classmethod
    def validate_name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name must not be empty.")
        return v.strip()

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        return v


class UserLogin(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr


class TokenResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    access_token: str
    token_type: str


class CalculatorInputs(BaseModel):
    model_config = ConfigDict(extra="forbid")
    travel_distance: float
    fuel_type: str
    electricity_usage: float
    diet_preference: str
    waste_generation: float
    daily_footprint: float
    monthly_footprint: float
    yearly_footprint: float

    @field_validator("travel_distance", "electricity_usage", "waste_generation")
    @classmethod
    def validate_non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Input value must be non-negative.")
        return v


class ActivityCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: str
    name: str
    value: float
    impact: float
    date: str

    @field_validator("value")
    @classmethod
    def validate_non_negative_value(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Activity logged value must be non-negative.")
        return v


class GoalCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: str
    title: str
    target_value: float
    current_value: float
    unit: str
    completed: bool
    date_created: Optional[str] = None

    @field_validator("target_value", "current_value")
    @classmethod
    def validate_non_negative_values(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Goal target and current values must be non-negative.")
        return v


class AddPointsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    points_to_add: int


class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")
    sender: str
    text: str


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    message: str
    history: List[ChatMessage] = []


class SimulationScenario(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str
    commute_shift: float
    ac_reduction: float
    vegetarian_meals: float
    current_emissions: float
    future_emissions: float
    savings_percent: float
    annual_impact: float
    date: Optional[str] = None


class RAGRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    query: str


# ─── Auth Helpers ─────────────────────────────────────────────────────────────


def create_access_token(
    data: dict,
    expires_delta: Optional[datetime.timedelta] = None,
) -> str:
    """Encode and sign a JWT access token."""
    to_encode = data.copy()
    expire = datetime.datetime.now(datetime.timezone.utc) + (
        expires_delta or datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode["exp"] = expire
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
) -> dict:
    """
    FastAPI dependency: validates Bearer JWT token from Authorization header.

    Returns:
        Dict with 'email' and 'name' keys.

    Raises:
        HTTPException 401 if token is missing, expired, or invalid.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: Optional[str] = payload.get("sub")
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload.",
            )
        return {"email": email, "name": payload.get("name", "")}
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )


def decode_optional_jwt(credentials: Optional[HTTPAuthorizationCredentials]) -> Optional[str]:
    """
    Attempt to decode an optional JWT credential.

    Returns the email (sub) claim if valid, or None if missing/invalid.
    Does NOT raise — used for endpoints that work both authenticated and unauthenticated.
    """
    if credentials is None:
        return None
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except jwt.PyJWTError:
        return None


def calculate_level(points: int) -> str:
    """Return the level name corresponding to the given points total."""
    if points <= 200:
        return "Seed"
    elif points <= 600:
        return "Sapling"
    elif points <= 1200:
        return "Tree"
    return "Forest Guardian"


# ─── Prediction Model Cache ───────────────────────────────────────────────────
# [PERF] Cache the trained prediction model to avoid re-training on every request.

_prediction_cache: Optional[dict] = None


def _build_prediction_payload() -> dict:
    """
    Train a linear regression model on historical emissions data and
    compute forecast + KPI projections. Cached module-level for efficiency.
    """
    history_days = list(range(1, 16))
    history_emissions = [14.5, 13.8, 15.2, 12.0, 11.2, 10.5, 9.8, 12.2, 10.1, 9.5, 8.8, 9.2, 8.1, 7.9, 7.5]

    X = np.array(history_days).reshape(-1, 1)
    y = np.array(history_emissions)

    model = LinearRegression()
    model.fit(X, y)

    predictions_history = model.predict(X)
    residuals = y - predictions_history
    std_error = float(np.std(residuals))

    forecast_days = list(range(16, 31))
    X_forecast = np.array(forecast_days).reshape(-1, 1)
    predictions_forecast = model.predict(X_forecast)

    history_data = [
        {"day": f"Day {d}", "Emissions": val, "Type": "Historical"}
        for d, val in zip(history_days, history_emissions)
    ]

    forecast_data = [
        {
            "day": f"Day {d}",
            "Emissions": float(round(val, 2)),
            "Upper": float(round(val + 1.96 * std_error, 2)),
            "Lower": float(round(max(val - 1.96 * std_error, 0.0), 2)),
            "Type": "Forecast",
        }
        for d, val in zip(forecast_days, predictions_forecast)
    ]

    kpis = {
        "next_week": float(round(float(model.predict(np.array([[22]]))[0]) * 30, 1)),
        "next_month": float(round(float(model.predict(np.array([[45]]))[0]) * 30, 1)),
        "next_year": float(round((float(model.predict(np.array([[380]]))[0]) * 365) / 1000, 2)),
        "confidence_margin": float(round(1.96 * std_error * 30, 1)),
    }

    return {"history": history_data, "forecast": forecast_data, "kpis": kpis}


# ─── RAG Vector Store ──────────────────────────────────────────────────────────

try:
    from langchain_core.embeddings import Embeddings
    from langchain_community.vectorstores import FAISS
    from langchain_core.documents import Document
    RAG_AVAILABLE = True
except ImportError:
    RAG_AVAILABLE = False

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
    class SimpleLocalEmbeddings(Embeddings):  # type: ignore[misc]
        """Lightweight character-frequency embedding for local RAG without external dependencies."""

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

# ─── Startup Event ────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup_event() -> None:
    """Log startup configuration on application start."""
    db_url = os.getenv("DATABASE_URL")
    logger.info("GreenBit API starting up — version 1.0.0")
    logger.info("Database: %s", "PostgreSQL (connected)" if db_url else "In-memory fallback")
    logger.info("CORS origins: %s", allow_origins)
    logger.info("RAG (FAISS): %s", "available" if RAG_AVAILABLE else "unavailable (langchain not installed)")


# ─── Auth Endpoints ───────────────────────────────────────────────────────────


@app.post("/api/auth/signup", status_code=status.HTTP_201_CREATED)
def signup(user: UserRegister) -> dict:
    """Register a new user account."""
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        existing = query_db("SELECT id FROM users WHERE email = %s", (user.email,), one=True)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email address already exists.",
            )
        hashed_pwd = pwd_context.hash(user.password)
        query_db(
            "INSERT INTO users (name, email, hashed_password) VALUES (%s, %s, %s)",
            (user.name, user.email, hashed_pwd),
        )
        return {"message": "User registered successfully.", "email": user.email}
    else:
        if user.email in users_db:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email address already exists.",
            )
        users_db[user.email] = {
            "name": user.name,
            "email": user.email,
            "hashed_password": pwd_context.hash(user.password),
        }
        return {"message": "User registered successfully.", "email": user.email}


@app.post("/api/auth/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(request: Request, user: UserLogin) -> dict:
    """Authenticate a user and return a JWT access token."""
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        user_record = query_db(
            "SELECT name, email, hashed_password FROM users WHERE email = %s",
            (user.email,),
            one=True,
        )
    else:
        user_record = users_db.get(user.email)

    if not user_record or not pwd_context.verify(user.password, user_record["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )

    token = create_access_token(data={"sub": user.email, "name": user_record["name"]})
    return {"access_token": token, "token_type": "bearer"}


@app.post("/api/auth/forgot-password")
def forgot_password(req: ForgotPasswordRequest) -> dict:
    """
    Initiate a password reset flow.

    Always returns the same response regardless of whether the email exists,
    to prevent user enumeration attacks.
    """
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        user_record = query_db("SELECT email FROM users WHERE email = %s", (req.email,), one=True)
    else:
        user_record = users_db.get(req.email)

    if user_record:
        # In production: trigger email sending via a mail service (SendGrid, SES, etc.)
        logger.info("Password reset requested (email delivery omitted in dev mode).")

    return {"message": "If this email exists in our system, recovery instructions have been sent."}


# ─── Calculator Endpoints ─────────────────────────────────────────────────────


@app.post("/api/calculator/record", status_code=status.HTTP_201_CREATED)
def record_footprint(
    inputs: CalculatorInputs,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Save a carbon footprint calculation for the authenticated user."""
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        uid = get_user_uuid(current_user["email"])
        if not uid:
            raise HTTPException(status_code=404, detail="User account not found in database.")
        res = query_db(
            "INSERT INTO calculator_records "
            "(user_id, travel_distance, fuel_type, electricity_usage, diet_preference, "
            "waste_generation, daily_footprint, monthly_footprint, yearly_footprint) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *",
            (
                uid, inputs.travel_distance, inputs.fuel_type, inputs.electricity_usage,
                inputs.diet_preference, inputs.waste_generation, inputs.daily_footprint,
                inputs.monthly_footprint, inputs.yearly_footprint,
            ),
            one=True,
        )
        if not res:
            raise HTTPException(status_code=500, detail="Failed to save calculation record to database.")
        return {"message": "Calculation recorded successfully in database.", "record": res}
    else:
        record = {
            "id": len(calculator_db) + 1,
            "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            **inputs.model_dump(),
        }
        calculator_db.append(record)
        return {"message": "Calculation recorded successfully in database.", "record": record}


@app.get("/api/calculator/records")
def get_footprint_records(current_user: dict = Depends(get_current_user)) -> List[dict]:
    """Return all carbon footprint calculation records for the authenticated user."""
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        uid = get_user_uuid(current_user["email"])
        if not uid:
            return []
        return query_db(
            "SELECT * FROM calculator_records WHERE user_id = %s ORDER BY timestamp DESC",
            (uid,),
        )
    return calculator_db


# ─── Activities Endpoints ─────────────────────────────────────────────────────


@app.get("/api/activities")
def get_activities(current_user: dict = Depends(get_current_user)) -> List[dict]:
    """Return all logged activities for the authenticated user."""
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        uid = get_user_uuid(current_user["email"])
        if not uid:
            return []
        return query_db(
            "SELECT * FROM activities WHERE user_id = %s ORDER BY date DESC, id DESC",
            (uid,),
        )
    return activities_db


@app.post("/api/activities", status_code=status.HTTP_201_CREATED)
def create_activity(
    activity: ActivityCreate,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Log a new sustainability activity for the authenticated user."""
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        uid = get_user_uuid(current_user["email"])
        if not uid:
            raise HTTPException(status_code=404, detail="User account not found.")
        res = query_db(
            "INSERT INTO activities (user_id, type, name, value, impact, date) "
            "VALUES (%s, %s, %s, %s, %s, %s) RETURNING *",
            (uid, activity.type, activity.name, activity.value, activity.impact, activity.date),
            one=True,
        )
        if not res:
            raise HTTPException(status_code=500, detail="Failed to log activity to database.")
        return {"message": "Activity logged successfully.", "record": res}
    else:
        record = {"id": len(activities_db) + 1, **activity.model_dump()}
        activities_db.append(record)
        return {"message": "Activity logged successfully.", "record": record}


@app.put("/api/activities/{activity_id}")
def update_activity(
    activity_id: int,
    activity: ActivityCreate,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Update an existing activity belonging to the authenticated user."""
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        uid = get_user_uuid(current_user["email"])
        if not uid:
            raise HTTPException(status_code=404, detail="User account not found.")
        res = query_db(
            "UPDATE activities SET type = %s, name = %s, value = %s, impact = %s, date = %s "
            "WHERE id = %s AND user_id = %s RETURNING *",
            (activity.type, activity.name, activity.value, activity.impact, activity.date,
             activity_id, uid),
            one=True,
        )
        if not res:
            raise HTTPException(status_code=404, detail="Activity not found or unauthorized to update.")
        return {"message": "Activity updated successfully.", "record": res}
    else:
        for record in activities_db:
            if record["id"] == activity_id:
                record.update(activity.model_dump())
                return {"message": "Activity updated successfully.", "record": record}
        raise HTTPException(status_code=404, detail="Activity not found.")


@app.delete("/api/activities/{activity_id}")
def delete_activity(
    activity_id: int,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Delete an activity belonging to the authenticated user."""
    global activities_db
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        uid = get_user_uuid(current_user["email"])
        if not uid:
            raise HTTPException(status_code=404, detail="User account not found.")
        res = query_db(
            "DELETE FROM activities WHERE id = %s AND user_id = %s RETURNING id",
            (activity_id, uid),
            one=True,
        )
        if not res:
            raise HTTPException(status_code=404, detail="Activity not found or unauthorized to delete.")
        return {"message": "Activity deleted successfully."}
    else:
        original_length = len(activities_db)
        activities_db = [r for r in activities_db if r["id"] != activity_id]
        if len(activities_db) < original_length:
            return {"message": "Activity deleted successfully."}
        raise HTTPException(status_code=404, detail="Activity not found.")


# ─── Goals Endpoints ──────────────────────────────────────────────────────────


@app.get("/api/goals")
def get_goals(current_user: dict = Depends(get_current_user)) -> List[dict]:
    """Return all sustainability goals for the authenticated user."""
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        uid = get_user_uuid(current_user["email"])
        if not uid:
            return []
        return query_db(
            "SELECT * FROM goals WHERE user_id = %s ORDER BY date_created DESC, id DESC",
            (uid,),
        )
    return goals_db


@app.post("/api/goals", status_code=status.HTTP_201_CREATED)
def create_goal(
    goal: GoalCreate,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Create a new sustainability goal for the authenticated user."""
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        uid = get_user_uuid(current_user["email"])
        if not uid:
            raise HTTPException(status_code=404, detail="User account not found.")
        date_created = goal.date_created or datetime.date.today().strftime("%Y-%m-%d")
        res = query_db(
            "INSERT INTO goals (user_id, type, title, target_value, current_value, unit, completed, date_created) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING *",
            (uid, goal.type, goal.title, goal.target_value, goal.current_value,
             goal.unit, goal.completed, date_created),
            one=True,
        )
        if not res:
            raise HTTPException(status_code=500, detail="Failed to create goal in database.")
        return {"message": "Goal created successfully.", "record": res}
    else:
        record = {
            "id": len(goals_db) + 1,
            "date_created": goal.date_created or datetime.date.today().strftime("%Y-%m-%d"),
            **goal.model_dump(),
        }
        goals_db.append(record)
        return {"message": "Goal created successfully.", "record": record}


@app.put("/api/goals/{goal_id}")
def update_goal(
    goal_id: int,
    goal: GoalCreate,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Update a sustainability goal belonging to the authenticated user."""
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        uid = get_user_uuid(current_user["email"])
        if not uid:
            raise HTTPException(status_code=404, detail="User account not found.")
        res = query_db(
            "UPDATE goals SET type = %s, title = %s, target_value = %s, current_value = %s, "
            "unit = %s, completed = %s WHERE id = %s AND user_id = %s RETURNING *",
            (goal.type, goal.title, goal.target_value, goal.current_value,
             goal.unit, goal.completed, goal_id, uid),
            one=True,
        )
        if not res:
            raise HTTPException(status_code=404, detail="Goal not found or unauthorized to update.")
        return {"message": "Goal updated successfully.", "record": res}
    else:
        for record in goals_db:
            if record["id"] == goal_id:
                record.update(goal.model_dump())
                record["id"] = goal_id
                return {"message": "Goal updated successfully.", "record": record}
        raise HTTPException(status_code=404, detail="Goal not found.")


@app.delete("/api/goals/{goal_id}")
def delete_goal(
    goal_id: int,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Delete a sustainability goal belonging to the authenticated user."""
    global goals_db
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        uid = get_user_uuid(current_user["email"])
        if not uid:
            raise HTTPException(status_code=404, detail="User account not found.")
        res = query_db(
            "DELETE FROM goals WHERE id = %s AND user_id = %s RETURNING id",
            (goal_id, uid),
            one=True,
        )
        if not res:
            raise HTTPException(status_code=404, detail="Goal not found or unauthorized to delete.")
        return {"message": "Goal deleted successfully."}
    else:
        original_length = len(goals_db)
        goals_db = [r for r in goals_db if r["id"] != goal_id]
        if len(goals_db) < original_length:
            return {"message": "Goal deleted successfully."}
        raise HTTPException(status_code=404, detail="Goal not found.")


# ─── Gamification Endpoints ───────────────────────────────────────────────────


@app.get("/api/gamification/profile")
def get_gamification_profile(current_user: dict = Depends(get_current_user)) -> dict:
    """Return the current user's gamification profile (points, level, badges)."""
    return rewards_db


@app.post("/api/gamification/points/add")
def add_eco_points(
    req: AddPointsRequest,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Add eco-points to the current user's gamification profile and re-rank the leaderboard."""
    global rewards_db, leaderboard_db
    rewards_db["points"] += req.points_to_add
    new_level = calculate_level(rewards_db["points"])
    rewards_db["level"] = new_level

    for entry in leaderboard_db:
        if entry["is_current_user"]:
            entry["points"] = rewards_db["points"]
            entry["level"] = new_level
            entry["carbon_saved"] += float(req.points_to_add) * 0.3

    leaderboard_db.sort(key=lambda x: x["points"], reverse=True)
    for idx, entry in enumerate(leaderboard_db):
        entry["rank"] = idx + 1

    return {"message": "Points added successfully.", "profile": rewards_db}


@app.get("/api/gamification/leaderboard")
def get_leaderboard(current_user: dict = Depends(get_current_user)) -> List[dict]:
    """Return the global leaderboard."""
    return leaderboard_db


# ─── AI Coach Endpoint ────────────────────────────────────────────────────────


@app.post("/api/coach/chat")
@limiter.limit("10/minute")
async def chat_with_coach(request: Request, req: ChatRequest) -> dict:
    """
    AI Sustainability Coach chat endpoint.

    Tries Gemini → OpenAI → rule-based fallback in that order.
    User context (latest calc, goals, activities) is injected into the prompt.
    """
    user_query = req.message.lower()

    # Resolve user context from DB or in-memory fallback
    latest_calc: Optional[dict] = None
    active_goals: List[dict] = []
    recent_acts: List[dict] = []

    db_url = os.getenv("DATABASE_URL")
    auth_header = request.headers.get("Authorization", "")
    email: Optional[str] = decode_optional_jwt(
        HTTPAuthorizationCredentials(scheme="Bearer", credentials=auth_header.split(" ", 1)[-1])
        if auth_header.startswith("Bearer ")
        else None
    )

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
        "Keep it concise, professional, and positive.\n\n"
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

    elif api_key_openai:
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

    # Rule-based local fallback
    if "reduce" in user_query or "footprint" in user_query or "habit" in user_query:
        advices = []
        if latest_calc:
            if latest_calc.get("travel_distance", 0) > 100:
                advices.append("* **Transportation**: Your travel baseline is high. Consider carpooling or switching to public transit to save approximately **150 kg CO₂e** monthly.")
            if latest_calc.get("electricity_usage", 0) > 150:
                advices.append("* **Electricity**: Unplug appliances in standby modes or switch to LED bulbs to offset **40 kg CO₂e** weekly.")
            if latest_calc.get("diet_preference") == "meat":
                advices.append("* **Diet**: Swapping just 3 beef/pork meals for vegetarian alternatives weekly offsets up to **50 kg CO₂e**.")
        if not advices:
            advices = [
                "* **Commutes**: Switch drive times to train/bus rides or bicycling.",
                "* **Power**: Switch off unused appliances and unplug chargers.",
                "* **Meals**: Try to incorporate vegetarian lunch breaks twice a week.",
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


# ─── Simulator Endpoints ──────────────────────────────────────────────────────


@app.get("/api/simulator/history")
def get_simulation_history(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
) -> List[dict]:
    """Return saved simulation scenarios. Uses optional auth to support unauthenticated preview."""
    db_url = os.getenv("DATABASE_URL")
    email = decode_optional_jwt(credentials)
    if db_url and email:
        uid = get_user_uuid(email)
        if uid:
            return query_db(
                "SELECT * FROM simulations WHERE user_id = %s ORDER BY date DESC, id DESC",
                (uid,),
            )
    return simulator_db


@app.post("/api/simulator/run", status_code=status.HTTP_201_CREATED)
def record_simulation(
    scenario: SimulationScenario,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
) -> dict:
    """Save a carbon twin simulation scenario."""
    global simulator_db
    db_url = os.getenv("DATABASE_URL")
    email = decode_optional_jwt(credentials)
    if db_url and email:
        uid = get_user_uuid(email)
        if uid:
            res = query_db(
                "INSERT INTO simulations (user_id, name, commute_shift, ac_reduction, vegetarian_meals, "
                "current_emissions, future_emissions, savings_percent, annual_impact, date) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *",
                (
                    uid, scenario.name, scenario.commute_shift, scenario.ac_reduction,
                    scenario.vegetarian_meals, scenario.current_emissions, scenario.future_emissions,
                    scenario.savings_percent, scenario.annual_impact,
                    scenario.date or datetime.date.today().strftime("%Y-%m-%d"),
                ),
                one=True,
            )
            if res:
                return {"message": "Simulation saved successfully.", "record": res}

    record = {
        "id": len(simulator_db) + 1,
        "date": scenario.date or datetime.date.today().strftime("%Y-%m-%d"),
        **scenario.model_dump(),
    }
    simulator_db.append(record)
    return {"message": "Simulation saved successfully.", "record": record}


@app.delete("/api/simulator/history/{sim_id}")
def delete_simulation(
    sim_id: int,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
) -> dict:
    """Delete a simulation scenario by ID."""
    global simulator_db
    db_url = os.getenv("DATABASE_URL")
    email = decode_optional_jwt(credentials)
    if db_url and email:
        uid = get_user_uuid(email)
        if uid:
            res = query_db(
                "DELETE FROM simulations WHERE id = %s AND user_id = %s RETURNING id",
                (sim_id, uid),
                one=True,
            )
            if res:
                return {"message": "Simulation deleted successfully."}
        raise HTTPException(status_code=404, detail="Simulation not found or unauthorized.")
    else:
        original_length = len(simulator_db)
        simulator_db = [r for r in simulator_db if r["id"] != sim_id]
        if len(simulator_db) < original_length:
            return {"message": "Simulation deleted successfully."}
        raise HTTPException(status_code=404, detail="Simulation not found.")


# ─── Predictions Endpoint ─────────────────────────────────────────────────────


@app.get("/api/predictions")
def get_predictions() -> dict:
    """
    Return carbon footprint predictions using a cached Linear Regression model.

    The model is trained once on startup and cached module-level to avoid
    re-training on every request.
    """
    global _prediction_cache
    if _prediction_cache is None:
        _prediction_cache = _build_prediction_payload()
    return _prediction_cache


# ─── RAG Assistant Endpoint ───────────────────────────────────────────────────

_LOCAL_DOCS = [
    {
        "title": d["metadata"]["title"],
        "source": d["metadata"]["source"],
        "content": d["page_content"],
    }
    for d in _KNOWLEDGE_DOCS_CONTENT
]


@app.post("/api/rag/ask")
@limiter.limit("10/minute")
async def ask_rag_assistant(request: Request, req: RAGRequest) -> dict:
    """
    RAG (Retrieval-Augmented Generation) climate library assistant.

    Retrieves relevant knowledge chunks via FAISS similarity search (or keyword fallback),
    then generates a response via Gemini → OpenAI → local synthesis.
    """
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

    elif api_key_openai:
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

    # Local synthesis fallback
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


# ─── Health Check ─────────────────────────────────────────────────────────────


@app.get("/api/health")
def health() -> dict:
    """
    Health check endpoint for load balancers and monitoring tools.

    Returns database connectivity status alongside service info.
    """
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
