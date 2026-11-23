# Sports data ingestion setup

The ingestion workers run on GitHub Actions; no Render service or paid compute is required.

## Required repository Actions secrets

Open **Settings → Secrets and variables → Actions → New repository secret** and add:

- `API_FOOTBALL_KEY`: a current API-Football key with fixtures access.
- `SUPABASE_URL`: `https://ljbapxbtuqahbaeytjri.supabase.co`.
- `SUPABASE_SERVICE_ROLE_KEY`: the Supabase server-side service-role key. Never use this in Vercel browser variables or commit it to Git.
- `API_BASKETBALL_KEY`: an API-Basketball key with games access. This can be the same API-Sports key only if the Basketball product is enabled for that account; otherwise use the separate key shown by the Basketball dashboard.

The API-Football key was previously pasted into a chat. Rotate it at the provider before saving the replacement as a GitHub secret. Do not paste the replacement key into chat, issues, logs, or source files.

## Schedules

- `Sync live football fixtures`: polls the provider's live fixtures endpoint about every 30 minutes. GitHub schedule delivery can be delayed, so this is near-live polling, not a guaranteed real-time feed.
- `Sync historical football results and odds`: daily refresh of the previous 7 days plus the next 3 days. It stores final scores, half-time scores, match status, venue, referee, round, and provider payload.
- To seed a deeper history, open **Actions → Sync historical football results and odds → Run workflow** and set `history_days` to `30` for the first backfill. The provider plan determines how much historical coverage is actually available.

The historical job requests a small sample of upcoming odds. Historical odds and in-play bookmaker prices are not assumed to exist; they depend on provider plan and endpoint availability.

## Validation after adding secrets

1. Run **Sync historical football results and odds** manually.
2. Run **Sync live football fixtures** manually.
3. Check the `events`, `leagues`, `markets`, and `odds_snapshots` tables in Supabase.
4. Check `data_sources.source_key = 'api-football'`; it should report `operational` and a recent `last_sync_at` after a successful run.

If a workflow reports that secrets are missing, verify the three names above exactly. Never print secret values in workflow logs.

## Basketball

- `Sync live basketball games` polls today's games about every 30 minutes.
- `Sync historical basketball results` refreshes the previous 7 days and next 3 days daily; the manual workflow supports a 30-day initial backfill.
- The ingestion stores total scores and each quarter/overtime score in `events.home_score`, `events.away_score`, and `events.period_scores`.
- The Basketball API subscription has its own quota and coverage. The workflow safely skips until `API_BASKETBALL_KEY` is configured.
