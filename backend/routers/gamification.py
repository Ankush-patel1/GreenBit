import os
import logging
from typing import List
from fastapi import APIRouter, Depends
from schemas.models import AddPointsRequest
from core.database import rewards_db, leaderboard_db
from core.security import get_current_user

router = APIRouter(prefix="/api/gamification", tags=["gamification"])
logger = logging.getLogger("greenbit")

def calculate_level(points: int) -> str:
    """Return the level name corresponding to the given points total."""
    if points <= 200:
        return "Seed"
    elif points <= 600:
        return "Sapling"
    elif points <= 1200:
        return "Tree"
    return "Forest Guardian"

@router.get("/profile")
def get_gamification_profile(current_user: dict = Depends(get_current_user)) -> dict:
    """Return the current user's gamification profile (points, level, badges)."""
    return rewards_db

@router.post("/points/add")
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

@router.get("/leaderboard")
def get_leaderboard(current_user: dict = Depends(get_current_user)) -> List[dict]:
    """Return the global leaderboard."""
    return leaderboard_db
