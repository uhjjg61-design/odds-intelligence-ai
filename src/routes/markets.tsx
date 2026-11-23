import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { opportunitiesQuery } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { pageHead } from "@/lib/seo";
import { pct } from "@/lib/odds";
import { EmptyState, PageHeader, Panel } from "@/components/app/ui-bits";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/markets")({
  head: () => pageHead("Markets", "Compare observed odds with model and implied probabilities per market (demo data)."),
  loader: ({ context }) => context.queryClient.ensureQueryData(opportunitiesQuery),
  component: Markets,
});

function Markets() {
  const { t } = useI18n();
  const { data } = useSuspenseQuery(opportunitiesQuery);
  const [market, setMarket] = useState("all");
  const [sort, setSort] = useState<"ev" | "confidence" | "odds">("ev");
  const [minEv, setMinEv] = useState([-5]);
  const markets = [...new Set(data.map((o) => o.market))];
  const rows = useMemo(() => data
    .filter((o) => (market === "all" || o.market === market) && o.ev * 100 >= (minEv[0] ?? -5))
    .sort((a, b) => b[sort] - a[sort]), [data, market, sort, minEv]);

  return (
    <>
      <PageHeader title={t("الأسواق", "Markets")} subtitle={t("مقارنة الاحتمال الضمني من السعر بتقدير النموذج. الفارق ليس ضماناً.", "Implied probability from price vs. model estimate. A gap is not a guarantee.")} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select value={market} onValueChange={setMarket}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">{t("كل الأسواق", "All markets")}</SelectItem>{markets.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ev">{t("ترتيب: القيمة المتوقعة", "Sort: EV")}</SelectItem>
            <SelectItem value="confidence">{t("ترتيب: الثقة", "Sort: Confidence")}</SelectItem>
            <SelectItem value="odds">{t("ترتيب: الاحتمالات", "Sort: Odds")}</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex w-64 items-center gap-3 text-xs">
          <span className="whitespace-nowrap text-muted-foreground">{t("أدنى قيمة متوقعة", "Min EV")} <span className="num">{minEv[0]}%</span></span>
          <Slider min={-5} max={10} step={0.5} value={minEv} onValueChange={setMinEv} />
        </div>
      </div>
      <Panel>
        {rows.length === 0 ? <EmptyState title={t("لا توجد أسواق ضمن هذه المعايير", "No markets match these criteria")} /> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground"><tr className="border-b border-border">
              {[t("الحدث", "Event"), t("السوق", "Market"), t("الاختيار", "Selection"), t("الاحتمالات", "Odds"), t("ضمني", "Implied"), t("النموذج", "Model"), t("ق.م. مقدّرة", "Est. EV"), t("الثقة", "Conf.")].map((h) => <th key={h} className="py-2 text-start font-medium">{h}</th>)}
            </tr></thead>
            <tbody>{rows.map((o) => (
              <tr key={o.id} className="border-b border-border/60 last:border-0">
                <td className="py-2.5 font-medium">{o.event}</td><td className="py-2.5 text-muted-foreground">{o.market}</td><td className="py-2.5">{o.selection}</td>
                <td className="py-2.5 num">{o.odds.toFixed(2)}</td><td className="py-2.5 num">{pct(o.implied)}</td><td className="py-2.5 num">{pct(o.modelProb)}</td>
                <td className={cn("py-2.5 num", o.ev >= 0 ? "text-success" : "text-destructive")}>{pct(o.ev)}</td><td className="py-2.5 num">{pct(o.confidence, 0)}</td>
              </tr>))}</tbody>
          </table></div>
        )}
      </Panel>
    </>
  );
}