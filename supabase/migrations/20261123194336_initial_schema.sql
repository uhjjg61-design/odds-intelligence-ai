-- Odds Intelligence AI: initial schema
-- All writes are server-side only. Public clients receive read-only access to non-user data.
create extension if not exists pgcrypto;
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;

create table if not exists public.sports (
 id text primary key, name text not null unique, active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.leagues (
 id uuid primary key default gen_random_uuid(), sport_id text not null references public.sports(id),
 provider_key text, name text not null, country text, active boolean not null default true, created_at timestamptz not null default now(),
 unique(sport_id,name)
);
create table if not exists public.events (
 id uuid primary key default gen_random_uuid(), provider_key text, league_id uuid references public.leagues(id) on delete set null,
 sport_id text not null references public.sports(id), home_name text not null, away_name text not null,
 starts_at timestamptz not null, status text not null default 'scheduled' check(status in ('scheduled','live','finished','cancelled','postponed')),
 source_name text not null, source_updated_at timestamptz, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), unique(source_name,provider_key)
);
create table if not exists public.markets (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade,
 provider_key text, market_type text not null, selection text not null, line numeric, active boolean not null default true,
 created_at timestamptz not null default now(), unique(event_id,market_type,selection,line)
);
create table if not exists public.odds_snapshots (
 id uuid primary key default gen_random_uuid(), market_id uuid not null references public.markets(id) on delete cascade,
 source_name text not null, decimal_odds numeric not null check(decimal_odds > 1), captured_at timestamptz not null,
 is_live boolean not null default false, raw_payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
 unique(market_id,source_name,captured_at)
);
create table if not exists public.model_runs (
 id uuid primary key default gen_random_uuid(), model_name text not null, model_version text not null,
 sport_id text references public.sports(id), started_at timestamptz not null default now(),
 finished_at timestamptz, status text not null default 'queued' check(status in ('queued','running','succeeded','failed')),
 metrics jsonb not null default '{}'::jsonb, notes text
);
create table if not exists public.predictions (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade,
 market_id uuid references public.markets(id) on delete set null, model_run_id uuid references public.model_runs(id) on delete set null,
 model_name text not null, model_version text not null, probability numeric not null check(probability between 0 and 1),
 fair_odds numeric generated always as(case when probability > 0 then 1/probability else null end) stored,
 sample_size integer not null default 0 check(sample_size >= 0), uncertainty numeric check(uncertainty >= 0),
 explanation jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), expires_at timestamptz
);
create table if not exists public.data_sources (
 id uuid primary key default gen_random_uuid(), source_key text not null unique, display_name text not null,
 provider_type text not null check(provider_type in ('official','licensed','internal')),
 status text not null default 'not_configured' check(status in ('operational','degraded','not_configured','disabled')),
 coverage jsonb not null default '[]'::jsonb, rate_limit_per_hour integer, last_sync_at timestamptz,
 last_error text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.alerts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 event_id uuid references public.events(id) on delete cascade, prediction_id uuid references public.predictions(id) on delete set null,
 level text not null check(level in ('info','signal','warning','error')), title text not null, body text,
 read_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.user_settings (
 user_id uuid primary key references auth.users(id) on delete cascade, locale text not null default 'ar' check(locale in ('ar','en')),
 timezone text not null default 'Africa/Casablanca', alert_preferences jsonb not null default '{"in_app":true,"telegram":false}'::jsonb,
 risk_preferences jsonb not null default '{"minimum_sample_size":200,"minimum_ev":0.02}'::jsonb, updated_at timestamptz not null default now()
);
create table if not exists public.audit_logs (
 id bigint generated always as identity primary key, actor_id uuid references auth.users(id) on delete set null,
 action text not null, entity_type text not null, entity_id text, details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create index if not exists events_starts_at_idx on public.events(starts_at);
create index if not exists events_sport_status_idx on public.events(sport_id,status);
create index if not exists markets_event_idx on public.markets(event_id);
create index if not exists odds_market_captured_idx on public.odds_snapshots(market_id,captured_at desc);
create index if not exists predictions_event_created_idx on public.predictions(event_id,created_at desc);
create index if not exists alerts_user_created_idx on public.alerts(user_id,created_at desc);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at before update on public.events for each row execute function public.set_updated_at();
drop trigger if exists data_sources_set_updated_at on public.data_sources;
create trigger data_sources_set_updated_at before update on public.data_sources for each row execute function public.set_updated_at();
drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at before update on public.user_settings for each row execute function public.set_updated_at();

alter table public.sports enable row level security;
alter table public.leagues enable row level security;
alter table public.events enable row level security;
alter table public.markets enable row level security;
alter table public.odds_snapshots enable row level security;
alter table public.model_runs enable row level security;
alter table public.predictions enable row level security;
alter table public.data_sources enable row level security;
alter table public.alerts enable row level security;
alter table public.user_settings enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "Public read sports" on public.sports;
create policy "Public read sports" on public.sports for select to anon,authenticated using(active=true);
drop policy if exists "Public read leagues" on public.leagues;
create policy "Public read leagues" on public.leagues for select to anon,authenticated using(active=true);
drop policy if exists "Public read events" on public.events;
create policy "Public read events" on public.events for select to anon,authenticated using(true);
drop policy if exists "Public read markets" on public.markets;
create policy "Public read markets" on public.markets for select to anon,authenticated using(active=true);
drop policy if exists "Public read odds snapshots" on public.odds_snapshots;
create policy "Public read odds snapshots" on public.odds_snapshots for select to anon,authenticated using(true);
drop policy if exists "Public read predictions" on public.predictions;
create policy "Public read predictions" on public.predictions for select to anon,authenticated using(true);
drop policy if exists "Public read model runs" on public.model_runs;
create policy "Public read model runs" on public.model_runs for select to anon,authenticated using(status='succeeded');
drop policy if exists "Public read data sources" on public.data_sources;
create policy "Public read data sources" on public.data_sources for select to anon,authenticated using(true);
drop policy if exists "Users read own alerts" on public.alerts;
create policy "Users read own alerts" on public.alerts for select to authenticated using(auth.uid()=user_id);
drop policy if exists "Users update own alerts" on public.alerts;
create policy "Users update own alerts" on public.alerts for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "Users manage own settings" on public.user_settings;
create policy "Users manage own settings" on public.user_settings for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);

insert into public.sports(id,name) values ('football','Football'),('basketball','Basketball'),('tennis','Tennis')
on conflict(id) do update set name=excluded.name;
insert into public.data_sources(source_key,display_name,provider_type,status,coverage,metadata)
values
 ('internal-demo','Synthetic demo feed','internal','disabled','[]'::jsonb,'{"is_demo":true,"note":"Synthetic data only; not a live provider."}'::jsonb),
 ('api-football','API-Football fixtures','licensed','not_configured','["football"]'::jsonb,'{"requires_credentials":true,"fixture_sync":true}'::jsonb),
 ('licensed-odds','Licensed odds provider','licensed','not_configured','[]'::jsonb,'{"requires_credentials":true}'::jsonb),
 ('official-stats','Official sports statistics','official','not_configured','[]'::jsonb,'{"requires_credentials":true}'::jsonb)
on conflict(source_key) do update set display_name=excluded.display_name,provider_type=excluded.provider_type;
