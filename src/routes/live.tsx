import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { eventsQuery, sourcesQuery } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { pageHead } from "@/lib/seo";
import { EmptyState, PageHeader, Panel, StatusDot, useFormatTime, Warning } from "@/components/app/ui-bits";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/live")({
  head: () => pageHead("Live Monitor", "Provider-sourced live fixtures and verified scores. Updates depend on provider and free-tier polling limits."),
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(eventsQuery),
    context.queryClient.ensureQueryData(sourcesQuery),
  ]),
  component: Live,
});

function Live() {
  const { t } = useI18n();
  const fmt = useFormatTime();
  const qc = useQueryClient();
  const { data: events } = useSuspenseQuery(eventsQuery);
  const { data: sources } = useSuspenseQuery(sourcesQuery);
  const liveEvents = events.filter((event) => event.status === "live");
  const upcoming = events
    .filter((event) => event.status === "scheduled" && new Date(event.startsAt).getTime() >= Date.now())
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, 8);
  const footballSource = sources.find((source) => source.id === "api-football");

  const refresh = async () => {
    await qc.invalidateQueries();
    toast.success(t("تم تحديث القراءة من قاعدة البيانات", "Database data refreshed"));
  };

  return (
    <>
      <PageHeader
        title={t("المراقبة المباشرة", "Live Monitor")}
        subtitle={t("نتائج وحالات المباريات المستوردة من مزود البيانات. التحديث المجدول كل 30 دقيقة تقريباً، وقد يتأخر حسب GitHub Actions وحدود المزود.", "Fixture status and scores imported from the provider. Scheduled polling is approximately every 30 minutes and may be delayed by GitHub Actions or provider limits.")}
        actions={<Button size="sm" variant="outline" onClick={refresh}><RefreshCw />{t("تحديث القراءة", "Refresh data")}</Button>}
      />
      <Warning>
        {t("لا نعرض احتمالات مباشرة هنا ما لم تصل أسعار سوق موثقة من مزود مرخّص. النتيجة المباشرة ليست سعراً للمراهنة.", "Live odds are not shown unless verified prices arrive from a licensed provider. A live score is not a betting price.")}
      </Warning>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title={t("المباريات الجارية", "Matches in play")} className="lg:col-span-2">
          {liveEvents.length === 0 ? (
            <EmptyState
              title={t("لا توجد مباراة جارية مستوردة الآن", "No imported live fixtures right now")}
              hint={t("ستظهر المباريات هنا بعد وصولها من API-Football وتشغيل مزامنة البيانات.", "Fixtures will appear after API-Football returns them and ingestion runs.")}
            />
          ) : (
            <ul className="divide-y divide-border">
              {liveEvents.map((event) => (
                <li key={event.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{event.home} vs {event.away}</div>
                    <div className="text-xs text-muted-foreground">{event.league} · {fmt(event.startsAt)}</div>
                    {event.sourceUpdatedAt && <div className="text-xs text-muted-foreground">{t("آخر تحديث من المصدر", "Source updated")}: {fmt(event.sourceUpdatedAt)}</div>}
                  </div>
                  <div className="shrink-0 text-end">
                    <div className="text-xl font-bold num">{event.homeScore != null && event.awayScore != null ? `${event.homeScore} – ${event.awayScore}` : "—"}</div>
                    {event.elapsedMinutes != null && <div className="text-xs text-muted-foreground">{event.elapsedMinutes}'</div>}
                    <StatusDot status={event.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title={t("مصدر البيانات", "Data provider")}>
          {footballSource ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{footballSource.name}</span>
                <StatusDot status={footballSource.status} />
              </div>
              <div className="text-xs text-muted-foreground">{t("آخر مزامنة ناجحة", "Last successful sync")}</div>
              <div>{footballSource.lastSync ? fmt(footballSource.lastSync) : t("لم تتم المزامنة بعد", "Not synced yet")}</div>
              <div className="border-t border-border pt-3 text-xs text-muted-foreground">
                {t("التحديث التلقائي لا يعني بثاً لحظياً؛ وتيرة الجلب الحالية مصممة لتقليل استهلاك الحصة المجانية.", "Automatic updates are not a live broadcast; polling is deliberately conservative to protect the free API quota.")}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("مصدر كرة القدم غير مسجل.", "Football provider is not registered.")}</p>
          )}
        </Panel>
      </div>
      <div className="mt-4">
        <Panel title={t("المباريات القادمة", "Upcoming fixtures")}>
          {upcoming.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">{t("لا توجد مباريات قادمة في قاعدة البيانات بعد.", "No upcoming fixtures are in the database yet.")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {upcoming.map((event) => (
                <li key={event.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{event.home} vs {event.away}</div>
                    <div className="text-xs text-muted-foreground">{event.league} · {fmt(event.startsAt)}</div>
                  </div>
                  <StatusDot status={event.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
