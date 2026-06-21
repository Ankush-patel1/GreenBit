import os
import datetime
import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPAuthorizationCredentials
from schemas.models import SimulationScenario
from core.database import query_db, get_user_uuid, simulator_db
from core.security import security_bearer, decode_optional_jwt

router = APIRouter(prefix="/api/simulator", tags=["simulator"])
logger = logging.getLogger("greenbit")

@router.get("/history")
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

@router.post("/run", status_code=status.HTTP_201_CREATED)
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

@router.delete("/history/{sim_id}")
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
