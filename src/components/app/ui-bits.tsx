import type { ReactNode } from "react";
import { AlertTriangle, FlaskConical, Inbox } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function DemoBadge({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning", className)}>
      <FlaskConical className="size-3" /> {t("بيانات تجريبية", "Demo data")}
    </span>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, children, className, demo = true, right }: { title?: string; children: ReactNode; className?: string; demo?: boolean; right?: ReactNode }) {
  return (
    <section className={cn("surface rounded-xl border border-border p-4", className)}>
      {(title || demo) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-sm font-semibold">{title}</h2>}
          <div className="flex items-center gap-2">{right}{demo && <DemoBadge />}</div>
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, tone = "default" }: { label: string; value: ReactNode; hint?: string; tone?: "default" | "success" | "warning" | "destructive" }) {
  const toneCls = { default: "text-foreground", success: "text-success", warning: "text-warning", destructive: "text-destructive" }[tone];
  return (
    <div className="surface rounded-xl border border-border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("num mt-1 text-2xl font-semibold", toneCls)}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function StatusDot({ status }: { status: "operational" | "degraded" | "not_configured" | "live" | "scheduled" | "finished" | "cancelled" | "postponed" }) {
  const { t } = useI18n();
  const map = {
    operational: ["bg-success", t("يعمل", "Operational")],
    degraded: ["bg-warning", t("متدهور", "Degraded")],
    not_configured: ["bg-muted-foreground", t("غير مُهيأ", "Not configured")],
    live: ["bg-destructive animate-pulse", t("جارٍ", "In play")],
    scheduled: ["bg-info", t("مجدول", "Scheduled")],
    finished: ["bg-muted-foreground", t("انتهى", "Finished")],
    cancelled: ["bg-muted-foreground", t("أُلغيت", "Cancelled")],
    postponed: ["bg-warning", t("مؤجلة", "Postponed")],
  } as const;
  const [c, label] = map[status];
  return <span className="inline-flex items-center gap-1.5 text-xs"><span className={cn("size-2 rounded-full", c)} />{label}</span>;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-10 text-center">
      <Inbox className="size-6 text-muted-foreground" />
      <div className="text-sm font-medium">{title}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function Warning({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-2 text-xs text-warning">
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> <span>{children}</span>
    </div>
  );
}

export function useFormatTime() {
  const { lang } = useI18n();
  return (iso: string) =>
    new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(iso)) + " UTC";
}