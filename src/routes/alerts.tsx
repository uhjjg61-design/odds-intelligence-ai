import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { useI18n } from "@/lib/i18n";
import { PageHeader, EmptyState } from "@/components/app/ui-bits";

export const Route = createFileRoute("/alerts")({
  head: () => pageHead("Alerts", "Alerts (demo data)."),
  component: Page,
});

function Page() {
  const { t } = useI18n();
  return (
    <>
      <PageHeader title="Alerts" subtitle={t("قيد الإنشاء — بيانات تجريبية", "In progress — demo data")} />
      <EmptyState title={t("هذه الصفحة لم تكتمل بعد", "This page is not finished yet")} />
    </>
  );
}