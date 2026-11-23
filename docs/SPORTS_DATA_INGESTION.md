# Sports data ingestion setup

The ingestion workers run on GitHub Actions; no Render service or paid compute is required.

## Required repository Actions secrets

Open **Settings → Secrets and variables → Actions → New repository secret** and add:

- `API_FOOTBALL_KEY`: a current API-Football key with fixtures access.
- `SUPABASE_URL`: `https://ljbapxbtuqahbaeytjri.supabase.co`.
- `SUPABASE_SERVICE_ROLE_KEY`: the Supabase server-side service-role/secret key. Never use this in Vercel browser variables or commit it to Git.

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

Basketball is not yet ingesting data. The Supabase source registry identifies API-Basketball as requiring its own provider credentials. Add a separate `API_BASKETBALL_KEY` only after enabling the API-Basketball product/subscription; do not assume the football subscription covers it. A basketball ingestion job and sport-specific score/period mapping must be verified before the basketball source can be marked operational.
