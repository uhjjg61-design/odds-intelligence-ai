ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS period_scores jsonb NOT NULL DEFAULT '{}'::jsonb;
