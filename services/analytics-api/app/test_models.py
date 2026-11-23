import pytest
from fastapi.testclient import TestClient

from .main import app
from .models import expected_value, football_poisson, implied_probability

client = TestClient(app)


def test_implied_probability():
    assert implied_probability(2.0) == pytest.approx(0.5)


def test_invalid_odds_rejected():
    with pytest.raises(ValueError):
        implied_probability(1.0)


def test_expected_value():
    assert expected_value(0.5, 2.2) == pytest.approx(0.1)


def test_poisson_probabilities_sum_to_one():
    result = football_poisson(1.4, 0.9)
    assert result.home_win + result.draw + result.away_win == pytest.approx(1.0)
    assert 0 <= result.over_2_5 <= 1
    assert 0 <= result.both_teams_score <= 1


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["mode"] == "analysis_only"


def test_evaluation_flags_small_sample():
    response = client.post("/v1/evaluate", json={
        "model_probability": 0.55, "decimal_odds": 2.0,
        "sample_size": 40, "minimum_sample_size": 200
    })
    assert response.status_code == 200
    assert response.json()["quality"] == "insufficient_sample"
    assert response.json()["execution"] == "disabled"


def test_poisson_endpoint():
    response = client.post("/v1/models/football/poisson", json={"home_xg": 1.5, "away_xg": 1.0})
    assert response.status_code == 200
    assert response.json()["model"] == "independent_poisson"


def test_provider_status_never_exposes_credentials():
    response = client.get("/v1/providers/api-football/status")
    assert response.status_code == 200
    body = response.json()
    assert "configured" in body
    assert "api_key" not in body
    assert "SUPABASE_SERVICE_ROLE_KEY" not in str(body)


def test_fixture_sync_requires_ingestion_token():
    response = client.post("/v1/providers/api-football/sync-fixtures?sync_date=2026-11-23")
    assert response.status_code == 401


def test_odds_sync_requires_ingestion_token():
    response = client.post("/v1/providers/api-football/sync-odds?fixture_id=123")
    assert response.status_code == 401
