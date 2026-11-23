import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { eventsQuery } from "@/lib/api";
import type { Sport } from "@/lib/demo-data";
import { useI18n } from "@/lib/i18n";
import { pageHead } from "@/lib/seo";
import { EmptyState, PageHeader, Panel, StatusDot, useFormatTime } from "@/components/app/ui-bits";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/events")({
  head: () => pageHead("Sports & Events", "Browse and filter sports events across leagues (demo data)."),
  loader: ({ context }) => context.queryClient.ensureQueryData(eventsQuery),
  component: Events,
});

function Events() {
  const { t } = useI18n();
  const fmt = useFormatTime();
  const { data } = useSuspenseQuery(eventsQuery);
  const [q, setQ] = useState("");
  const [sport, setSport] = useState<"all" | Sport>("all");
  const [status, setStatus] = useState("all");
  const rows = useMemo(() => data.filter((e) =>
    (sport === "all" || e.sport === sport) && (status === "all" || e.status === status) &&
    `${e.home} ${e.away} ${e.league}`.toLowerCase().includes(q.toLowerCase())), [data, q, sport, status]);
  const sportLabel = { football: t("كرة القدم", "Football"), basketball: t("كرة السلة", "Basketball"), tennis: t("التنس", "Tennis") };

  return (
    <>
      <PageHeader title={t("الرياضات والأحداث", "Sports & Events")} subtitle={t("التغطية حالياً رياضية. فئات أخرى قد تُضاف لاحقاً بقيود صارمة.", "Coverage is sports-first. Other categories may be added later under strict limits.")} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Tabs value={sport} onValueChange={(v) => setSport(v as typeof sport)}>
          <TabsList>
            <TabsTrigger value="all">{t("الكل", "All")}</TabsTrigger>
            {(Object.keys(sportLabel) as Sport[]).map((s) => <TabsTrigger key={s} value={s}>{sportLabel[s]}</TabsTrigger>)}
          </TabsList>
        </Tabs>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("كل الحالات", "All statuses")}</SelectItem>
            <SelectItem value="scheduled">{t("مجدول", "Scheduled")}</SelectItem>
            <SelectItem value="live">{t("جارٍ", "In play")}</SelectItem>
            <SelectItem value="finished">{t("انتهى", "Finished")}</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative ms-auto w-full sm:w-64">
          <Search className="pointer-events-none absolute start-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("ابحث عن فريق أو دوري", "Search team or league")} className="ps-8" />
        </div>
      </div>
      <Panel>
        {rows.length === 0 ? <EmptyState title={t("لا توجد أحداث مطابقة", "No matching events")} hint={t("جرّب تغيير الفلاتر", "Try adjusting filters")} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground"><tr className="border-b border-border">
                <th className="py-2 text-start font-medium">{t("الحدث", "Event")}</th>
                <th className="py-2 text-start font-medium">{t("الرياضة", "Sport")}</th>
                <th className="py-2 text-start font-medium">{t("الدوري", "League")}</th>
                <th className="py-2 text-start font-medium">{t("البداية", "Start")}</th>
                <th className="py-2 text-start font-medium">{t("النتيجة", "Score")}</th>
                <th className="py-2 text-start font-medium">{t("الأسواق", "Markets")}</th>
                <th className="py-2 text-start font-medium">{t("الحالة", "Status")}</th>
              </tr></thead>
              <tbody>{rows.map((e) => (
                <tr key={e.id} className="border-b border-border/60 last:border-0">
                  <td className="py-2.5 font-medium">{e.home} vs {e.away}</td>
                  <td className="py-2.5">{sportLabel[e.sport]}</td>
                  <td className="py-2.5 text-muted-foreground">{e.league}</td>
                  <td className="py-2.5 text-muted-foreground whitespace-nowrap">{fmt(e.startsAt)}</td>
                  <td className="py-2.5 font-semibold num">{e.homeScore != null && e.awayScore != null ? `${e.homeScore} – ${e.awayScore}` : "—"}</td>
                  <td className="py-2.5 num">{e.markets}</td>
                  <td className="py-2.5"><StatusDot status={e.status} /></td>
                </tr>))}</tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}