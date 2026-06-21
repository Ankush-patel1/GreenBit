import os
import logging
from typing import List
from fastapi import APIRouter, HTTPException, status, Depends
from schemas.models import ActivityCreate
from core.database import query_db, get_user_uuid, activities_db
from core.security import get_current_user

router = APIRouter(prefix="/api/activities", tags=["activities"])
logger = logging.getLogger("greenbit")

@router.get("/")
def get_activities(current_user: dict = Depends(get_current_user)) -> List[dict]:
    """Return all logged activities for the authenticated user."""
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        try:
            uid = get_user_uuid(current_user["email"])
            if not uid:
                return list(activities_db)
            return query_db(
                "SELECT * FROM activities WHERE user_id = %s ORDER BY date DESC, id DESC",
                (uid,),
            )
        except HTTPException as exc:
            if exc.status_code < 500:
                raise
            logger.warning("DB unavailable for get_activities, using in-memory: %s", exc.detail)
    return list(activities_db)

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_activity(
    activity: ActivityCreate,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Log a new sustainability activity for the authenticated user."""
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        try:
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
        except HTTPException as exc:
            if exc.status_code < 500:
                raise
            logger.warning("DB unavailable for create_activity, using in-memory: %s", exc.detail)
    global activities_db
    record = {"id": len(activities_db) + 1, **activity.model_dump()}
    activities_db.append(record)
    return {"message": "Activity logged successfully.", "record": record}

@router.put("/{activity_id}")
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

@router.delete("/{activity_id}")
def delete_activity(
    activity_id: int,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Delete an activity belonging to the authenticated user."""
    global activities_db
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        try:
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
        except HTTPException as exc:
            if exc.status_code < 500:
                raise
            logger.warning("DB unavailable for delete_activity, using in-memory: %s", exc.detail)
    original_length = len(activities_db)
    activities_db = [r for r in activities_db if r["id"] != activity_id]
    if len(activities_db) < original_length:
        return {"message": "Activity deleted successfully."}
    raise HTTPException(status_code=404, detail="Activity not found.")
