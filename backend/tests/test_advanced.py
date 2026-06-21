import pytest
from fastapi.testclient import TestClient
from main import app
from core.database import users_db, rewards_db, leaderboard_db, activities_db, goals_db, simulator_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_user():
    users_db.clear()
    activities_db.clear()
    goals_db.clear()
    simulator_db.clear()
    rewards_db["points"] = 0
    
    # Create user
    client.post("/api/auth/signup", json={"email": "adv@test.com", "password": "password123", "name": "Adv"})
    res = client.post("/api/auth/login", json={"email": "adv@test.com", "password": "password123"})
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_gamification(setup_user):
    headers = setup_user
    
    # Get initial points
    res = client.get("/api/gamification/profile", headers=headers)
    assert res.status_code == 200
    assert res.json()["points"] == 0

    # Add points
    res = client.post("/api/gamification/points/add", json={"points_to_add": 50}, headers=headers)
    assert res.status_code == 200
    assert res.json()["profile"]["points"] == 50

    # Get points again
    res = client.get("/api/gamification/profile", headers=headers)
    assert res.json()["points"] == 50

def test_coach(setup_user):
    headers = setup_user
    # Get coach advice
    res = client.post("/api/coach/chat", json={"message": "How to reduce my footprint?"}, headers=headers)
    assert res.status_code == 200
    assert "response" in res.json()
    assert "Estimated CO₂ reduction" in res.json()["response"]

def test_simulator(setup_user):
    headers = setup_user
    # Get simulation list
    res = client.get("/api/simulator/history", headers=headers)
    assert res.status_code == 200

    # Post new scenario
    payload = {
        "name": "Test Scenario",
        "commute_shift": 10.0,
        "ac_reduction": 5.0,
        "vegetarian_meals": 3.0,
        "current_emissions": 500.0,
        "future_emissions": 450.0,
        "savings_percent": 10.0,
        "annual_impact": 600.0,
        "date": "2026-06-21"
    }
    res = client.post("/api/simulator/run", json=payload, headers=headers)
    assert res.status_code == 201
    
    # Get list
    res = client.get("/api/simulator/history", headers=headers)
    assert len(res.json()) == 1

def test_predictions(setup_user):
    headers = setup_user
    res = client.get("/api/predictions/", headers=headers)
    assert res.status_code == 200
    assert "forecast" in res.json()

def test_rag(setup_user):
    headers = setup_user
    res = client.post("/api/rag/ask", json={"query": "How to reduce carbon footprint?"}, headers=headers)
    assert res.status_code == 200
    assert "response" in res.json()
