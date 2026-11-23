import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { RefreshCw, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { eventsQuery, sourcesQuery } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { pageHead } from "@/lib/seo";
import { PageHeader, Panel, StatusDot, useFormatTime, Warning } from "@/components/app/ui-bits";
import { OddsMovementChart } from "@/components/app/charts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/live")({
  head: () => pageHead("Live Monitor", "Market monitor view with source status and odds movement (demo data, not real-time)."),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(eventsQuery), context.queryClient.ensureQueryData(sourcesQuery)]),
  component: Live,
});

function Live() {
  const { t } = useI18n();
  const fmt = useFormatTime();
  const qc = useQueryClient();
  const { data: events } = useSuspenseQuery(eventsQuery);
  const { data: sources } = useSuspenseQuery(sourcesQuery);
  const open = events.filter((e) => e.status !== "finished");
  const [eventId, setEventId] = useState(open[0]?.id ?? "");
  const [paused, setPaused] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const ev = open.find((e) => e.id === eventId);

  const refresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries();
    setRefreshing(false);
    toast.success(t("تم تحديث البيانات التجريبية", "Demo data refreshed"));
  };

  return (
    <>
      <PageHeader
        title={t("المراقبة المباشرة", "Live Monitor")}
        subtitle={t("لا يوجد مزوّد مرخّص مُهيأ، لذا هذه ليست احتمالات حقيقية أو لحظية.", "No licensed provider is configured, so these are not real or real-time odds.")}
        actions={<>
          <Button variant="outline" size="sm" onClick={() => setPaused((p) => !p)}>{paused ? <Play /> : <Pause />}{paused ? t("استئناف", "Resume") : t("إيقاف مؤقت", "Pause")}</Button>
          <Button size="sm" onClick={refresh} disabled={refreshing || paused}><RefreshCw className={refreshing ? "animate-spin" : ""} />{t("تحديث", "Refresh")}</Button>
        </>}
      />
      <Warning>{paused ? t("المراقبة متوقفة مؤقتاً.", "Monitoring paused.") : t("وضع العرض التجريبي: يتم عرض لقطات ثابتة مصطنعة.", "Demo mode: static synthetic snapshots are displayed.")}</Warning>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title={t("حركة الاحتمالات", "Odds movement")} className="lg:col-span-2" right={
          <Select value={eventId} onValueChange={setEventId}>
            <SelectTrigger className="h-8 w-52 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{open.map((e) => <SelectItem key={e.id} value={e.id}>{e.home} vs {e.away}</SelectItem>)}</SelectContent>
          </Select>}>
          {ev && <div className="mb-2 text-xs text-muted-foreground">{ev.league} · {fmt(ev.startsAt)}</div>}
          <OddsMovementChart labels={{ home: ev?.home ?? "Home", draw: t("تعادل", "Draw"), away: ev?.away ?? "Away" }} />
        </Panel>
        <Panel title={t("حالة المصادر", "Source status")}>
          <ul className="space-y-3">
            {sources.map((s) => (
              <li key={s.id} className="text-sm">
                <div className="flex justify-between gap-2"><span className="truncate">{s.name}</span><StatusDot status={s.status} /></div>
                <div className="text-xs text-muted-foreground">{t("آخر مزامنة", "Last sync")}: {s.lastSync ? fmt(s.lastSync) : "—"}</div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}