/**
 * DEMO DATA ONLY. Synthetic, deterministic values. Not live odds, not from any bookmaker.
 * Replace via src/lib/api.ts once a licensed provider + FastAPI analytics service exist.
 */
import { expectedValue, impliedProbability } from "./odds";

function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}
const rnd = seeded(42);

export type Sport = "football" | "basketball" | "tennis";
export type SportEvent = {
  id: string; sport: Sport; league: string; home: string; away: string;
  startsAt: string; status: "scheduled" | "live" | "finished"; markets: number;
};
export type Opportunity = {
  id: string; eventId: string; event: string; sport: Sport; market: string; selection: string;
  odds: number; modelProb: number; implied: number; ev: number; confidence: number;
  source: string; timestamp: string; sampleSize: number; uncertainty: number;
  explanationAr: string; explanationEn: string;
};

const base = Date.UTC(2026, 10, 23, 12, 0);
const iso = (hOffset: number) => new Date(base + hOffset * 3600_000).toISOString();

export const events: SportEvent[] = [
  { id: "e1", sport: "football", league: "Premier League", home: "Arsenal", away: "Chelsea", startsAt: iso(5), status: "scheduled", markets: 42 },
  { id: "e2", sport: "football", league: "La Liga", home: "Real Sociedad", away: "Villarreal", startsAt: iso(7), status: "scheduled", markets: 38 },
  { id: "e3", sport: "football", league: "Saudi Pro League", home: "Al Hilal", away: "Al Ittihad", startsAt: iso(2), status: "live", markets: 31 },
  { id: "e4", sport: "basketball", league: "NBA", home: "Celtics", away: "Bucks", startsAt: iso(9), status: "scheduled", markets: 27 },
  { id: "e5", sport: "tennis", league: "ATP Finals", home: "Sinner", away: "Zverev", startsAt: iso(4), status: "scheduled", markets: 14 },
  { id: "e6", sport: "football", league: "Serie A", home: "Atalanta", away: "Lazio", startsAt: iso(26), status: "scheduled", markets: 40 },
  { id: "e7", sport: "basketball", league: "EuroLeague", home: "Real Madrid", away: "Fenerbahçe", startsAt: iso(30), status: "scheduled", markets: 22 },
  { id: "e8", sport: "football", league: "Bundesliga", home: "Leipzig", away: "Freiburg", startsAt: iso(-20), status: "finished", markets: 0 },
];

const raw: [string, string, string, number, number, number, number, string, string][] = [
  ["e1", "1X2", "Arsenal", 1.95, 0.548, 0.71, 1240, "تفوق هجومي متوقع (xG) مقابل غيابات في دفاع تشيلسي؛ السعر المرصود أعلى من تقدير النموذج.", "Projected xG edge and Chelsea defensive absences; observed price sits above the model's fair line."],
  ["e2", "Over/Under 2.5", "Under 2.5", 1.88, 0.556, 0.58, 610, "الفريقان يسجلان معدل تسديدات منخفض في آخر 10 مباريات؛ الفارق صغير وحساس لتشكيلة البداية.", "Both sides show low shot volume over 10 matches; edge is small and sensitive to lineups."],
  ["e4", "Handicap -4.5", "Celtics -4.5", 1.91, 0.541, 0.49, 180, "تقدير يعتمد على تقييمات الكفاءة المعدلة؛ حجم العينة دون الحد الموثوق.", "Based on adjusted efficiency ratings; sample size is below the reliability threshold."],
  ["e5", "Match Winner", "Zverev", 3.1, 0.352, 0.44, 95, "أداء جيد على الأرضيات الصلبة الداخلية، لكن عدم اليقين مرتفع جداً.", "Strong indoor hard-court form, but uncertainty is very high."],
  ["e6", "BTTS", "Yes", 1.72, 0.611, 0.66, 980, "معدل استقبال أهداف مرتفع لدى الطرفين؛ احتمال النموذج أعلى قليلاً من الضمني.", "Both concede frequently; model probability modestly above implied."],
  ["e7", "Total Points", "Over 161.5", 1.9, 0.538, 0.52, 340, "إيقاع لعب أسرع من المتوسط؛ الإشارة متوسطة الثقة.", "Above-average pace; medium-confidence signal."],
];

export const opportunities: Opportunity[] = raw.map(([eventId, market, selection, odds, p, conf, n, ar, en], i) => {
  const ev = events.find((e) => e.id === eventId)!;
  return {
    id: `o${i + 1}`, eventId, event: `${ev.home} vs ${ev.away}`, sport: ev.sport, market, selection, odds,
    modelProb: p, implied: impliedProbability(odds), ev: expectedValue(p, odds), confidence: conf,
    source: i % 2 ? "Demo Feed B" : "Demo Feed A", timestamp: iso(-0.2 - i * 0.15), sampleSize: n,
    uncertainty: Math.round((0.02 + (1 - conf) * 0.08) * 1000) / 1000, explanationAr: ar, explanationEn: en,
  };
});

export const oddsMovement = Array.from({ length: 24 }, (_, i) => ({
  t: `${String(i).padStart(2, "0")}:00`,
  home: +(2.15 - i * 0.008 + (rnd() - 0.5) * 0.04).toFixed(3),
  draw: +(3.4 + (rnd() - 0.5) * 0.06).toFixed(3),
  away: +(3.5 + i * 0.01 + (rnd() - 0.5) * 0.05).toFixed(3),
}));

export const calibration = Array.from({ length: 10 }, (_, i) => {
  const mid = (i + 0.5) / 10;
  return { bin: `${i * 10}-${i * 10 + 10}%`, predicted: +mid.toFixed(3), observed: +Math.min(1, Math.max(0, mid + (rnd() - 0.5) * 0.08)).toFixed(3), n: Math.round(80 + rnd() * 400) };
});

export const backtest = (() => {
  let bank = 100, peak = 100;
  return Array.from({ length: 52 }, (_, i) => {
    bank += (rnd() - 0.47) * 3.2;
    peak = Math.max(peak, bank);
    return { week: `W${i + 1}`, bankroll: +bank.toFixed(2), drawdown: +(((bank - peak) / peak) * 100).toFixed(2) };
  });
})();

export const signalDistribution = [
  { range: "<-5%", count: 140 }, { range: "-5–-2%", count: 410 }, { range: "-2–0%", count: 690 },
  { range: "0–2%", count: 520 }, { range: "2–5%", count: 210 }, { range: "5–10%", count: 64 }, { range: ">10%", count: 11 },
];

export const metrics = {
  brier: 0.2093, logLoss: 0.6021, baselineBrier: 0.2214, ece: 0.021, predictions: 4812,
  roiSim: 0.018, maxDrawdown: Math.min(...backtest.map((b) => b.drawdown)) / 100, hitRate: 0.531,
};

export type DataSource = {
  id: string; name: string; kind: "official" | "licensed" | "internal"; status: "operational" | "degraded" | "not_configured";
  rateLimit: string; used: number; lastSync: string | null; coverage: string;
};
export const dataSources: DataSource[] = [
  { id: "s1", name: "Synthetic Demo Feed A (not live)", kind: "internal", status: "not_configured", rateLimit: "—", used: 0, lastSync: null, coverage: "Sample only" },
  { id: "s2", name: "Synthetic Demo Feed B (not live)", kind: "internal", status: "not_configured", rateLimit: "—", used: 0, lastSync: null, coverage: "Sample only" },
  { id: "s3", name: "Licensed odds provider", kind: "licensed", status: "not_configured", rateLimit: "—", used: 0, lastSync: null, coverage: "—" },
  { id: "s4", name: "Official league stats API", kind: "official", status: "not_configured", rateLimit: "—", used: 0, lastSync: null, coverage: "—" },
];

export type AlertItem = { id: string; level: "info" | "signal" | "warning"; titleAr: string; titleEn: string; at: string; read: boolean };
export const alerts: AlertItem[] = [
  { id: "a1", level: "signal", titleAr: "إشارة قيمة مرشحة: Arsenal (1X2)", titleEn: "Candidate value signal: Arsenal (1X2)", at: iso(-0.2), read: false },
  { id: "a2", level: "warning", titleAr: "Demo Feed B: تأخر في المزامنة", titleEn: "Demo Feed B: sync delayed", at: iso(-1.3), read: false },
  { id: "a3", level: "info", titleAr: "اكتمل إعادة تدريب النموذج (تجريبي)", titleEn: "Model retrain completed (demo)", at: iso(-6), read: true },
  { id: "a4", level: "warning", titleAr: "حجم عينة منخفض: Zverev", titleEn: "Low sample size: Zverev", at: iso(-0.9), read: true },
];

export const systemHealth = [
  { nameAr: "خدمة التحليل (FastAPI)", nameEn: "Analytics service (FastAPI)", status: "not_configured" as const },
  { nameAr: "قاعدة البيانات", nameEn: "Database", status: "not_configured" as const },
  { nameAr: "محرك الإشارات (تجريبي)", nameEn: "Signal engine (demo)", status: "operational" as const },
  { nameAr: "قنوات التنبيه", nameEn: "Alert channels", status: "degraded" as const },
];