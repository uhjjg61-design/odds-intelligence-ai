import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { backtest, metrics } from "@/lib/demo-data";
import { useI18n } from "@/lib/i18n";
import { pageHead } from "@/lib/seo";
import { pct } from "@/lib/odds";
import { PageHeader, Panel, Stat, Warning } from "@/components/app/ui-bits";
import { BacktestChart, CalibrationChart, DrawdownChart } from "@/components/app/charts";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export const Route = createFileRoute("/performance")({
  head: () => pageHead("Historical Performance", "Transparent model metrics: Brier score, log loss, calibration and paper-trading backtests (demo data)."),
  component: Performance,
});

const WINDOWS = { "4": 4, "12": 12, "26": 26, "52": 52 } as const;

function Performance() {
  const { t } = useI18n();
  const [w, setW] = useState<keyof typeof WINDOWS>("52");
  const data = backtest.slice(-WINDOWS[w]);
  const first = data[0]?.bankroll ?? 100, last = data.at(-1)?.bankroll ?? 100;
  const roi = (last - first) / first;
  const dd = Math.min(...data.map((d) => d.drawdown)) / 100;
  return (
    <>
      <PageHeader title={t("الأداء التاريخي", "Historical Performance")}
        subtitle={t("محاكاة تداول ورقي فقط — لا أموال حقيقية. الأداء السابق لا يضمن نتائج مستقبلية.", "Paper-trading simulation only — no real money. Past performance does not guarantee future results.")}
        actions={<ToggleGroup type="single" value={w} onValueChange={(v) => v && setW(v as typeof w)} variant="outline" size="sm">
          {Object.keys(WINDOWS).map((k) => <ToggleGroupItem key={k} value={k}>{k}{t("أ", "w")}</ToggleGroupItem>)}
        </ToggleGroup>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat label="Brier score" value={metrics.brier.toFixed(4)} hint={t("الأقل أفضل", "Lower is better")} />
        <Stat label="Log loss" value={metrics.logLoss.toFixed(4)} hint={t("الأقل أفضل", "Lower is better")} />
        <Stat label="ECE" value={metrics.ece.toFixed(3)} hint={t("خطأ المعايرة", "Calibration error")} />
        <Stat label={t("عائد محاكى", "Simulated ROI")} value={`${roi >= 0 ? "+" : ""}${pct(roi)}`} tone={roi >= 0 ? "success" : "destructive"} hint={t("ورقي", "Paper")} />
        <Stat label={t("أقصى تراجع", "Max drawdown")} value={pct(dd)} tone="destructive" />
        <Stat label={t("عدد التوقعات", "Predictions")} value={metrics.predictions.toLocaleString()} />
      </div>
      <div className="mt-4"><Warning>{t("نتائج مصطنعة لأغراض العرض. لم يتم التحقق منها على بيانات حقيقية.", "Synthetic results for demonstration. Not validated on real data.")}</Warning></div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title={t(`منحنى الرصيد الورقي (${w} أسبوع)`, `Paper bankroll curve (${w} weeks)`)}><BacktestChart data={data} label={t("الرصيد", "Bankroll")} /></Panel>
        <Panel title={t("المعايرة", "Calibration")}><CalibrationChart labels={{ predicted: t("مثالي", "Perfect"), observed: t("ملاحظ", "Observed") }} /></Panel>
        <Panel title={t("محاكاة التراجع", "Drawdown simulation")} className="lg:col-span-2"><DrawdownChart data={data} label={t("التراجع", "Drawdown")} /></Panel>
      </div>
      <Panel title={t("ملاحظة حول ألعاب الحظ العشوائية", "Note on RNG games")} className="mt-4" demo={false}>
        <p className="text-sm text-muted-foreground">{t("ألعاب مثل الروليت وCrash تعتمد على مولدات أرقام عشوائية ولا يمكن التنبؤ بها. أي دعم مستقبلي سيقتصر على نسبة العائد النظرية (RTP) والتوزيع الإحصائي ورصد الشذوذ.", "Games like roulette and crash use random number generators and cannot be predicted. Any future support will be limited to theoretical RTP, statistical distributions and anomaly monitoring.")}</p>
      </Panel>
    </>
  );
}