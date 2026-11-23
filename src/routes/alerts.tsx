import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bell, CheckCheck, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, Warning, useFormatTime } from "@/components/app/ui-bits";
import { alerts as demoAlerts } from "@/lib/demo-data";
import { useI18n } from "@/lib/i18n";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/alerts")({
  head: () => pageHead("Alerts", "Research signal and data quality notifications."),
  component: Page,
});

function Page() {
  const { t, lang } = useI18n();
  const formatTime = useFormatTime();
  const [items, setItems] = useState(demoAlerts);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const visible = useMemo(() => items.filter((item) => filter === "all" || !item.read), [items, filter]);
  const unread = items.filter((item) => !item.read).length;

  return (
    <>
      <PageHeader
        title={t("التنبيهات", "Alerts")}
        subtitle={t("إشارات بحثية وتنبيهات جودة البيانات. عناصر هذه الصفحة تجريبية ومحلية.", "Research signals and data-quality notices. Items on this page are local demo records.")}
        actions={<Button variant="outline" size="sm" onClick={() => setItems((current) => current.map((item) => ({ ...item, read: true })))} disabled={!unread}><CheckCheck className="me-2 size-4" />{t("تحديد الكل كمقروء", "Mark all read")}</Button>}
      />
      <Warning>{t("هذه التنبيهات ليست مرتبطة حالياً بمصدر رياضي مباشر أو بإشعارات Telegram. تغيير حالة القراءة يعمل داخل هذه الجلسة فقط.", "Alerts are not yet connected to a live sports feed or Telegram. Read-state changes are limited to this browser session.")}</Warning>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Panel demo={false}><div className="text-xs text-muted-foreground">{t("إجمالي التنبيهات", "Total alerts")}</div><div className="num mt-1 text-2xl font-semibold">{items.length}</div></Panel>
        <Panel demo={false}><div className="text-xs text-muted-foreground">{t("غير مقروء", "Unread")}</div><div className="num mt-1 text-2xl font-semibold">{unread}</div></Panel>
        <Panel demo={false}><div className="text-xs text-muted-foreground">{t("إشارات مرشحة", "Candidate signals")}</div><div className="num mt-1 text-2xl font-semibold">{items.filter((item) => item.level === "signal").length}</div></Panel>
      </div>
      <Panel className="mt-4" title={t("سجل التنبيهات", "Alert log")} right={<div className="flex gap-1"><Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>{t("الكل", "All")}</Button><Button size="sm" variant={filter === "unread" ? "default" : "outline"} onClick={() => setFilter("unread")}>{t("غير مقروء", "Unread")}</Button></div>}>
        {visible.length ? <div className="divide-y divide-border">{visible.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center gap-3 py-3">
            <span className={`grid size-9 shrink-0 place-items-center rounded-full ${item.level === "warning" ? "bg-warning/10 text-warning" : item.level === "signal" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}><Bell className="size-4" /></span>
            <div className="min-w-0 flex-1"><div className="text-sm font-medium">{lang === "ar" ? item.titleAr : item.titleEn}</div><div className="mt-1 text-xs text-muted-foreground">{formatTime(item.at)} · {item.level}</div></div>
            {!item.read && <span className="size-2 rounded-full bg-primary" aria-label={t("غير مقروء", "Unread")} />}
            <Button size="sm" variant="ghost" disabled={item.read} onClick={() => setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, read: true } : entry))}>{t("قراءة", "Read")}</Button>
          </div>
        ))}</div> : <div className="py-8 text-center text-sm text-muted-foreground">{t("لا توجد تنبيهات في هذا العرض.", "No alerts in this view.")}</div>}
      </Panel>
    </>
  );
}
