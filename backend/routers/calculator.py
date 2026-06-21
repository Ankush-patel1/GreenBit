import os
import datetime
import logging
from typing import List
from fastapi import APIRouter, HTTPException, status, Depends
from schemas.models import CalculatorInputs
from core.database import query_db, get_user_uuid, calculator_db
from core.security import get_current_user

router = APIRouter(prefix="/api/calculator", tags=["calculator"])
logger = logging.getLogger("greenbit")

@router.post("/record", status_code=status.HTTP_201_CREATED)
def record_footprint(
    inputs: CalculatorInputs,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Save a carbon footprint calculation for the authenticated user."""
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        try:
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
        except HTTPException as exc:
            if exc.status_code < 500:
                raise
            logger.warning("DB unavailable for record_footprint, using in-memory: %s", exc.detail)
    record = {
        "id": len(calculator_db) + 1,
        "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        **inputs.model_dump(),
    }
    calculator_db.append(record)
    return {"message": "Calculation recorded successfully in database.", "record": record}

@router.get("/records")
def get_footprint_records(current_user: dict = Depends(get_current_user)) -> List[dict]:
    """Return all carbon footprint calculation records for the authenticated user."""
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        try:
            uid = get_user_uuid(current_user["email"])
            if not uid:
                return list(calculator_db)
            return query_db(
                "SELECT * FROM calculator_records WHERE user_id = %s ORDER BY timestamp DESC",
                (uid,),
            )
        except HTTPException as exc:
            if exc.status_code < 500:
                raise
            logger.warning("DB unavailable for get_footprint_records, using in-memory: %s", exc.detail)
    return list(calculator_db)
