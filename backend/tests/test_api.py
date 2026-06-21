import pytest
from fastapi.testclient import TestClient
from main import app
from core.database import users_db, calculator_db, goals_db, activities_db
import uuid

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_db():
    users_db.clear()
    calculator_db.clear()
    goals_db.clear()
    activities_db.clear()
    yield

@pytest.fixture(scope="module")
def user_token():
    client.post("/api/auth/signup", json={"email": "global@test.com", "password": "password123", "name": "Global"})
    res = client.post("/api/auth/login", json={"email": "global@test.com", "password": "password123"})
    return res.json()["access_token"]

def test_signup_and_login():
    # Test Signup
    res = client.post("/api/auth/signup", json={"email": "test@test.com", "password": "password123", "name": "Tester"})
    assert res.status_code == 201

    # Test Login
    res = client.post("/api/auth/login", json={"email": "test@test.com", "password": "password123"})
    assert res.status_code == 200
    assert "access_token" in res.json()

    # Test Invalid Login
    res = client.post("/api/auth/login", json={"email": "test@test.com", "password": "wrong"})
    assert res.status_code == 401

def test_calculator_profile(user_token):
    headers = {"Authorization": f"Bearer {user_token}"}

    # Save Profile
    payload = {
        "travel_distance": 100.0,
        "fuel_type": "gasoline",
        "electricity_usage": 200.0,
        "diet_preference": "meat",
        "waste_generation": 15.0,
        "daily_footprint": 10.0,
        "monthly_footprint": 300.0,
        "yearly_footprint": 3650.0
    }
    res = client.post("/api/calculator/record", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert "record" in data

    # Get Profile
    res = client.get("/api/calculator/records", headers=headers)
    assert res.status_code == 200
    assert res.json()[0]["travel_distance"] == 100.0

def test_activities(user_token):
    headers = {"Authorization": f"Bearer {user_token}"}

    # Log Activity
    payload = {"type": "transport", "name": "Biked to work", "value": 10.0, "impact": -5.0, "date": "2026-06-21"}
    res = client.post("/api/activities", json=payload, headers=headers)
    assert res.status_code == 201
    act_id = res.json()["record"]["id"]

    # Get Activities
    res = client.get("/api/activities", headers=headers)
    assert res.status_code == 200
    assert len(res.json()) == 1

    # Update Activity
    res = client.put(f"/api/activities/{act_id}", json={"type": "transport", "name": "Biked long", "value": 15.0, "impact": -6.0, "date": "2026-06-21"}, headers=headers)
    assert res.status_code == 200

    # Delete Activity
    res = client.delete(f"/api/activities/{act_id}", headers=headers)
    assert res.status_code == 200

    # Get Activities again
    res = client.get("/api/activities", headers=headers)
    assert len(res.json()) == 0

def test_goals(user_token):
    headers = {"Authorization": f"Bearer {user_token}"}

    # Add Goal
    payload = {
        "title": "Use public transit",
        "type": "transport",
        "target_value": 10.0,
        "current_value": 0.0,
        "unit": "trips",
        "completed": False,
        "date_created": "2026-06-21"
    }
    res = client.post("/api/goals", json=payload, headers=headers)
    assert res.status_code == 201
    goal_id = res.json()["record"]["id"]

    # Update Goal Progress
    # Wait, the endpoint is PUT /api/goals/{goal_id}
    # Let's fix this test while we are at it.
    payload["current_value"] = 2.0
    res = client.put(f"/api/goals/{goal_id}", json=payload, headers=headers)
    assert res.status_code == 200
    assert res.json()["record"]["current_value"] == 2.0

    # Get Goals
    res = client.get("/api/goals", headers=headers)
    assert res.status_code == 200
    assert len(res.json()) == 1

    # Delete Goal
    res = client.delete(f"/api/goals/{goal_id}", headers=headers)
    assert res.status_code == 200
