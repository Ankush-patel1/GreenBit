import os
import sys
import logging
from typing import List

_log_level_str = os.getenv("LOG_LEVEL", "INFO").upper()
_log_level = getattr(logging, _log_level_str, logging.INFO)

logging.basicConfig(
    level=_log_level,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("greenbit")

_raw_secret = os.getenv("SECRET_KEY")
if not _raw_secret:
    _raw_secret = os.getenv("TEST_SECRET_KEY", "test-secret-for-pytest-only")
    if "pytest" not in sys.modules:
        raise RuntimeError(
            "SECRET_KEY environment variable is not set. "
            "Set it to a strong random value before starting GreenBit."
        )
SECRET_KEY: str = _raw_secret
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

_cors_origins_str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")
allow_origins: List[str] = [o.strip() for o in _cors_origins_str.split(",") if o.strip()]

if "*" in allow_origins:
    logger.warning(
        "CORS_ORIGINS is set to '*' (wildcard). "
        "This is insecure for production. Set explicit allowed origins."
    )
