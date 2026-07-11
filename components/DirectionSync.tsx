"use client";

import { useEffect, useCallback } from "react";

/**
 * Syncs <html dir="..." lang="..."> on every locale change.
 *
 * Two triggers:
 * 1. "locale-changed" custom event (fired by LanguageSwitcher — instant)
 * 2. URL check on mount and popstate (browser back/forward)
 *
 * Does NOT use useLocale() because that hook can return stale values
 * during middleware rewrite transitions.
 */
export default function DirectionSync() {

  const applyDirection = useCallback((locale: string) => {
    const dir = locale === "ar" ? "rtl" : "ltr";
    document.documentElement.dir = dir;
    document.documentElement.lang = locale;
  }, []);

  const getLocaleFromUrl = useCallback(() => {
    return window.location.pathname.startsWith("/ar") ? "ar" : "en";
  }, []);

  // 1. On mount — set direction from current URL
  useEffect(() => {
    applyDirection(getLocaleFromUrl());
  }, [applyDirection, getLocaleFromUrl]);

  // 2. Listen for LanguageSwitcher "locale-changed" event (instant, no delay)
  useEffect(() => {
    const handleLocaleChanged = (e: Event) => {
      const locale = (e as CustomEvent).detail;
      if (locale === "ar" || locale === "en") {
        applyDirection(locale);
      }
    };
    window.addEventListener("locale-changed", handleLocaleChanged);
    return () => window.removeEventListener("locale-changed", handleLocaleChanged);
  }, [applyDirection]);

  // 3. Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      applyDirection(getLocaleFromUrl());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [applyDirection, getLocaleFromUrl]);

  return null;
}
