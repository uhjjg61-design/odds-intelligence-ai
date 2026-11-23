import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "ar" | "en";
type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (ar: string, en: string) => string; dir: "rtl" | "ltr" };

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");
  useEffect(() => {
    const saved = window.localStorage.getItem("oi-lang");
    if (saved === "en" || saved === "ar") setLangState(saved);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    window.localStorage.setItem("oi-lang", l);
  }, []);
  const t = useCallback((ar: string, en: string) => (lang === "ar" ? ar : en), [lang]);
  return <I18nContext.Provider value={{ lang, setLang, t, dir: lang === "ar" ? "rtl" : "ltr" }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}