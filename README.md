# Odds Intelligence AI

Arabic-first sports analytics dashboard with an analysis-only design. **No bets are placed or executed, no bookmaker accounts are accessed, and no money is moved.**

## Current implementation status

- React 19 + TypeScript dashboard with Arabic RTL / English LTR.
- Overview, live monitor, sports/events, markets, AI analysis, historical performance, alerts, data sources and settings pages.
- Alerts can be filtered and marked read in the current browser session; preferences can be saved locally in the current browser.
- Synthetic sample data is visibly labeled as demo data. It is not real odds, not live data, and not validated predictive performance.
- Supabase PostgreSQL is hosted in a separate Supabase project (not Lovable-managed). The schema and RLS policies are in `supabase/migrations/`.
- A separate FastAPI analytics service is available under `services/analytics-api`, with a Poisson football baseline and probability/EV evaluation endpoints.
- GitHub Actions CI runs frontend lint, tests, production build, and analytics API tests.

## Important remaining production requirements

This repository is **not yet a live production analytics platform**. Before calling it production-ready:

1. Connect a licensed/official sports data provider and configure its credentials as server-side secrets.
2. Deploy the FastAPI service and set `VITE_ANALYTICS_API_URL` in the frontend hosting environment.
3. Add GitHub Actions repository secrets `API_FOOTBALL_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` to enable scheduled football fixture/odds ingestion. Never expose `SUPABASE_SERVICE_ROLE_KEY` in browser code.
4. Add authentication before enabling user-specific alerts/settings across devices.
5. The scheduled workflow in `.github/workflows/sync-sports.yml` runs every six hours and calls `scripts/sync_api_football.py`. It syncs a limited upcoming window and a small number of odds fixtures; it remains inactive until the three GitHub secrets above are configured. Review API-Football plan quotas before increasing its schedule.
6. Add walk-forward backtests, probability calibration, out-of-sample validation, and model drift monitoring.
7. Configure Telegram only after the backend deployment is secured; store bot credentials in server-side secrets.
8. Configure a separate API-Basketball data credential before enabling basketball ingestion; football credentials do not automatically enable basketball coverage.

## Stack

- Frontend: React 19, TypeScript, TanStack Start/Router, Tailwind CSS, Recharts, Vitest.
- Database: Supabase PostgreSQL with row-level security.
- Analytics API: Python 3.12, FastAPI, Pydantic, pytest.
- CI: GitHub Actions with Bun and Python.

## Local development

### Frontend

Requirements: Bun (see `bun.lock`).

```bash
bun install --frozen-lockfile
bun run dev
```

Checks:

```bash
bun run lint
bun run test
bun run build
```

### Analytics API

```bash
cd services/analytics-api
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API documentation is available at `/docs`; health check at `/health`.

## API endpoints

- `GET /health`
- `POST /v1/models/football/poisson`
- `POST /v1/evaluate`

The Poisson model is a transparent baseline, not a calibrated production model. It does not include a Dixon-Coles correction. Inputs must come from validated, timestamped sources before use.

## Supabase

- Migration: `supabase/migrations/202611230001_initial_schema.sql`
- Tables cover sports, leagues, events, markets, odds snapshots, model runs, predictions, data sources, user alerts, user settings and audit logs.
- Public access is read-only for non-user data; user alerts/settings are scoped by `auth.uid()`.
- Service-role credentials must be used only by trusted server-side workers.

## Environment variables

See `.env.example`. Browser variables must contain only public values. Provider tokens, Telegram bot tokens and Supabase service-role keys must be stored only in deployment secret storage.

## Statistical and responsible-use limitations

- Expected value is an estimate and depends on probability calibration, source quality, market timing and omitted costs.
- Minimum sample size warnings are required; a positive estimated edge is not a guarantee or a recommendation to wager.
- ROI and drawdown charts, if used, must be labeled as paper-trading simulation and include sample size, uncertainty and costs.
- Roulette, Crash and other RNG games cannot be predicted from past outcomes. Any future support is limited to theoretical RTP, statistical distributions and anomaly monitoring.

## License

No license has been selected. All rights reserved by the repository owner unless a license is added.
