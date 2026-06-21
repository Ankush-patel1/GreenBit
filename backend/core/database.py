import os
import datetime
import decimal
from typing import Dict, Any, Generator, List, Optional
from contextlib import contextmanager

import psycopg2
import psycopg2.extras
from fastapi import HTTPException
from core.config import logger
from core.security import pwd_context

def _serialize_row(row: Dict[str, Any]) -> Dict[str, Any]:
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
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise HTTPException(status_code=500, detail="DATABASE_URL is not configured.")
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
    if not os.getenv("DATABASE_URL"):
        return None
    user = query_db("SELECT id FROM users WHERE email = %s", (email,), one=True)
    return str(user["id"]) if user else None

# In-Memory Fallback Stores
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
