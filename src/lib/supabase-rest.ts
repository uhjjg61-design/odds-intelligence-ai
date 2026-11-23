const SUPABASE_URL = import.meta.env["VITE_SUPABASE_URL"]?.replace(/\/$/, "");
const SUPABASE_KEY = import.meta.env["VITE_SUPABASE_ANON_KEY"];

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

export async function supabaseSelect<T>(table: string, query: string): Promise<T[]> {
  if (!isSupabaseConfigured || !SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Supabase browser configuration is missing");
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Supabase request failed (${response.status}): ${detail.slice(0, 240)}`);
  }

  return (await response.json()) as T[];
}
