import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Database, Save, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Panel, Warning } from "@/components/app/ui-bits";
import { useI18n } from "@/lib/i18n";
import { pageHead } from "@/lib/seo";

type Preferences = { minimumSampleSize: number; minimumEv: number; alertsEnabled: boolean };
const DEFAULTS: Preferences = { minimumSampleSize: 200, minimumEv: 2, alertsEnabled: true };

export const Route = createFileRoute("/settings")({
  head: () => pageHead("Settings", "Local research preferences and integration status."),
  component: Page,
});

function Page() {
  const { t } = useI18n();
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("oi-preferences");
      if (raw) setPrefs({ ...DEFAULTS, ...JSON.parse(raw) as Partial<Preferences> });
    } catch {
      setPrefs(DEFAULTS);
    }
  }, []);

  const save = () => {
    window.localStorage.setItem("oi-preferences", JSON.stringify(prefs));
    setSaved(true);
  };

  return (
    <>
      <PageHeader title={t("الإعدادات", "Settings")} subtitle={t("تفضيلات التحليل المحلية وحالة البنية التحتية.", "Local analysis preferences and infrastructure status.")} />
      <Warning>{t("هذه التفضيلات تحفظ في هذا المتصفح فقط حالياً. لم يتم إعداد تسجيل الدخول أو مزامنة إعدادات المستخدم بين الأجهزة.", "These preferences are currently stored in this browser only. Authentication and cross-device preference sync are not configured.")}</Warning>
      <Panel title={t("حدود جودة الإشارة", "Signal quality thresholds")} className="mt-4" demo={false}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm"><span className="mb-2 block font-medium">{t("الحد الأدنى لحجم العينة", "Minimum sample size")}</span><Input type="number" min="1" max="100000" value={prefs.minimumSampleSize} onChange={(event) => { setPrefs((p) => ({ ...p, minimumSampleSize: Math.max(1, Number(event.target.value) || 1) })); setSaved(false); }} /><span className="mt-1 block text-xs text-muted-foreground">{t("الإشارات الأقل من هذا العدد توسم بأنها ضعيفة إحصائياً.", "Signals below this sample count are flagged as statistically weak.")}</span></label>
          <label className="block text-sm"><span className="mb-2 block font-medium">{t("الحد الأدنى للفارق المتوقع (%)", "Minimum estimated edge (%)")}</span><Input type="number" min="0" max="100" step="0.1" value={prefs.minimumEv} onChange={(event) => { setPrefs((p) => ({ ...p, minimumEv: Math.max(0, Number(event.target.value) || 0) })); setSaved(false); }} /><span className="mt-1 block text-xs text-muted-foreground">{t("عتبة فرز بحثية فقط، وليست توصية أو ضماناً.", "A research filter only, not a recommendation or guarantee.")}</span></label>
        </div>
        <label className="mt-4 flex items-center gap-3 text-sm"><input type="checkbox" checked={prefs.alertsEnabled} onChange={(event) => { setPrefs((p) => ({ ...p, alertsEnabled: event.target.checked })); setSaved(false); }} />{t("إظهار التنبيهات داخل الواجهة", "Show in-app alerts")}</label>
        <div className="mt-4 flex items-center gap-3"><Button onClick={save}><Save className="me-2 size-4" />{t("حفظ التفضيلات", "Save preferences")}</Button>{saved && <span className="text-xs text-success">{t("تم الحفظ على هذا الجهاز", "Saved on this device")}</span>}</div>
      </Panel>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Panel title={t("قاعدة البيانات", "Database")} demo={false}><div className="flex items-center gap-2 text-sm"><Database className="size-4 text-success" />{t("Supabase PostgreSQL مفعّل", "Supabase PostgreSQL enabled")}</div><p className="mt-2 text-xs text-muted-foreground">{t("الجداول وسياسات RLS موجودة. لم يتم إعداد تسجيل الدخول أو واجهة كتابة عامة.", "Tables and RLS policies exist. Authentication and public write access are not configured.")}</p></Panel>
        <Panel title={t("الأمان", "Security")} demo={false}><div className="flex items-center gap-2 text-sm"><ShieldCheck className="size-4 text-success" />{t("لا توجد مفاتيح سرية في الواجهة", "No secret keys in the frontend")}</div><p className="mt-2 text-xs text-muted-foreground">{t("يجب حفظ مفاتيح مزودي البيانات وTelegram في أسرار الخادم فقط.", "Provider and Telegram credentials must remain in server-side secrets only.")}</p></Panel>
      </div>
    </>
  );
}
