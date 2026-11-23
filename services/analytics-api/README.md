# Analytics API

Research-only API for probability calculations and model baselines. It has no bookmaker integration, no wagering execution, and no payment functionality.

## Run locally

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Open `/docs` for the OpenAPI interface and `/health` for the health check.

## Endpoints

- `GET /health`
- `POST /v1/models/football/poisson` — independent Poisson score-grid baseline.
- `POST /v1/evaluate` — implied probability, probability edge, estimated EV and minimum-sample warning.\n- `GET /v1/providers/api-football/status` — provider readiness without exposing secrets.\n- `POST /v1/providers/api-football/sync-fixtures?sync_date=YYYY-MM-DD` — protected fixture ingestion into Supabase (requires `x-ingest-token`).\n- `POST /v1/providers/api-football/sync-odds?fixture_id=FIXTURE_ID` — protected timestamped odds snapshot ingestion (requires a previously synced fixture and `x-ingest-token`).

Expected-goals inputs must be sourced from a licensed/official feed and validated before use. The Poisson implementation is a baseline, not a production-calibrated prediction model. Add walk-forward validation, calibration monitoring, data provenance and provider-specific rate limits before production use.

## Environment

- `CORS_ORIGINS`: comma-separated exact frontend origins.
- Supabase service credentials belong in a server-side worker only; never expose a service-role key to the browser.
