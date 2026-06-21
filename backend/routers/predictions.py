import logging
from typing import Optional
from fastapi import APIRouter
import numpy as np
from sklearn.linear_model import LinearRegression

router = APIRouter(prefix="/api/predictions", tags=["predictions"])
logger = logging.getLogger("greenbit")

_prediction_cache: Optional[dict] = None

def _build_prediction_payload() -> dict:
    """
    Train a linear regression model on historical emissions data and
    compute forecast + KPI projections. Cached module-level for efficiency.
    """
    history_days = list(range(1, 16))
    history_emissions = [14.5, 13.8, 15.2, 12.0, 11.2, 10.5, 9.8, 12.2, 10.1, 9.5, 8.8, 9.2, 8.1, 7.9, 7.5]

    X = np.array(history_days).reshape(-1, 1)
    y = np.array(history_emissions)

    model = LinearRegression()
    model.fit(X, y)

    predictions_history = model.predict(X)
    residuals = y - predictions_history
    std_error = float(np.std(residuals))

    forecast_days = list(range(16, 31))
    X_forecast = np.array(forecast_days).reshape(-1, 1)
    predictions_forecast = model.predict(X_forecast)

    history_data = [
        {"day": f"Day {d}", "Emissions": val, "Type": "Historical"}
        for d, val in zip(history_days, history_emissions)
    ]

    forecast_data = [
        {
            "day": f"Day {d}",
            "Emissions": float(round(val, 2)),
            "Upper": float(round(val + 1.96 * std_error, 2)),
            "Lower": float(round(max(val - 1.96 * std_error, 0.0), 2)),
            "Type": "Forecast",
        }
        for d, val in zip(forecast_days, predictions_forecast)
    ]

    kpis = {
        "next_week": float(round(float(model.predict(np.array([[22]]))[0]) * 30, 1)),
        "next_month": float(round(float(model.predict(np.array([[45]]))[0]) * 30, 1)),
        "next_year": float(round((float(model.predict(np.array([[380]]))[0]) * 365) / 1000, 2)),
        "confidence_margin": float(round(1.96 * std_error * 30, 1)),
    }

    return {"history": history_data, "forecast": forecast_data, "kpis": kpis}

@router.get("/")
def get_predictions() -> dict:
    """
    Return carbon footprint predictions using a cached Linear Regression model.
    The model is trained once on startup and cached module-level to avoid
    re-training on every request.
    """
    global _prediction_cache
    if _prediction_cache is None:
        _prediction_cache = _build_prediction_payload()
    return _prediction_cache
