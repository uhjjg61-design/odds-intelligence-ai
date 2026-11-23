import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Activity, BarChart3, Bell, Brain, Database, Gauge, History, LayoutDashboard, Menu, Settings, ShieldCheck, Trophy, Languages,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { DemoBadge } from "./ui-bits";

const NAV = [
  { to: "/", ar: "نظرة عامة", en: "Overview", icon: LayoutDashboard },
  { to: "/live", ar: "المراقبة المباشرة", en: "Live Monitor", icon: Activity },
  { to: "/events", ar: "الرياضات والأحداث", en: "Sports & Events", icon: Trophy },
  { to: "/markets", ar: "الأسواق", en: "Markets", icon: BarChart3 },
  { to: "/analysis", ar: "تحليل الذكاء الاصطناعي", en: "AI Analysis", icon: Brain },
  { to: "/performance", ar: "الأداء التاريخي", en: "Historical Performance", icon: History },
  { to: "/alerts", ar: "التنبيهات", en: "Alerts", icon: Bell },
  { to: "/sources", ar: "مصادر البيانات", en: "Data Sources", icon: Database },
  { to: "/settings", ar: "الإعدادات", en: "Settings", icon: Settings },
] as const;

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ to, ar, en, icon: Icon }) => {
        const active = to === "/" ? path === "/" : path.startsWith(to);
        return (
          <Link key={to} to={to} onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"}`}>
            <Icon className={`size-4 ${active ? "text-primary" : ""}`} />
            {t(ar, en)}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2 px-2">
      <div className="grid size-8 place-items-center rounded-lg bg-primary/15 text-primary"><Gauge className="size-4" /></div>
      <div className="leading-tight">
        <div className="text-sm font-semibold">Odds Intelligence AI</div>
        <div className="text-[11px] text-muted-foreground">Analytics · Research</div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t, lang, setLang, dir } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 border-e border-sidebar-border bg-sidebar p-4 lg:flex">
        <Brand />
        <NavList />
        <div className="mt-auto rounded-lg border border-border p-3 text-xs text-muted-foreground">
          {t("منصة تحليل وبحث فقط. لا يتم وضع أي رهانات ولا نقل أموال.", "Analysis & research only. No bets are placed and no money is moved.")}
        </div>
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side={dir === "rtl" ? "right" : "left"} className="w-72 bg-sidebar p-4">
          <SheetTitle className="sr-only">{t("القائمة", "Menu")}</SheetTitle>
          <div className="mb-6"><Brand /></div>
          <NavList onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur md:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label={t("فتح القائمة", "Open menu")}><Menu /></Button>
          <div className="flex items-center gap-2 rounded-full border border-success/40 bg-success/10 px-3 py-1 text-xs font-medium text-success">
            <ShieldCheck className="size-3.5" />
            {t("تحليل فقط — لا يتم وضع رهانات", "Analysis only — no bets are placed")}
          </div>
          <DemoBadge className="hidden sm:inline-flex" />
          <div className="ms-auto">
            <Button variant="outline" size="sm" onClick={() => setLang(lang === "ar" ? "en" : "ar")}>
              <Languages /> {lang === "ar" ? "English" : "العربية"}
            </Button>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-6">{children}</main>
        <footer className="border-t border-border px-4 py-4 text-xs text-muted-foreground md:px-6">
          {t(
            "إشعار الاستخدام المسؤول: جميع المخرجات تقديرات إحصائية غير مؤكدة وليست نصيحة مالية أو ضماناً لأي ربح. ألعاب الحظ العشوائية (الروليت، Crash) غير قابلة للتنبؤ. إن كانت المراهنة تسبب لك ضرراً فاطلب المساعدة.",
            "Responsible-use notice: all outputs are uncertain statistical estimates, not financial advice or a guarantee of profit. RNG games (roulette, crash) are not predictable. If gambling is causing you harm, seek help.",
          )}
        </footer>
      </div>
    </div>
  );
}