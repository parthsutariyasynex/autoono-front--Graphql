import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { SESSION_COOKIE_NAME } from "./lib/auth/constants";

// ─── i18n config ────────────────────────────────────────────────────────────
const LOCALES = ["en", "ar"] as const;
type Locale = (typeof LOCALES)[number];
const DEFAULT_LOCALE: Locale = "en";
const LOCALE_COOKIE = "NEXT_LOCALE";
const STORE_CODE_COOKIE = "NEXT_STORE";
const MAGENTO_BASE = process.env.NEXT_PUBLIC_MAGENTO_BASE_URL || "https://autoono-demo.btire.com";

function isValidLocale(value: string): value is Locale {
    return LOCALES.includes(value as Locale);
}

// Store codes: V101_en, V102_ar, Anwar_en, etc.
const STORE_CODE_RE = /^[A-Za-z0-9_]+_(en|ar)$/;
function isStoreCode(value: string): boolean {
    return STORE_CODE_RE.test(value);
}

// ─── Route config ───────────────────────────────────────────────────────────
const APP_ROUTES = new Set([
    "login", "register", "forgot-password", "change-password",
    "products", "cart", "checkout", "favorites", "quick-order",
    "my-account", "my-orders", "customer", "subaccount",
    "multi-location-delivery", "popup-demo",
    "sales", "wishlist",
    "about", "locations", "branch-locations", "guides", "catalogue",
    "privacy-policy", "return-exchange-policy", "terms-conditions",
    "address-book",
]);

const PUBLIC_ROUTES = [
    "/login", "/register", "/forgot-password",
    "/about",
    "/locations", "/branch-locations", "/contact", "/contact-us", "/guides", "/catalogue",
    "/privacy-policy", "/return-exchange-policy", "/terms-conditions",
];

const SKIP_PATHS = ["/api", "/_next", "/favicon.ico", "/logo", "/images", "/locales", "/fonts"];

// ─── CMS slug → Next.js route map ───────────────────────────────────────────
// Checked right-to-left against URL segments before hitting GraphQL, so
// /en/customer/account/index → "index" miss, "account" → /my-account.
const CMS_SLUG_TO_ROUTE: Record<string, string> = {
    "about": "/about",
    "about-us": "/about",
    "locations": "/locations",
    "branch-locations": "/locations",
    "branches": "/locations",
    "our-branches": "/locations",
    "contact": "/locations",
    "contact-us": "/locations",
    "guides": "/guides",
    "user-guides": "/guides",
    "tyre-guides": "/guides",
    "catalogue": "/catalogue",
    "catalog": "/catalogue",
    "product-catalogue": "/catalogue",
    "product-catalog": "/catalogue",
    "privacy-policy": "/privacy-policy",
    "privacy": "/privacy-policy",
    "return-exchange-policy": "/return-exchange-policy",
    "returns-exchange": "/return-exchange-policy",
    "terms-conditions": "/terms-conditions",
    "terms": "/terms-conditions",
    "terms-of-service": "/terms-conditions",
    "mystatement": "/customer/statement",
    "my-statement": "/customer/statement",
    "statement": "/customer/statement",
    "customer-account": "/my-account",
    "account": "/my-account",
    "order-attachments": "/customer/order-attachments",
    "my-order-attachments": "/customer/order-attachments",
    "orderupload": "/customer/order-attachments",
    "notifications": "/customer/notifications",
    "my-notifications": "/customer/notifications",
    "usernotifications": "/customer/notifications",
    "address-book": "/customer/address-book",
    "favourite-products": "/favorites",
    "favorite-products": "/favorites",
    "favorites": "/favorites",
    "wishlist": "/favorites",
    "my-forecast": "/customer/forecast",
    "viewforcast": "/customer/forecast",
    "business-overview": "/customer/dashboard",
    "dashboard": "/customer/dashboard",
    "customertarget": "/customer/dashboard",
    "orders": "/my-orders",
    "sales": "/my-orders",
    "history": "/my-orders",
    "manage-accounts": "/customer/subaccounts/manage",
    "subaccounts": "/customer/subaccounts/manage",
    "manage": "/customer/subaccounts/manage",
};

// ─── URL resolution ──────────────────────────────────────────────────────────
type ResolvedUrl =
    | { kind: "category"; categoryId: string }
    | { kind: "cms"; nextjsPath: string }
    | { kind: "unknown" };

// Cache keyed by "storeCode:slugPath" so different stores resolve independently.
const urlResolutionCache = new Map<string, ResolvedUrl>();

const defaultLandingCache = new Map<string, { path: string; expires: number }>();
const LANDING_CACHE_TTL_MS = 60 * 60 * 1000;

async function getDefaultLandingPath(request: NextRequest, locale: string): Promise<string | null> {
    const cached = defaultLandingCache.get(locale);
    if (cached && cached.expires > Date.now()) return cached.path;

    try {
        const jwt = await getToken({
            req: request,
            secret: process.env.NEXTAUTH_SECRET,
            secureCookie: process.env.NODE_ENV === "production",
            cookieName: SESSION_COOKIE_NAME,
        });
        const accessToken = (jwt as any)?.accessToken;
        if (!accessToken) return null;

        const res = await fetch(`${MAGENTO_BASE}/rest/${locale}/V1/kleverapi/menu`, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`,
            },
            cache: "no-store",
        });
        if (!res.ok) return null;

        const items = await res.json();
        if (!Array.isArray(items)) return null;

        for (const item of items) {
            const url = item?.url || "";
            if (typeof url === "string" && url.endsWith(".html")) {
                try {
                    const parsed = new URL(url);
                    const path = parsed.pathname;
                    defaultLandingCache.set(locale, { path, expires: Date.now() + LANDING_CACHE_TTL_MS });
                    return path;
                } catch { /* ignore */ }
            }
        }
    } catch { /* fall through */ }

    return null;
}

// storeCode is passed as the Magento "Store" header so store-specific category
// URLs (e.g. V101_en/lubricants.html) resolve to the correct categoryId.
// Checks CMS_SLUG_TO_ROUTE right-to-left before hitting GraphQL.
async function resolveMagentoUrl(slugPath: string, storeCode: string): Promise<ResolvedUrl> {
    // Check CMS slug map right-to-left before any network call.
    // Only apply the redirect when the matched segment is either the LAST one
    // (e.g. /customer/account → /my-account) or followed only by Magento's
    // default-action segment ("index"). If the path continues with an internal
    // action like /edit, /new, /view, /<id>, etc., this is a real Next.js
    // route (e.g. /customer/account/edit, /customer/address-book/edit/123) and
    // must pass through to the actual page, NOT redirect via the CMS map.
    const bare = slugPath.replace(/\.html$/, "");
    const segs = bare.split("/").filter(Boolean);
    // Magento generates URLs as `module/controller/action`. When the action
    // and controller are both default-style segments, the route should still
    // resolve to the matched CMS slug. Accept these trailing patterns:
    //   • <empty>             — bare slug
    //   • ["index"]           — default action only
    //   • ["customer"]        — default controller only
    //   • ["customer","index"]— default controller + default action
    // Anything else (e.g. ["edit"], ["view", "123"]) is a real internal action
    // that must pass through to the Next.js route, NOT redirect via CMS map.
    const MAGENTO_DEFAULTS = new Set(["index", "customer"]);
    for (let i = segs.length - 1; i >= 0; i--) {
        const seg = segs[i].toLowerCase();
        if (CMS_SLUG_TO_ROUTE[seg]) {
            const afterSegs = segs.slice(i + 1).map(s => s.toLowerCase());
            const onlyMagentoDefaults = afterSegs.every(s => MAGENTO_DEFAULTS.has(s));
            if (afterSegs.length === 0 || onlyMagentoDefaults) {
                return { kind: "cms", nextjsPath: CMS_SLUG_TO_ROUTE[seg] };
            }
            // Matched a CMS slug but the path continues with an internal action
            // — stop trying earlier segments and fall through to GraphQL.
            break;
        }
    }

    const cacheKey = `${storeCode}:${slugPath}`;
    const cached = urlResolutionCache.get(cacheKey);
    if (cached) return cached;

    const queryUrl = slugPath.endsWith(".html") ? slugPath : `${slugPath}.html`;
    try {
        const res = await fetch(`${MAGENTO_BASE}/graphql`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Store": storeCode,
            },
            body: JSON.stringify({
                query: `{ urlResolver(url: "${queryUrl.replace(/"/g, '\\"')}") { type entity_uid } }`,
            }),
            cache: "no-store",
        });
        if (res.ok) {
            const data = await res.json();
            const r = data?.data?.urlResolver;
            if (r?.entity_uid) {
                if (r.type === "CATEGORY") {
                    let id = String(r.entity_uid);
                    if (!/^\d+$/.test(id)) {
                        try { id = Buffer.from(id, "base64").toString("utf-8"); } catch { }
                    }
                    if (/^\d+$/.test(id)) {
                        const result: ResolvedUrl = { kind: "category", categoryId: id };
                        urlResolutionCache.set(cacheKey, result);
                        return result;
                    }
                }
                if (r.type === "CMS_PAGE") {
                    // CMS pages don't map 1:1 to a Next.js route — treat as unknown
                    // so the caller's fallback logic applies (e.g. guardedRewrite(rawPath)).
                    // Previously this sent every CMS_PAGE hit to /products which was wrong.
                    const result: ResolvedUrl = { kind: "unknown" };
                    urlResolutionCache.set(cacheKey, result);
                    return result;
                }
            }
        }
    } catch { /* fall through */ }

    const fallback: ResolvedUrl = { kind: "unknown" };
    urlResolutionCache.set(cacheKey, fallback);
    return fallback;
}

async function checkAuth(request: NextRequest): Promise<boolean> {
    try {
        const token = await getToken({
            req: request,
            secret: process.env.NEXTAUTH_SECRET,
            secureCookie: process.env.NODE_ENV === "production",
            cookieName: SESSION_COOKIE_NAME,
        });
        if (!token?.accessToken) return false;
        // Reject if Magento token has already expired
        const exp = (token as any).magentoTokenExp;
        if (exp && typeof exp === "number" && exp * 1000 < Date.now()) return false;
        return true;
    } catch { }
    return false;
}

function withCookies(response: NextResponse, locale: string, storeCode?: string): NextResponse {
    response.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    if (storeCode) {
        response.cookies.set(STORE_CODE_COOKIE, storeCode, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    }
    return response;
}

// ─── Middleware ───────────────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // ── 1. Skip static assets; forward API routes with locale header ─────
    if (SKIP_PATHS.some((p) => pathname.startsWith(p))) {
        if (pathname.startsWith("/api")) {
            const clientLocale = request.headers.get("x-locale");
            const localeCookie = request.cookies.get(LOCALE_COOKIE)?.value;
            const locale = (clientLocale && isValidLocale(clientLocale))
                ? clientLocale
                : (localeCookie && isValidLocale(localeCookie))
                    ? localeCookie
                    : DEFAULT_LOCALE;
            const storeCode = request.cookies.get(STORE_CODE_COOKIE)?.value || "";
            const requestHeaders = new Headers(request.headers);
            requestHeaders.set("x-locale", locale);
            if (storeCode) requestHeaders.set("x-store-code", storeCode);
            return NextResponse.next({ request: { headers: requestHeaders } });
        }
        return NextResponse.next();
    }

    // ── Strip .html suffix → 301 redirect ───────────────────────────────
    if (pathname.endsWith(".html")) {
        const url = request.nextUrl.clone();
        url.pathname = pathname.slice(0, -5);
        return NextResponse.redirect(url, 301);
    }

    const segments = pathname.split("/").filter(Boolean);
    const firstSegment = segments[0];

    // ── 2a. Store-code prefix (/V101_en/..., /V102_ar/...) ──────────────
    // Mirrors the live Magento site URL. Browser URL is preserved while we
    // rewrite internally to the matching Next.js page.
    if (firstSegment && isStoreCode(firstSegment)) {
        const storeCode = firstSegment;
        const localeSuffix = storeCode.split("_").pop() || DEFAULT_LOCALE;
        const locale: Locale = isValidLocale(localeSuffix) ? localeSuffix : DEFAULT_LOCALE;

        const rawPath = "/" + segments.slice(1).join("/") || "/";
        const slugPath = rawPath.replace(/^\//, "");

        const requestHeaders = new Headers(request.headers);
        requestHeaders.set("x-locale", locale);
        requestHeaders.set("x-store-code", storeCode);

        const rewriteTo = (internalPath: string, extraParams?: Record<string, string>) => {
            const url = request.nextUrl.clone();
            url.pathname = internalPath;
            if (extraParams) Object.entries(extraParams).forEach(([k, v]) => url.searchParams.set(k, v));
            return withCookies(NextResponse.rewrite(url, { request: { headers: requestHeaders } }), locale, storeCode);
        };

        const guardedRewrite = async (internalPath: string, extraParams?: Record<string, string>) => {
            if (PUBLIC_ROUTES.some((r) => internalPath.startsWith(r))) return rewriteTo(internalPath, extraParams);
            const isAuthenticated = await checkAuth(request);
            if (!isAuthenticated) {
                const loginUrl = request.nextUrl.clone();
                loginUrl.pathname = `/${locale}/login`;
                loginUrl.search = "";
                loginUrl.searchParams.set("callbackUrl", `${pathname}${request.nextUrl.search}`);
                return withCookies(NextResponse.redirect(loginUrl), locale, storeCode);
            }
            return rewriteTo(internalPath, extraParams);
        };

        // Root store-code path → first Magento menu category
        if (!slugPath || slugPath === "/") {
            const isAuthenticated = await checkAuth(request);
            if (!isAuthenticated) {
                const loginUrl = request.nextUrl.clone();
                loginUrl.pathname = `/${locale}/login`;
                return withCookies(NextResponse.redirect(loginUrl), locale, storeCode);
            }
            const landing = await getDefaultLandingPath(request, locale);
            const redirectUrl = request.nextUrl.clone();
            redirectUrl.pathname = landing ?? `/${locale}/products`;
            return withCookies(NextResponse.redirect(redirectUrl), locale, storeCode);
        }

        // Known internal app route — but first check CMS map for multi-segment
        // Magento account paths like /customer/account → /my-account
        if (segments[1] && APP_ROUTES.has(segments[1])) {
            // Authenticated users on login → redirect server-side immediately
            if (rawPath === "/login") {
                const isAuthenticated = await checkAuth(request);
                if (isAuthenticated) {
                    const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");
                    const redirectUrl = request.nextUrl.clone();
                    redirectUrl.search = "";
                    redirectUrl.pathname = callbackUrl || `/${locale}/products`;
                    return withCookies(NextResponse.redirect(redirectUrl), locale, storeCode);
                }
            }
            if (segments.length > 2) {
                const cmsResolved = await resolveMagentoUrl(slugPath, storeCode);
                if (cmsResolved.kind === "cms") return guardedRewrite(cmsResolved.nextjsPath);
            }
            return guardedRewrite(rawPath);
        }

        // Resolve slug using this store's GraphQL urlResolver ("Store: V101_en")
        const resolved = await resolveMagentoUrl(slugPath, storeCode);
        if (resolved.kind === "category") return guardedRewrite("/products", { categoryId: resolved.categoryId });
        if (resolved.kind === "cms") return guardedRewrite(resolved.nextjsPath);

        // Fallback
        return guardedRewrite("/products");
    }

    // ── 2b. No locale prefix → redirect to /{locale}/... ────────────────
    if (!firstSegment || !isValidLocale(firstSegment)) {
        const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
        const localeToUse = (cookieLocale && isValidLocale(cookieLocale)) ? cookieLocale : DEFAULT_LOCALE;
        const url = request.nextUrl.clone();
        url.pathname = `/${localeToUse}${pathname === "/" ? "" : pathname}`;
        return withCookies(NextResponse.redirect(url), localeToUse);
    }

    // ── 3. Locale-prefixed URL (/en/..., /ar/...) ────────────────────────
    const locale = firstSegment as Locale;
    const restSegments = segments.slice(1);
    const pathnameWithoutLocale = "/" + restSegments.join("/") || "/";

    // Read active store code from cookie (saved when user last visited a store-code URL).
    // Falls back to locale ("en"/"ar") so the default Magento store is used.
    const activeStoreCode = request.cookies.get(STORE_CODE_COOKIE)?.value || locale;

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-locale", locale);
    requestHeaders.set("x-store-code", activeStoreCode);

    const rewriteTo = (internalPath: string, extraParams?: Record<string, string>) => {
        const url = request.nextUrl.clone();
        url.pathname = internalPath;
        if (extraParams) Object.entries(extraParams).forEach(([k, v]) => url.searchParams.set(k, v));
        return withCookies(NextResponse.rewrite(url, { request: { headers: requestHeaders } }), locale);
    };

    const guardedRewrite = async (internalPath: string, extraParams?: Record<string, string>) => {
        if (PUBLIC_ROUTES.some((r) => internalPath.startsWith(r))) return rewriteTo(internalPath, extraParams);
        const isAuthenticated = await checkAuth(request);
        if (!isAuthenticated) {
            const loginUrl = request.nextUrl.clone();
            loginUrl.pathname = `/${locale}/login`;
            loginUrl.search = "";
            loginUrl.searchParams.set("callbackUrl", `${pathname}${request.nextUrl.search}`);
            return withCookies(NextResponse.redirect(loginUrl), locale);
        }
        return rewriteTo(internalPath, extraParams);
    };

    // ── 3a. Root /{locale}/ → login or first Magento menu category ───────
    if (pathnameWithoutLocale === "/") {
        const isAuthenticated = await checkAuth(request);
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.search = "";
        if (!isAuthenticated) {
            redirectUrl.pathname = `/${locale}/login`;
        } else {
            const landing = await getDefaultLandingPath(request, locale);
            redirectUrl.pathname = landing ?? `/${locale}/products`;
        }
        return withCookies(NextResponse.redirect(redirectUrl), locale);
    }

    // ── 3b. Internal app routes (/en/products, /en/login, etc.) ─────────
    if (restSegments[0] && APP_ROUTES.has(restSegments[0])) {
        // Authenticated users on the login page → redirect server-side to avoid
        // the login form + products skeleton flash caused by client-side redirect.
        if (pathnameWithoutLocale === "/login") {
            const isAuthenticated = await checkAuth(request);
            if (isAuthenticated) {
                const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");
                const redirectUrl = request.nextUrl.clone();
                redirectUrl.search = "";
                redirectUrl.pathname = callbackUrl || `/${locale}/products`;
                return withCookies(NextResponse.redirect(redirectUrl), locale);
            }
        }
        return guardedRewrite(pathnameWithoutLocale);
    }

    // ── 3c. Magento SEO URL → resolve via GraphQL urlResolver ───────────
    // Uses the active store code from cookie so store-specific URLs resolve correctly.
    const slugPath = pathnameWithoutLocale.replace(/^\//, "");
    const resolved = await resolveMagentoUrl(slugPath, activeStoreCode);

    if (resolved.kind === "category") return guardedRewrite("/products", { categoryId: resolved.categoryId });
    if (resolved.kind === "cms") return guardedRewrite(resolved.nextjsPath);

    // ── 3d. Unknown slug — fall back to products page ───────────────────
    return guardedRewrite("/products");
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico|logo|images|fonts).*)",],
};
