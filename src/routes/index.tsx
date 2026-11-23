import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { eventsQuery, opportunitiesQuery, sourcesQuery } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { pageHead } from "@/lib/seo";
import { pct } from "@/lib/odds";
import { PageHeader, Panel, Stat, StatusDot, useFormatTime } from "@/components/app/ui-bits";
import { OpportunityCard } from "@/components/app/OpportunityCard";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => pageHead("Overview", "Live database status, upcoming events and validated model signals."),
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
  const avgConf = opps.length ? opps.reduce((s, o) => s + o.confidence, 0) / opps.length : null;
  const positive = opps.filter((o) => o.ev > 0).sort((a, b) => b.ev - a.ev);
  const active = sources.filter((s) => s.status === "operational");

  return (
    <>
      <PageHeader
        title={t("نظرة عامة", "Overview")}
        subtitle={t("البيانات والأحداث تُقرأ من قاعدة البيانات. لن تظهر توصيات حتى تتوفر بيانات حقيقية ونموذج تم التحقق منه.", "Events and provider status are read from the database. No recommendations are shown until real data and a validated model are available.")}
        actions={<Button asChild variant="outline" size="sm"><Link to="/analysis">{t("صفحة التحليل", "Analysis")}</Link></Button>}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t("حالة مصادر البيانات", "Data sources")} value={`${active.length}/${sources.length}`} hint={t("مصادر تعمل حالياً", "Operational providers")} tone={active.length ? "success" : "warning"} />
        <Stat label={t("الأحداث القادمة", "Upcoming events")} value={upcoming.length} hint={t("من قاعدة البيانات", "From Supabase")} />
        <Stat label={t("توصيات موثقة", "Validated signals")} value={positive.length} hint={t("لا توجد توصيات قبل التحقق", "No signals before validation")} />
        <Stat label={t("متوسط الثقة", "Average confidence")} value={avgConf === null ? "—" : pct(avgConf, 0)} hint={t("يتطلب تنبؤات موثقة", "Requires validated predictions")} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title={t("الأحداث القادمة", "Upcoming events")} className="lg:col-span-2" right={<Link to="/events" className="text-xs text-primary hover:underline">{t("عرض الكل", "View all")}</Link>}>
          {upcoming.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("لا توجد مباريات مستوردة بعد. ستظهر هنا بعد تشغيل مزود البيانات.", "No fixtures have been imported yet. They will appear here after the data provider is configured.")}</p>
          ) : (
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
          )}
        </Panel>
        <Panel title={t("صحة مصادر البيانات", "Data source health")}>
          {sources.length === 0 ? <p className="text-sm text-muted-foreground">{t("لا توجد مصادر مسجلة.", "No providers registered.")}</p> : (
            <ul className="space-y-2.5">
              {sources.map((source) => (
                <li key={source.id} className="flex items-center justify-between gap-2 text-sm"><span className="truncate">{source.name}</span><StatusDot status={source.status} /></li>
              ))}
            </ul>
          )}
          <div className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground space-y-1">
            {sources.map((s) => <div key={s.id} className="flex justify-between gap-2"><span className="truncate">{s.name}</span><span>{s.lastSync ? fmt(s.lastSync) : "—"}</span></div>)}
          </div>
        </Panel>
      </div>

      <div className="mt-4">
        <Panel title={t("التحليل الإحصائي", "Statistical analysis")} demo={false}>
          <p className="text-sm text-muted-foreground">{t("لم يتم تفعيل مخططات الأداء بعد. سنعرضها بعد جمع نتائج فعلية وتسجيل تنبؤات قابلة للاختبار، بدلاً من عرض أرقام تجريبية قد تُفهم على أنها أداء حقيقي.", "Performance charts are withheld until real outcomes and testable predictions are collected, rather than showing synthetic figures as if they were real performance.")}</p>
        </Panel>
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold">{t("الإشارات المرشحة", "Candidate signals")}</h2>
      {positive.length === 0 ? (
        <Panel><p className="py-5 text-center text-sm text-muted-foreground">{t("لا توجد توصيات حالياً. هذا سلوك مقصود إلى أن تتوفر بيانات موثوقة وعينات كافية ومعايرة للنموذج.", "There are no recommendations yet. This is intentional until reliable data, sufficient samples and model calibration are available.")}</p></Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{positive.slice(0, 3).map((o) => <OpportunityCard key={o.id} o={o} />)}</div>
      )}
    </>
  );
}
