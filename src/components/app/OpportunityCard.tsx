import type { Opportunity } from "@/lib/demo-data";
import { MIN_RELIABLE_SAMPLE, pct } from "@/lib/odds";
import { useI18n } from "@/lib/i18n";
import { Progress } from "@/components/ui/progress";
import { DemoBadge, Warning, useFormatTime } from "./ui-bits";
import { cn } from "@/lib/utils";

export function OpportunityCard({ o }: { o: Opportunity }) {
  const { t } = useI18n();
  const fmt = useFormatTime();
  const lowSample = o.sampleSize < MIN_RELIABLE_SAMPLE;
  const cells: [string, string, string?][] = [
    [t("الاحتمالات المرصودة", "Observed odds"), o.odds.toFixed(2)],
    [t("احتمال النموذج", "Model probability"), pct(o.modelProb)],
    [t("الاحتمال الضمني", "Implied probability"), pct(o.implied)],
    [t("القيمة المتوقعة المقدّرة", "Estimated EV"), `${o.ev >= 0 ? "+" : ""}${pct(o.ev)}`, o.ev >= 0 ? "text-success" : "text-destructive"],
  ];
  return (
    <article className="surface flex flex-col gap-3 rounded-xl border border-border p-4">
      <header className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">{o.event}</div>
          <div className="text-xs text-muted-foreground">{o.market} · <span className="text-foreground">{o.selection}</span></div>
        </div>
        <DemoBadge />
      </header>
      <dl className="grid grid-cols-2 gap-2">
        {cells.map(([k, v, c]) => (
          <div key={k} className="rounded-lg bg-muted/50 p-2">
            <dt className="text-[11px] text-muted-foreground">{k}</dt>
            <dd className={cn("num text-base font-semibold", c)}>{v}</dd>
          </div>
        ))}
      </dl>
      <div>
        <div className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">{t("الثقة", "Confidence")}</span><span className="num">{pct(o.confidence, 0)}</span></div>
        <Progress value={o.confidence * 100} className="h-1.5" />
        <div className="mt-1 text-[11px] text-muted-foreground">{t("عدم اليقين", "Uncertainty")} ±<span className="num">{pct(o.uncertainty)}</span> · {t("حجم العينة", "Sample size")} <span className="num">{o.sampleSize}</span></div>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{t(o.explanationAr, o.explanationEn)}</p>
      {lowSample && <Warning>{t(`حجم العينة أقل من ${MIN_RELIABLE_SAMPLE} — الإشارة ضعيفة إحصائياً.`, `Sample below ${MIN_RELIABLE_SAMPLE} — statistically weak signal.`)}</Warning>}
      <Warning>{t("تقدير إحصائي وليس توقعاً مؤكداً. لا ضمان لأي ربح.", "Statistical estimate, not a certain prediction. No profit is guaranteed.")}</Warning>
      <footer className="flex justify-between text-[11px] text-muted-foreground"><span>{o.source}</span><span>{fmt(o.timestamp)}</span></footer>
    </article>
  );
}