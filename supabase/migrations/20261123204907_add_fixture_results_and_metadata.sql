-- Persist verified fixture outcomes and context returned by sports providers.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS home_score integer,
  ADD COLUMN IF NOT EXISTS away_score integer,
  ADD COLUMN IF NOT EXISTS halftime_home_score integer,
  ADD COLUMN IF NOT EXISTS halftime_away_score integer,
  ADD COLUMN IF NOT EXISTS elapsed_minutes integer,
  ADD COLUMN IF NOT EXISTS venue text,
  ADD COLUMN IF NOT EXISTS referee text,
  ADD COLUMN IF NOT EXISTS round text,
  ADD COLUMN IF NOT EXISTS raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS events_starts_at_idx ON public.events (starts_at);
CREATE INDEX IF NOT EXISTS events_sport_status_starts_at_idx ON public.events (sport_id, status, starts_at);
