import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { opportunitiesQuery } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { pageHead } from "@/lib/seo";
import { EmptyState, PageHeader, Panel } from "@/components/app/ui-bits";
import { OpportunityCard } from "@/components/app/OpportunityCard";
import { CalibrationChart, SignalDistributionChart } from "@/components/app/charts";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/analysis")({
  head: () => pageHead("AI Analysis", "Model-based candidate value signals with explanations, confidence and uncertainty (demo data)."),
  loader: ({ context }) => context.queryClient.ensureQueryData(opportunitiesQuery),
  component: Analysis,
});

function Analysis() {
  const { t } = useI18n();
  const { data } = useSuspenseQuery(opportunitiesQuery);
  const [q, setQ] = useState("");
  const [onlyPositive, setOnlyPositive] = useState(false);
  const rows = useMemo(() => data.filter((o) => (!onlyPositive || o.ev > 0) && `${o.event} ${o.market} ${o.selection}`.toLowerCase().includes(q.toLowerCase())), [data, q, onlyPositive]);
  return (
    <>
      <PageHeader title={t("تحليل الذكاء الاصطناعي", "AI Analysis")} subtitle={t("إشارات مرشحة مع شرح للمنهجية. النموذج يقدّر احتمالات ولا يتنبأ بالنتائج بيقين.", "Candidate signals with methodology notes. The model estimates probabilities; it does not predict outcomes with certainty.")} />
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Panel title={t("معايرة النموذج", "Model calibration")}><CalibrationChart labels={{ predicted: t("مثالي", "Perfect"), observed: t("ملاحظ", "Observed") }} /></Panel>
        <Panel title={t("توزيع الإشارات", "Signal distribution")}><SignalDistributionChart label={t("عدد", "Count")} /></Panel>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute start-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("ابحث في الإشارات", "Search signals")} className="ps-8" />
        </div>
        <div className="flex items-center gap-2"><Switch id="pos" checked={onlyPositive} onCheckedChange={setOnlyPositive} /><Label htmlFor="pos">{t("القيمة المتوقعة المقدّرة موجبة فقط", "Positive estimated EV only")}</Label></div>
      </div>
      {rows.length === 0 ? <EmptyState title={t("لا توجد إشارات", "No signals")} /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.map((o) => <OpportunityCard key={o.id} o={o} />)}</div>
      )}
    </>
  );
}