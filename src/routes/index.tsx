import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { eventsQuery, opportunitiesQuery, sourcesQuery } from "@/lib/api";
import { metrics, systemHealth } from "@/lib/demo-data";
import { useI18n } from "@/lib/i18n";
import { pageHead } from "@/lib/seo";
import { pct } from "@/lib/odds";
import { PageHeader, Panel, Stat, StatusDot, useFormatTime } from "@/components/app/ui-bits";
import { OpportunityCard } from "@/components/app/OpportunityCard";
import { OddsMovementChart, SignalDistributionChart } from "@/components/app/charts";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => pageHead("Overview", "Market monitoring status, upcoming events, model confidence and candidate value signals (demo data)."),
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(eventsQuery),
    context.queryClient.ensureQueryData(opportunitiesQuery),
    context.queryClient.ensureQueryData(sourcesQuery),
  ]),
  component: Overview,
});

function Overview() {
  const { t } = useI18n();
  const fmt = useFormatTime();
  const { data: events } = useSuspenseQuery(eventsQuery);
  const { data: opps } = useSuspenseQuery(opportunitiesQuery);
  const { data: sources } = useSuspenseQuery(sourcesQuery);
  const upcoming = events.filter((e) => e.status !== "finished").sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, 5);
  const avgConf = opps.reduce((s, o) => s + o.confidence, 0) / opps.length;
  const positive = opps.filter((o) => o.ev > 0).sort((a, b) => b.ev - a.ev);
  const active = sources.filter((s) => s.status !== "not_configured");

  return (
    <>
      <PageHeader
        title={t("نظرة عامة", "Overview")}
        subtitle={t("ملخص حالة المراقبة والإشارات المرشحة. كل القيم أدناه بيانات تجريبية ولا تمثل احتمالات حقيقية من أي مزوّد.", "Monitoring status and candidate signals. All values below are demo data and do not reflect real odds from any provider.")}
        actions={<Button asChild variant="outline" size="sm"><Link to="/analysis">{t("كل الإشارات", "All signals")}</Link></Button>}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t("حالة المراقبة", "Monitoring")} value={t("تجريبي", "Demo")} hint={t(`${active.length} من ${sources.length} مصادر نشطة`, `${active.length} of ${sources.length} sources active`)} tone="warning" />
        <Stat label={t("إشارات مرشحة", "Candidate signals")} value={positive.length} hint={t("قيمة متوقعة مقدّرة > 0", "Estimated EV > 0")} tone="success" />
        <Stat label={t("متوسط ثقة النموذج", "Avg. model confidence")} value={pct(avgConf, 0)} hint={t("ليس احتمال فوز", "Not a win probability")} />
        <Stat label={t("Brier (مقابل خط الأساس)", "Brier (vs baseline)")} value={metrics.brier.toFixed(3)} hint={`${t("خط الأساس", "Baseline")} ${metrics.baselineBrier.toFixed(3)}`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title={t("الأحداث القادمة", "Upcoming events")} className="lg:col-span-2" right={<Link to="/events" className="text-xs text-primary hover:underline">{t("عرض الكل", "View all")}</Link>}>
          <ul className="divide-y divide-border">
            {upcoming.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{e.home} vs {e.away}</div>
                  <div className="text-xs text-muted-foreground">{e.league} · {fmt(e.startsAt)}</div>
                </div>
                <StatusDot status={e.status} />
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title={t("صحة النظام وحداثة البيانات", "System health & freshness")}>
          <ul className="space-y-2.5">
            {systemHealth.map((h) => (
              <li key={h.nameEn} className="flex items-center justify-between gap-2 text-sm"><span>{t(h.nameAr, h.nameEn)}</span><StatusDot status={h.status} /></li>
            ))}
          </ul>
          <div className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground space-y-1">
            {sources.map((s) => (
              <div key={s.id} className="flex justify-between gap-2"><span className="truncate">{s.name}</span><span>{s.lastSync ? fmt(s.lastSync) : "—"}</span></div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title={t("حركة الاحتمالات — Arsenal vs Chelsea", "Odds movement — Arsenal vs Chelsea")}>
          <OddsMovementChart labels={{ home: t("المضيف", "Home"), draw: t("تعادل", "Draw"), away: t("الضيف", "Away") }} />
        </Panel>
        <Panel title={t("توزيع الإشارات (القيمة المتوقعة المقدّرة)", "Signal distribution (estimated EV)")}>
          <SignalDistributionChart label={t("عدد", "Count")} />
        </Panel>
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold">{t("أبرز الإشارات المرشحة", "Top candidate signals")}</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {positive.slice(0, 3).map((o) => <OpportunityCard key={o.id} o={o} />)}
      </div>
    </>
  );
}