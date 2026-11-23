from __future__ import annotations

import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .models import expected_value, football_poisson, implied_probability

app = FastAPI(
    title="Odds Intelligence Analytics API",
    version="0.1.0",
    description="Research and statistical analysis only. No wagering or transaction endpoints.",
)

origins = [value.strip() for value in os.getenv("CORS_ORIGINS", "").split(",") if value.strip()]
if origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "Authorization"],
    )


class FootballRequest(BaseModel):
    home_xg: float = Field(ge=0, le=8)
    away_xg: float = Field(ge=0, le=8)
    max_goals: int = Field(default=10, ge=3, le=15)


class EvaluationRequest(BaseModel):
    model_probability: float = Field(ge=0, le=1)
    decimal_odds: float = Field(gt=1, le=1000)
    sample_size: int = Field(default=0, ge=0)
    minimum_sample_size: int = Field(default=200, ge=1)


@app.get("/health")
def health():
    return {"status": "ok", "service": "analytics-api", "mode": "analysis_only"}


@app.post("/v1/models/football/poisson")
def football_model(payload: FootballRequest):
    result = football_poisson(payload.home_xg, payload.away_xg, payload.max_goals)
    return {
        "model": "independent_poisson",
        "version": "1.0.0",
        "probabilities": {
            "home_win": result.home_win,
            "draw": result.draw,
            "away_win": result.away_win,
            "over_2_5": result.over_2_5,
            "both_teams_score": result.both_teams_score,
        },
        "score_matrix": result.score_matrix,
        "limitations": [
            "Independent Poisson baseline; no Dixon-Coles low-score correction.",
            "Expected-goals inputs must come from validated, timestamped data.",
            "Not a guarantee or wagering instruction.",
        ],
    }


@app.post("/v1/evaluate")
def evaluate(payload: EvaluationRequest):
    try:
        implied = implied_probability(payload.decimal_odds)
        ev = expected_value(payload.model_probability, payload.decimal_odds)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return {
        "model_probability": payload.model_probability,
        "implied_probability": implied,
        "probability_edge": payload.model_probability - implied,
        "expected_value_estimate": ev,
        "sample_size": payload.sample_size,
        "minimum_sample_size": payload.minimum_sample_size,
        "quality": "insufficient_sample" if payload.sample_size < payload.minimum_sample_size else "sample_threshold_met",
        "execution": "disabled",
        "disclaimer": "Estimate only; requires calibration, independent validation, and source-quality checks.",
    }
