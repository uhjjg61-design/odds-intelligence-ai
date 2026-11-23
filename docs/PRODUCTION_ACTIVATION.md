# Production activation checklist

This repository now includes a scheduled API-Football ingestion workflow and a Render Blueprint for the FastAPI service. The project is **not live yet** until the required secrets are configured and the first ingestion/deployment is verified.

## 1. Configure GitHub Actions secrets

Open the repository on GitHub:

**Settings → Secrets and variables → Actions → New repository secret**

Add these three secrets (never commit them to the repository):

| Secret | Value source | Purpose |
| --- | --- | --- |
| `API_FOOTBALL_KEY` | API-Football dashboard | Read football fixtures and any odds included in your subscription |
| `SUPABASE_URL` | Lovable project's Supabase connection settings | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project API settings | Server-side ingestion only; never expose in browser code |

After saving the secrets, open **Actions → Sync live sports data → Run workflow**. The scheduled workflow also runs every six hours. It imports fixtures for today and the next two days, then requests odds for up to three upcoming fixtures per run. The odds endpoint may return no data if the API-Football subscription does not include odds coverage.

The workflow writes source attribution and timestamps to Supabase. It does not create model predictions or fabricate missing prices.

## 2. Deploy the analytics API on Render

The Blueprint is in the repository root as `render.yaml`. The Render workspace currently requires payment information before it will plan/apply the free web service. No service was created and no paid plan was selected.

Once Render allows Blueprint planning, create/apply the Blueprint from this repository and use the **free** plan defined in the file. Configure these server-side variables on the Render service:

- `CORS_ORIGINS`: the exact Lovable preview/published origin(s), comma-separated
- `API_FOOTBALL_KEY`: API-Football key
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: service-role key
- `INGEST_API_TOKEN`: a long random token used by protected ingestion endpoints

Telegram variables are optional and should be added only if Telegram notifications are desired.

Health check: `/health`.

## 3. Connect the frontend

Set `VITE_ANALYTICS_API_URL` in the frontend hosting environment to the deployed Render service URL (without a trailing slash), then rebuild/publish the frontend. This is a public API base URL, not a secret.

The current GitHub repository's frontend data access layer still uses demo fixtures. Do not label its dashboard values as live until the frontend is wired to the production data endpoints and verified against non-empty Supabase rows. Lovable currently reports that its build agent is out of credits, so GitHub changes may not appear in the Lovable preview until GitHub sync/build is available.

## 4. Verify real data

After the first ingestion:

- `public.events` should contain rows with `source_name = 'api-football'`.
- `public.markets` and `public.odds_snapshots` should contain rows only when odds are covered by the provider plan.
- `public.data_sources` should show the API-Football source's last sync timestamp and operational/degraded state.
- Check the GitHub Actions run log for fixture counts and odds snapshot counts.

A live fixture feed and observed odds do not by themselves validate predictive performance. The Poisson endpoint is a baseline model; it must not be described as a proven or calibrated prediction engine until walk-forward backtesting and calibration have been completed.

## Cost and safety

The Render Blueprint requests a free web-service plan. The GitHub workflow uses GitHub Actions and does not require a paid Render worker. API-Football usage remains subject to the user's provider plan and request quota. Never place service-role keys or provider keys in `VITE_*` variables, browser code, commits, or issue comments.
