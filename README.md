# Odds Intelligence AI

Arabic-first sports odds analytics dashboard. **Analysis only — no bets are placed or executed.**

## Current status

This repository mirrors the current Lovable prototype. It uses **synthetic demo data only**; no live bookmaker feed or licensed provider is connected. The UI and sample metrics are for demonstration and are not validated predictive performance. Do not interpret sample signals as betting advice or guaranteed outcomes.

The Lovable build stopped after the workspace ran out of credits. Core dashboard pages are present; Alerts, Data Sources, and Settings currently contain placeholders. Automated build, lint, and test verification has not yet been completed.

## Stack

- React 19 + TypeScript
- TanStack Start / Router
- Tailwind CSS
- shadcn-style Radix UI components
- Recharts
- Vitest

## Local development

Requirements: Node.js 20+ and npm (or Bun).

```bash
npm install
npm run dev
```

Checks:

```bash
npm run lint
npm test
npm run build
```

## Architecture notes

- `src/lib/demo-data.ts`: deterministic synthetic sample events, odds, model metrics and charts.
- `src/lib/odds.ts`: pure probability and evaluation helpers (implied probability, expected value, Brier score, log loss).
- `src/lib/api.ts`: data access abstraction; intended integration point for a future analytics API.
- `src/lib/i18n.tsx`: Arabic/English language state and RTL/LTR direction.
- `src/routes/`: dashboard pages.
- `src/components/app/`: application shell, reusable cards and charts.

## Planned integrations (not yet configured)

1. Connect only licensed/official sports data providers, with source attribution, timestamps, rate-limit handling and historical snapshots.
2. Add a separate FastAPI service for collection, normalization, model inference and backtesting.
3. Add Supabase/PostgreSQL for users, provider metadata, events, odds snapshots, predictions, alerts and audit history.
4. Configure Telegram notifications using server-side secrets only; never expose bot tokens in client code.
5. Add CI for type-checking, linting, unit/integration tests and backtesting regression checks.

## Safety and statistical limitations

- No wagering execution, bookmaker account credentials, deposits, withdrawals or money movement.
- No guaranteed-profit claims. Model probabilities require calibration and out-of-sample validation.
- Roulette, Crash and other RNG games are not predictable from historical outcomes. Any future support must be limited to theoretical RTP, statistical distributions and anomaly monitoring.
- Historical ROI, if later added, must be clearly labeled as paper-trading simulation and include uncertainty, fees, sample size and drawdown.

## License

No license has been selected yet. All rights reserved by the repository owner unless a license is added.
