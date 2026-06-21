import os
import datetime
import logging
from typing import List
from fastapi import APIRouter, HTTPException, status, Depends
from schemas.models import GoalCreate
from core.database import query_db, get_user_uuid, goals_db
from core.security import get_current_user

router = APIRouter(prefix="/api/goals", tags=["goals"])
logger = logging.getLogger("greenbit")

@router.get("/")
def get_goals(current_user: dict = Depends(get_current_user)) -> List[dict]:
    """Return all sustainability goals for the authenticated user."""
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        try:
            uid = get_user_uuid(current_user["email"])
            if not uid:
                return list(goals_db)
            return query_db(
                "SELECT * FROM goals WHERE user_id = %s ORDER BY date_created DESC, id DESC",
                (uid,),
            )
        except HTTPException as exc:
            if exc.status_code < 500:
                raise
            logger.warning("DB unavailable for get_goals, using in-memory: %s", exc.detail)
    return list(goals_db)

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_goal(
    goal: GoalCreate,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Create a new sustainability goal for the authenticated user."""
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        try:
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
        except HTTPException as exc:
            if exc.status_code < 500:
                raise
            logger.warning("DB unavailable for create_goal, using in-memory: %s", exc.detail)
    global goals_db
    record = {
        "id": len(goals_db) + 1,
        "date_created": goal.date_created or datetime.date.today().strftime("%Y-%m-%d"),
        **goal.model_dump(),
    }
    goals_db.append(record)
    return {"message": "Goal created successfully.", "record": record}

@router.put("/{goal_id}")
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

@router.delete("/{goal_id}")
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
