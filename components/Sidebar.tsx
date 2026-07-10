"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { handleGlobalLogout } from "@/lib/auth/logout-helper";
import { useState, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { useLocalePath } from "@/hooks/useLocalePath";
import { api } from "@/lib/api/api-client";
import { useCanOrder } from "@/hooks/useCanOrder";

interface SidebarItem {
    label: string;
    url: string;
    code: string;
    is_visible: boolean;
    sort_order: number;
}

interface SidebarResponse {
    user_type: string;
    items: SidebarItem[];
}

// Cache key for the last-successful sidebar fetch. Bumped if response shape
// changes so stale caches are invalidated on deploy.
const SIDEBAR_CACHE_KEY = "sidebar_cache_v2";

// Module-level in-flight dedup + 10-minute TTL. Stops two concurrent Sidebar
// mounts (e.g. React StrictMode in dev, navigation race) from both firing a
// network call. Sidebar data rarely changes per session, so the TTL is long.
let _sidebarInflight: Promise<SidebarResponse | null> | null = null;
let _sidebarCache: { data: SidebarResponse; fetchedAt: number } | null = null;
const SIDEBAR_TTL_MS = 10 * 60 * 1000;

const Sidebar = () => {
    const pathname = usePathname();
    const { t } = useTranslation();
    const lp = useLocalePath();

    const { canOrder } = useCanOrder();

    const [sidebarData, setSidebarData] = useState<SidebarResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubAccountSession, setIsSubAccountSession] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setIsSubAccountSession(localStorage.getItem("isSubAccount") === "true");
        }
    }, [pathname]);

    // Read cached sidebar data after mount (must not run in useState initializer
    // — would cause a hydration mismatch since the server can't read localStorage).
    useEffect(() => {
        if (typeof window === "undefined") return;
        try {
            const cached = localStorage.getItem(SIDEBAR_CACHE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached) as SidebarResponse;
                if (parsed?.items?.length) {
                    setSidebarData(parsed);
                    setLoading(false); // skip skeleton — render cached items immediately
                }
            }
        } catch { /* ignore corrupt cache */ }
    }, []);

    // Ref guard prevents the second StrictMode (dev) effect run from re-firing.
    const didInitialFetch = useRef(false);
    useEffect(() => {
        if (didInitialFetch.current) return;
        didInitialFetch.current = true;
        let isMounted = true;

        const fetchSidebar = async () => {
            // 1. Use in-memory module cache when fresh (≤ 10 min)
            if (_sidebarCache && Date.now() - _sidebarCache.fetchedAt < SIDEBAR_TTL_MS) {
                if (isMounted) {
                    setSidebarData(_sidebarCache.data);
                    setError(null);
                    setLoading(false);
                }
                return;
            }
            // 2. Dedup concurrent fetches via shared in-flight promise
            try {
                setLoading((prev) => (sidebarData ? false : prev));
                if (!_sidebarInflight) {
                    _sidebarInflight = api.get("/kleverapi/account-sidebar")
                        .then((data: SidebarResponse) => {
                            _sidebarCache = { data, fetchedAt: Date.now() };
                            try {
                                localStorage.setItem(SIDEBAR_CACHE_KEY, JSON.stringify(data));
                            } catch { /* quota / private mode — non-fatal */ }
                            return data;
                        })
                        .finally(() => { _sidebarInflight = null; });
                }
                const data = await _sidebarInflight;
                if (isMounted && data) {
                    setSidebarData(data);
                    setError(null);
                }
            } catch (err: any) {
                console.error("[Sidebar] Fetch error:", err);
                if (isMounted && !sidebarData) {
                    setError(err.message || "Failed to load sidebar");
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchSidebar();
        return () => { isMounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Build a locale-prefixed internal path from a raw Magento sidebar URL.
    // We strip the store-code/locale prefix and .html suffix so the path passes
    // cleanly through the middleware (CMS_SLUG_TO_ROUTE + APP_ROUTES handle routing).
    const getInternalPath = (rawUrl: string) => {
        let href = rawUrl || "#";
        try {
            if (href.startsWith("http")) {
                const u = new URL(href);
                href = u.pathname + u.search;
            }
        } catch { }

        // Strip store-code prefix (e.g. /V101_en/) or locale prefix (e.g. /en/)
        href = href
            .replace(/^\/[A-Za-z0-9_]+_(en|ar)\//, "/")
            .replace(/^\/(en|ar)\//, "/");

        // Strip Magento .html SEO suffix — sidebar links are always internal routes
        href = href.replace(/\.html$/, "");
        href = href.replace(/\/$/, "");

        // Map Magento native routes to Next.js frontend routes
        if (href === "/customer/address" || href === "/customer/address-book") href = "/address-book";
        if (href === "/sales/order/history") href = "/my-orders";
        if (href === "/wishlist") href = "/wishlist";
        if (href === "/customer/account") href = "/my-account";
        if (href.includes("/mypayments") || href.includes("/mypayment") || href.includes("/payment/mypayments") || href.includes("/payment/history") || href.includes("/payment/history/")) href = "/customer/mypayments";
        // Order Attachments: Magento returns kleverapi/orderupload or customer/orderupload
        if (href.includes("/orderupload") || href.includes("/order-attachment")) href = "/customer/order-attachments";

        return lp(href);
    };

    const getTranslatedLabel = (item: SidebarItem) => {
        const code = (item.code || "").toLowerCase();
        const label = (item.label || "").toLowerCase();

        if (code === "my_account" || code === "account" || label === "my account" || label.startsWith("my account")) {
            return t("sidebar.myAccount") || item.label;
        }
        if (code === "my_statement" || code === "statement" || code === "mystatement" || label.includes("statement")) {
            return t("sidebar.myStatement") || item.label;
        }
        if (code === "my_payment" || code === "mypayment" || code === "mypayments" || code === "payments" || code === "payment" || label.includes("payment")) {
            return t("sidebar.myPayment") || item.label;
        }
        if (code === "manage_accounts" || label.includes("manage accounts") || label.includes("manage_accounts")) {
            return t("sidebar.manageAccounts") || item.label;
        }
        if (code === "my_orders" || code === "orders" || code === "history" || label.includes("orders")) {
            return t("sidebar.myOrders") || item.label;
        }
        if (code === "my_order_attachments" || code === "order_attachments" || code === "orderupload" || label.includes("attachment")) {
            return t("sidebar.myOrderAttachments") || item.label;
        }
        if (code === "favourite_products" || code === "favorite_products" || code === "favorites" || code === "wishlist" || label.includes("favorite") || label.includes("favourite")) {
            return t("sidebar.favoriteProducts") || item.label;
        }
        if (code === "address_book" || code === "address" || label.includes("address")) {
            return t("sidebar.addressBook") || item.label;
        }
        if (code === "dashboard" || label.includes("dashboard")) {
            return t("sidebar.dashboard") || item.label;
        }
        if (code === "my_forecast" || code === "forecast" || code === "viewforcast" || label.includes("forecast") || label.includes("forcast")) {
            return t("sidebar.myForecast") || item.label;
        }
        if (code === "notifications" || code === "usernotifications" || label.includes("notification")) {
            return t("sidebar.notifications") || item.label;
        }
        if (code === "sign_out" || code === "logout" || code === "customer_logout" || label.includes("sign out") || label.includes("logout")) {
            return t("nav.signOut") || item.label;
        }

        const key = `sidebar.${item.code}`;
        const translated = t(key);
        if (translated !== key) return translated;

        return item.label;
    };

    const visibleItems = useMemo(() => {
        if (!sidebarData?.items) return [];

        const seenCodes = new Set<string>();

        return sidebarData.items
            .filter((item) => {
                // 1. Check Magento's visibility flag
                if (!item.is_visible) return false;

                // 2. Deduplicate by code — API occasionally returns the same item twice
                if (seenCodes.has(item.code)) return false;
                seenCodes.add(item.code);

                // 3. Custom permission checks based on session or user type
                const itemCode = item.code.toLowerCase();

                // If logged in AS a sub-account, hide Management tools
                if (isSubAccountSession || sidebarData.user_type === "subaccount") {
                    if (itemCode === "manage_accounts" || itemCode === "subaccounts" || itemCode === "manage_subaccounts") {
                        return false;
                    }
                }

                // 4. Hide Quick Order when the user lacks ordering permission
                if (!canOrder) {
                    const urlLower = (item.url || "").toLowerCase();
                    const labelLower = (item.label || "").toLowerCase();
                    if (
                        itemCode.includes("quick") ||
                        urlLower.includes("quick-order") ||
                        urlLower.includes("quick_order") ||
                        labelLower.includes("quick order")
                    ) {
                        return false;
                    }
                }

                // 5. Always hide My Forecast — not shown on live Magento
                {
                    const urlLower = (item.url || "").toLowerCase();
                    const labelLower = (item.label || "").toLowerCase();
                    if (
                        itemCode === "my_forecast" ||
                        itemCode === "forecast" ||
                        itemCode === "viewforcast" ||
                        labelLower.includes("forecast") ||
                        labelLower.includes("forcast") ||
                        urlLower.includes("viewforcast") ||
                        urlLower.includes("forecast")
                    ) {
                        return false;
                    }
                }

                return true;
            })
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
            .map(item => ({
                ...item,
                internalUrl: getInternalPath(item.url)
            }));
    }, [sidebarData, lp, isSubAccountSession, canOrder]);

    // Active item detection
    const activeCode = useMemo(() => {
        // Strip store-code prefix (e.g. /V101_en/, /WJ01_ar/) and locale prefix (e.g. /en/)
        // so active-state detection is immune to store/locale changes.
        const stripPrefix = (p: string) =>
            p.replace(/^\/[A-Za-z0-9_]+_(en|ar)\//, "/").replace(/^\/(en|ar)\//, "/");

        const cleanPath = stripPrefix(pathname.replace(/\/$/, ""));

        // 1. Explicit hardcoded checks — order matters, most-specific first.
        if (cleanPath.includes("/order-attachment") || cleanPath.includes("/orderupload")) return "my_order_attachments";
        if (cleanPath.includes("/address")) return "address_book";

        // Match "My Orders" but NOT "My Order Attachments"
        if (
            (cleanPath.includes("/order") || cleanPath.includes("/my-orders") || cleanPath.includes("/sales/order")) &&
            !cleanPath.includes("orderupload") &&
            !cleanPath.includes("order-attachment")
        ) {
            return "my_orders";
        }

        if (cleanPath.includes("/statement")) return "statement";
        if (cleanPath.includes("/mypayments") || cleanPath.includes("/payment")) return "my_payment";
        if (cleanPath.includes("/favorite") || cleanPath.includes("/favourite") || cleanPath.includes("/wishlist")) return "favourite_products";
        // if (cleanPath.includes("/forecast") || cleanPath.includes("/forcast") || cleanPath.includes("/viewforcast")) return "my_forecast";
        if (cleanPath.includes("/dashboard")) return "dashboard";
        if (cleanPath.includes("/notification")) return "notifications";
        if (cleanPath.includes("/my-account") || cleanPath.includes("/customer/account")) return "my_account";

        // 2. Fallback: compare stripped paths for exact or prefix match.
        let bestCode = "";
        let bestMatchLength = -1;

        visibleItems.forEach((item) => {
            const isSignOut = item.code === "sign_out" || item.code === "logout" || item.code === "customer_logout";
            if (isSignOut) return;

            const itemPath = stripPrefix(item.internalUrl.split("?")[0].replace(/\/$/, ""));

            if (cleanPath === itemPath) {
                bestCode = item.code;
                bestMatchLength = 9999;
            } else if (
                itemPath !== "" &&
                cleanPath.startsWith(itemPath + "/") &&
                bestMatchLength < 9999 &&
                itemPath.length > bestMatchLength
            ) {
                bestCode = item.code;
                bestMatchLength = itemPath.length;
            }
        });
        return bestCode;
    }, [pathname, visibleItems]);

    if (loading) {
        return (
            <aside className="w-full lg:w-56 xl:w-64 flex-shrink-0 bg-surfaceMuted border-b lg:border-b-0 ltr:lg:border-r rtl:lg:border-l border-gray-200 z-30 sticky top-[56px] sm:top-[64px] lg:top-[108px] h-auto overflow-hidden">
                <nav className="p-0 lg:p-4">
                    <ul className="flex flex-row lg:flex-col space-y-0 lg:space-y-1">
                        {Array.from({ length: 7 }).map((_, i) => (
                            <li key={i} className="flex-shrink-0 px-6 lg:px-4 py-3">
                                <div className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: `${60 + (i % 3) * 20}%` }} />
                            </li>
                        ))}
                    </ul>
                </nav>
            </aside>
        );
    }

    if (error || !visibleItems.length) {
        return (
            <aside className="w-full lg:w-56 xl:w-64 flex-shrink-0 bg-surfaceMuted border-b lg:border-b-0 ltr:lg:border-r rtl:lg:border-l border-gray-200 z-30 sticky top-[56px] sm:top-[64px] lg:top-[108px] h-auto p-4">
                <p className="text-body text-black/50 italic text-center py-10">
                    {t("sidebar.error") || "Account menu currently unavailable."}
                </p>
            </aside>
        );
    }

    return (
        <aside className="w-full lg:w-56 xl:w-64 flex-shrink-0 bg-surfaceMuted border-b lg:border-b-0 ltr:lg:border-r rtl:lg:border-l border-gray-200 z-30 sticky top-[56px] sm:top-[64px] lg:top-[108px] h-auto overflow-x-auto lg:overflow-x-hidden lg:overflow-y-auto custom-scrollbar">
            <nav className="p-0 lg:p-4">
                <ul className="flex flex-row lg:flex-col space-y-0 lg:space-y-1 bg-[#f5f5f5]">
                    {visibleItems.map((item) => {
                        const isSignOut =
                            item.code === "sign_out" ||
                            item.code === "logout" ||
                            item.code === "customer_logout";

                        const isActive = item.code === activeCode;

                        if (isSignOut) {
                            return (
                                <li key={item.code} className="flex-shrink-0">
                                    <button
                                        onClick={() => handleGlobalLogout(lp("/login"))}
                                        className="block w-full ltr:text-left rtl:text-right py-3 px-6 lg:px-4 text-black/70 hover:text-black hover:bg-gray-100 transition-all duration-200 border-b-[3px] lg:border-b-0 ltr:lg:border-l-4 rtl:lg:border-r-4 border-transparent whitespace-nowrap font-bold uppercase text-body-sm"
                                    >
                                        {getTranslatedLabel(item)}
                                    </button>
                                </li>
                            );
                        }

                        return (
                            <li key={item.code} className="flex-shrink-0">
                                <Link
                                    href={item.internalUrl}
                                    className={`block py-3 px-6 lg:px-4 transition-all duration-200 whitespace-nowrap ltr:text-left rtl:text-right font-semibold uppercase text-body-sm ${isActive
                                        ? "text-black border-b-[3px] lg:border-b-0 ltr:lg:border-l-4 rtl:lg:border-r-4 border-primary"
                                        : "text-black/70 hover:text-black hover:bg-gray-100 border-b-[3px] lg:border-b-0 ltr:lg:border-l-4 rtl:lg:border-r-4 border-transparent"
                                        }`}
                                >
                                    {getTranslatedLabel(item)}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </aside>
    );
};

export default Sidebar;
