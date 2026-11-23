from __future__ import annotations

import os
import hmac
from datetime import date, datetime, timezone
import httpx
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


def _provider_status():
    return {
        "provider": "API-Football (API-Sports)",
        "configured": bool(os.getenv("API_FOOTBALL_KEY")),
        "supabase_configured": bool(os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_SERVICE_ROLE_KEY")),
        "ingestion_protected": bool(os.getenv("INGEST_API_TOKEN")),
        "live_data_enabled": False,
        "note": "Provider credentials and a secured deployment are required before sync is available.",
    }


@app.get("/v1/providers/api-football/status")
def api_football_status():
    return _provider_status()


@app.post("/v1/providers/api-football/sync-fixtures")
async def sync_api_football_fixtures(
    sync_date: date,
    x_ingest_token: str = "",
):
    expected_token = os.getenv("INGEST_API_TOKEN", "")
    api_key = os.getenv("API_FOOTBALL_KEY", "")
    supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    if not expected_token or not hmac.compare_digest(x_ingest_token, expected_token):
        raise HTTPException(status_code=401, detail="Invalid ingestion token")
    if not api_key:
        raise HTTPException(status_code=503, detail="API_FOOTBALL_KEY is not configured")
    if not supabase_url or not service_key:
        raise HTTPException(status_code=503, detail="Server-side Supabase credentials are not configured")

    headers = {"x-apisports-key": api_key}
    async with httpx.AsyncClient(timeout=25) as client:
        upstream = await client.get(
            "https://v3.football.api-sports.io/fixtures",
            params={"date": sync_date.isoformat()},
            headers=headers,
        )
        if upstream.status_code != 200:
            raise HTTPException(status_code=502, detail="Sports provider request failed")
        payload = upstream.json()
        if payload.get("errors"):
            raise HTTPException(status_code=502, detail="Sports provider returned an error")
        fixtures = payload.get("response", [])
        rows = []
        for item in fixtures:
            fixture = item.get("fixture") or {}
            teams = item.get("teams") or {}
            home = teams.get("home") or {}
            away = teams.get("away") or {}
            league = item.get("league") or {}
            fixture_id = fixture.get("id")
            starts_at = fixture.get("date")
            home_name = home.get("name")
            away_name = away.get("name")
            if not all((fixture_id, starts_at, home_name, away_name)):
                continue
            short_status = ((fixture.get("status") or {}).get("short") or "NS").upper()
            status_map = {
                "NS": "scheduled", "TBD": "scheduled",
                "1H": "live", "2H": "live", "HT": "live", "ET": "live",
                "BT": "live", "P": "live", "LIVE": "live",
                "FT": "finished", "AET": "finished", "PEN": "finished",
                "PST": "postponed", "CANC": "cancelled", "ABD": "cancelled",
            }
            rows.append({
                "provider_key": str(fixture_id),
                "sport_id": "football",
                "home_name": home_name,
                "away_name": away_name,
                "starts_at": starts_at,
                "status": status_map.get(short_status, "scheduled"),
                "source_name": "api-football",
                "source_updated_at": datetime.now(timezone.utc).isoformat(),
            })

        if rows:
            saved = await client.post(
                f"{supabase_url}/rest/v1/events",
                params={"on_conflict": "source_name,provider_key"},
                headers={
                    "apikey": service_key,
                    "Authorization": f"Bearer {service_key}",
                    "Content-Type": "application/json",
                    "Prefer": "resolution=merge-duplicates,return=minimal",
                },
                json=rows,
            )
            if saved.status_code not in (200, 201, 204):
                raise HTTPException(status_code=502, detail="Could not persist fixtures to Supabase")

        await client.patch(
            f"{supabase_url}/rest/v1/data_sources",
            params={"source_key": "eq.licensed-odds"},
            headers={
                "apikey": service_key,
                "Authorization": f"Bearer {service_key}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal",
            },
            json={
                "display_name": "API-Football fixtures",
                "status": "operational",
                "last_sync_at": datetime.now(timezone.utc).isoformat(),
                "last_error": None,
                "metadata": {"provider": "API-Football", "last_fixture_sync_date": sync_date.isoformat(), "fixtures_received": len(rows)},
            },
        )

    return {
        "provider": "API-Football",
        "date": sync_date.isoformat(),
        "fixtures_received": len(rows),
        "persisted_to_supabase": True,
        "note": "Fixture sync only. Odds endpoints and model predictions are not populated by this operation.",
    }
