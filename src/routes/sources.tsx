import { createFileRoute } from "@tanstack/react-router";
import { Database, ShieldCheck } from "lucide-react";
import { PageHeader, Panel, Stat, StatusDot, Warning } from "@/components/app/ui-bits";
import { dataSources } from "@/lib/demo-data";
import { useI18n } from "@/lib/i18n";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/sources")({
  head: () => pageHead("Data Sources", "Provider readiness and data provenance."),
  component: Page,
});

function Page() {
  const { t } = useI18n();
  const configured = dataSources.filter((source) => source.status === "operational").length;

  return (
    <>
      <PageHeader title={t("مصادر البيانات", "Data Sources")} subtitle={t("حالة التكاملات ومصدر البيانات وحداثتها.", "Integration readiness, data provenance and freshness.")} />
      <Warning>{t("لا يوجد مزود رياضي مباشر موصول حالياً. جميع أحداث وأسعار لوحة العرض الحالية بيانات اصطناعية ولا يجوز اعتبارها أسعاراً حقيقية.", "No live sports provider is connected. Events and odds shown elsewhere in the prototype are synthetic and must not be treated as real prices.")}</Warning>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat label={t("مصادر معرفة", "Sources listed")} value={dataSources.length} hint={t("في سجل العرض", "In the demo registry")} />
        <Stat label={t("اتصالات مباشرة", "Live connections")} value={configured} tone="warning" hint={t("لم يتم التحقق من أي مزود", "No provider has been verified")} />
        <Stat label={t("مصادر مرخصة/رسمية", "Licensed / official")} value={dataSources.filter((source) => source.kind !== "internal").length} />
      </div>
      <Panel title={t("سجل المزودين", "Provider registry")} className="mt-4">
        <div className="divide-y divide-border">
          {dataSources.map((source) => (
            <div key={source.id} className="flex flex-wrap items-center gap-3 py-4">
              <div className="grid size-10 place-items-center rounded-lg bg-muted"><Database className="size-4 text-muted-foreground" /></div>
              <div className="min-w-0 flex-1"><div className="font-medium">{source.name}</div><div className="mt-1 text-xs text-muted-foreground">{source.coverage} · {source.kind}</div></div>
              <StatusDot status={source.status} />
              <div className="w-full text-xs text-muted-foreground sm:w-auto">{t("آخر مزامنة", "Last sync")}: {source.lastSync ? new Date(source.lastSync).toLocaleString() : "—"}</div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title={t("متطلبات تفعيل مصدر حقيقي", "Requirements for a real data provider")} className="mt-4" demo={false}>
        <ol className="list-decimal space-y-2 ps-5 text-sm text-muted-foreground">
          <li>{t("اختيار مزود مرخص يغطي الرياضات والأسواق المطلوبة، ومراجعة شروط الاستخدام.", "Select a licensed provider covering the required sports and markets, and review its terms.")}</li>
          <li>{t("إنشاء مفتاح API خاص بالخادم فقط، وعدم وضعه في واجهة React أو مستودع GitHub.", "Create a server-only API key; never put it in React or the GitHub repository.")}</li>
          <li>{t("إعداد خدمة الجمع لتخزين المصدر والتوقيت واللقطات التاريخية وحدود الطلبات.", "Configure ingestion to retain source attribution, timestamps, historical snapshots and rate limits.")}</li>
          <li>{t("اختبار التغطية والتأخير ومطابقة النتائج قبل إظهار البيانات على أنها مباشرة.", "Validate coverage, latency and result reconciliation before labeling data as live.")}</li>
        </ol>
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4" />{t("قاعدة البيانات جاهزة لاستقبال البيانات عبر خدمة خادمية آمنة.", "The database schema is ready for ingestion through a secure server-side service.")}</div>
      </Panel>
    </>
  );
}
