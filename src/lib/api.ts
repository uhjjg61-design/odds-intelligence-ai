/**
 * Data access layer. Real event and provider-registry reads use Supabase REST
 * with the publishable key and database RLS. No service-role credentials enter
 * the browser. Demo fixtures are used only when Supabase is not configured.
 */
import { queryOptions } from "@tanstack/react-query";
import * as demo from "./demo-data";
import { isSupabaseConfigured, supabaseSelect } from "./supabase-rest";

export const ANALYTICS_API_URL: string | undefined = import.meta.env["VITE_ANALYTICS_API_URL"];
export const IS_DEMO = !isSupabaseConfigured;

type DbEvent = {
  id: string;
  sport_id: "football" | "basketball" | "tennis";
  home_name: string;
  away_name: string;
  starts_at: string;
  status: "scheduled" | "live" | "finished" | "cancelled" | "postponed";
  leagues?: { name: string } | null;
  markets?: { id: string }[];
};

type DbSource = {
  id: string;
  source_key: string;
  display_name: string;
  provider_type: "official" | "licensed" | "internal";
  status: "operational" | "degraded" | "not_configured" | "disabled";
  coverage: unknown;
  rate_limit_per_hour: number | null;
  last_sync_at: string | null;
};

async function fetchEvents(): Promise<demo.SportEvent[]> {
  if (!isSupabaseConfigured) return demo.events;
  const rows = await supabaseSelect<DbEvent>(
    "events",
    "select=id,sport_id,home_name,away_name,starts_at,status,leagues(name),markets(id)&order=starts_at.asc&limit=100",
  );
  return rows.map((row) => ({
    id: row.id,
    sport: row.sport_id,
    league: row.leagues?.name ?? "—",
    home: row.home_name,
    away: row.away_name,
    startsAt: row.starts_at,
    status: row.status === "cancelled" || row.status === "postponed" ? "scheduled" : row.status,
    markets: row.markets?.length ?? 0,
  }));
}

async function fetchSources(): Promise<demo.DataSource[]> {
  if (!isSupabaseConfigured) return demo.dataSources;
  const rows = await supabaseSelect<DbSource>(
    "data_sources",
    "select=id,source_key,display_name,provider_type,status,coverage,rate_limit_per_hour,last_sync_at&order=display_name.asc",
  );
  return rows.map((row) => ({
    id: row.source_key || row.id,
    name: row.display_name,
    kind: row.provider_type,
    status: row.status === "disabled" ? "not_configured" : row.status,
    rateLimit: row.rate_limit_per_hour ? String(row.rate_limit_per_hour) : "—",
    used: 0,
    lastSync: row.last_sync_at,
    coverage: Array.isArray(row.coverage) ? row.coverage.join(", ") : "—",
  }));
}

export const eventsQuery = queryOptions({
  queryKey: ["events"],
  queryFn: fetchEvents,
  staleTime: 60_000,
});
export const opportunitiesQuery = queryOptions({
  queryKey: ["opportunities"],
  // Predictions are intentionally withheld until validated model outputs exist.
  queryFn: async () => (isSupabaseConfigured ? [] : demo.opportunities),
  staleTime: 60_000,
});
export const sourcesQuery = queryOptions({
  queryKey: ["sources"],
  queryFn: fetchSources,
  staleTime: 60_000,
});
export const alertsQuery = queryOptions({
  queryKey: ["alerts"],
  queryFn: async () => (isSupabaseConfigured ? [] : demo.alerts),
  staleTime: 60_000,
});
