from pydantic import BaseModel, EmailStr, field_validator, ConfigDict
from typing import Optional, List

class UserRegister(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str
    email: EmailStr
    password: str

    @field_validator("name")
    @classmethod
    def validate_name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name must not be empty.")
        if len(v) > 120:
            raise ValueError("Name must not exceed 120 characters.")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        if len(v) > 128:
            raise ValueError("Password must not exceed 128 characters.")
        return v


class UserLogin(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr


class TokenResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    access_token: str
    token_type: str


class CalculatorInputs(BaseModel):
    model_config = ConfigDict(extra="forbid")
    travel_distance: float
    fuel_type: str
    electricity_usage: float
    diet_preference: str
    waste_generation: float
    daily_footprint: float
    monthly_footprint: float
    yearly_footprint: float

    @field_validator("travel_distance", "electricity_usage", "waste_generation")
    @classmethod
    def validate_non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Input value must be non-negative.")
        return v


class ActivityCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: str
    name: str
    value: float
    impact: float
    date: str

    @field_validator("value")
    @classmethod
    def validate_non_negative_value(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Activity logged value must be non-negative.")
        return v


class GoalCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: str
    title: str
    target_value: float
    current_value: float
    unit: str
    completed: bool
    date_created: Optional[str] = None

    @field_validator("target_value", "current_value")
    @classmethod
    def validate_non_negative_values(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Goal target and current values must be non-negative.")
        return v


class AddPointsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    points_to_add: int


class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")
    sender: str
    text: str


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    message: str
    history: List[ChatMessage] = []

    @field_validator("message")
    @classmethod
    def validate_message_length(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Message must not be empty.")
        if len(v) > 2000:
            raise ValueError("Message must not exceed 2000 characters.")
        return v


class SimulationScenario(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str
    commute_shift: float
    ac_reduction: float
    vegetarian_meals: float
    current_emissions: float
    future_emissions: float
    savings_percent: float
    annual_impact: float
    date: Optional[str] = None


class RAGRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    query: str

    @field_validator("query")
    @classmethod
    def validate_query_length(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Query must not be empty.")
        if len(v) > 1000:
            raise ValueError("Query must not exceed 1000 characters.")
        return v
