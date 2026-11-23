import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Database, ShieldCheck } from "lucide-react";
import { sourcesQuery } from "@/lib/api";
import { PageHeader, Panel, Stat, StatusDot, Warning } from "@/components/app/ui-bits";
import { useI18n } from "@/lib/i18n";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/sources")({
  head: () => pageHead("Data Sources", "Provider readiness and data provenance."),
  loader: ({ context }) => context.queryClient.ensureQueryData(sourcesQuery),
  component: Page,
});

function Page() {
  const { t } = useI18n();
  const { data: dataSources } = useSuspenseQuery(sourcesQuery);
  const configured = dataSources.filter((source) => source.status === "operational").length;

  return (
    <>
      <PageHeader title={t("مصادر البيانات", "Data Sources")} subtitle={t("حالة التكاملات ومصدر البيانات وحداثتها من قاعدة البيانات.", "Integration readiness, provenance and freshness read from the database.")} />
      <Warning>{t("لا يوجد مزود رياضي مباشر موصول بعد. لا تعرض هذه اللوحة بيانات اصطناعية على أنها أسعار أو نتائج حقيقية.", "No live sports provider is connected yet. This dashboard does not label synthetic data as real prices or results.")}</Warning>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat label={t("مصادر معرفة", "Sources listed")} value={dataSources.length} hint={t("من سجل قاعدة البيانات", "From the database registry")} />
        <Stat label={t("اتصالات مباشرة", "Live connections")} value={configured} tone="warning" hint={t("مصادر تم التحقق من تشغيلها", "Providers verified operational")} />
        <Stat label={t("مصادر مرخصة/رسمية", "Licensed / official")} value={dataSources.filter((source) => source.kind !== "internal").length} />
      </div>
      <Panel title={t("سجل المزودين", "Provider registry")} className="mt-4">
        {dataSources.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("لا توجد مصادر مسجلة بعد.", "No data sources are registered yet.")}</p>
        ) : (
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
        )}
      </Panel>
      <Panel title={t("متطلبات تفعيل مصدر حقيقي", "Requirements for a real data provider")} className="mt-4" demo={false}>
        <ol className="list-decimal space-y-2 ps-5 text-sm text-muted-foreground">
          <li>{t("اختيار مزود مرخص يغطي الرياضات والأسواق المطلوبة، ومراجعة شروط الاستخدام.", "Select a licensed provider covering the required sports and markets, and review its terms.")}</li>
          <li>{t("إنشاء مفتاح API خاص بالخادم فقط، وعدم وضعه في واجهة React أو مستودع GitHub.", "Create a server-only API key; never put it in React or the GitHub repository.")}</li>
          <li>{t("إعداد خدمة الجمع لتخزين المصدر والتوقيت واللقطات التاريخية وحدود الطلبات.", "Configure ingestion to retain source attribution, timestamps, historical snapshots and rate limits.")}</li>
          <li>{t("اختبار التغطية والتأخير ومطابقة النتائج قبل إظهار البيانات على أنها مباشرة.", "Validate coverage, latency and result reconciliation before labeling data as live.")}</li>
        </ol>
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4" />{t("القراءة من قاعدة البيانات تستخدم مفتاح النشر العام مع سياسات RLS؛ المفاتيح السرية تبقى على الخادم.", "Database reads use the publishable key with RLS; secret keys stay server-side.")}</div>
      </Panel>
    </>
  );
}
