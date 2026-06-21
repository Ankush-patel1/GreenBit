import os
import logging
from fastapi import APIRouter, HTTPException, status, Request, Depends
from schemas.models import UserRegister, UserLogin, ForgotPasswordRequest, TokenResponse
from core.database import query_db, get_user_uuid, users_db
from core.security import pwd_context, create_access_token
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter(prefix="/api/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)
logger = logging.getLogger("greenbit")

@router.post("/signup", status_code=status.HTTP_201_CREATED)
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

@router.post("/login", response_model=TokenResponse)
@limiter.limit("50/minute")
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

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest) -> dict:
    """Initiate a password reset flow."""
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        user_record = query_db("SELECT email FROM users WHERE email = %s", (req.email,), one=True)
    else:
        user_record = users_db.get(req.email)

    if user_record:
        logger.info("Password reset requested (email delivery omitted in dev mode).")

    return {"message": "If this email exists in our system, recovery instructions have been sent."}
