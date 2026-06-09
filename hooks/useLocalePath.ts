"use client";

import { useCallback } from "react";
import { useLocale } from "../lib/i18n/client";
import { usePathname } from "next/navigation";
import { isValidLocale } from "../lib/i18n/config";

const STORE_CODE_RE = /^[A-Za-z0-9_]+_(en|ar)$/;

/**
 * Returns a function that prefixes any path with the current store code or locale.
 * Store code is read from the URL path prefix (e.g. /V101_en/...) — not a query param.
 * Prevents double prefixing by stripping any existing locale/store prefix first.
 */
export function useLocalePath() {
  const locale = useLocale();
  const pathname = usePathname();

  // Read store code from path prefix (e.g. /V101_en/products → "V101_en")
  const firstSeg = (pathname || "").split("/").filter(Boolean)[0] || "";
  const currentStore = STORE_CODE_RE.test(firstSeg) ? firstSeg : "";

  return useCallback((path: string): string => {
    if (!path || path === "#") return path;

    // Extract path and query string
    const [pathPart, queryPart] = path.split("?");
    const qs = queryPart ? `?${queryPart}` : "";

    // Strip any existing locale or store-code prefix
    const segs = (pathPart || "").split("/").filter(Boolean);
    const first = segs[0] || "";
    let cleanPath: string;
    if (isValidLocale(first) || STORE_CODE_RE.test(first)) {
      cleanPath = "/" + segs.slice(1).join("/") || "/";
    } else {
      cleanPath = pathPart || "/";
    }
    if (!cleanPath.startsWith("/")) cleanPath = "/" + cleanPath;

    // Store code from path prefix takes priority over plain locale
    const prefix = currentStore || locale;

    if (cleanPath === "/") return `/${prefix}${qs}`;
    return `/${prefix}${cleanPath}${qs}`;
  }, [locale, currentStore]);
}
