
"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { handleGlobalLogout } from "@/lib/auth/logout-helper";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store/store";
import { useState, useRef, useEffect } from "react";
import {
  ShoppingCart,
  UserCircle,
  Bell,
  Menu,
  X,
  LogOut,
  Search,
  ChevronDown,
} from "lucide-react";

import dynamic from "next/dynamic";
const CartDrawer = dynamic(() => import("./CartDrawer"), { ssr: false });
const NotificationDrawer = dynamic(() => import("./NotificationDrawer"), { ssr: false });
const SearchPopup = dynamic(() => import("./SearchPopup"), { ssr: false });

import { useCart } from "@/modules/cart/hooks/useCart";
import { useNotifications } from "@/modules/notifications/hooks/useNotifications";
import { fetchCustomerInfo } from "@/store/actions/customerActions";

import { useTranslation } from "@/hooks/useTranslation";
import { useLocalePath } from "@/hooks/useLocalePath";
import { isValidLocale } from "@/lib/i18n/config";
import { setLocaleCookie } from "@/lib/i18n/client";
import { getAuthToken } from "@/lib/api/api-client";

interface NavLink {
  label: string;
  href: string;
  code?: string;
  magentoUrl?: string;
  categoryId?: string | null;
  children?: { label: string; href: string }[];
}

// Module-level menu fetch deduplicator — keyed by locale.
// Prevents StrictMode double-mount from firing two simultaneous /api/kleverapi/menu requests.
const _menuInflight = new Map<string, Promise<any>>();

// source-permission: inflight dedup + 5-minute result cache, keyed by locale.
// The effect depends on [isAuthenticated, locale] — both can change on first mount,
// causing two rapid re-runs. Without dedup the same fetch fires twice back-to-back.
const _sourcePermInflight = new Map<string, Promise<any>>();
const _sourcePermCache = new Map<string, { data: any; fetchedAt: number }>();
const SOURCE_PERM_TTL = 5 * 60 * 1000; // 5 minutes

// available-stores: inflight dedup + 10-minute cache (changes rarely — admin config).
// Used when has_restrictions=false (customer can see all stores).
const _availStoresInflight = new Map<string, Promise<any[]>>();
const _availStoresCache = new Map<string, { data: any[]; fetchedAt: number }>();
const AVAIL_STORES_TTL = 10 * 60 * 1000; // 10 minutes

// Any nav item that has a categoryId shows the warehouse dropdown on hover.
function isWarehouseCategory(item: { label?: string; categoryId?: string | null }): boolean {
  const label = (item.label || "").toLowerCase();
  // Show warehouse dropdown for items with categoryId OR specific keywords
  return !!item.categoryId || label.includes("lubricant") || label.includes("tyre");
}

// Warehouse item shape — populated dynamically from /api/kleverapi/source-permission
interface WarehouseItem { label: string; code: string; storeUrl: string; name: string; }

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, isRtl, i18n } = useTranslation();
  const locale = i18n.language;
  const lp = useLocalePath();

  // Store code lives in the URL path prefix (e.g. /V101_en/all-tyres) — not a query param.
  // Fall back to ?store= query param, then NEXT_STORE cookie (set by middleware on
  // every warehouse page visit) so the store code is detected even when usePathname()
  // returns the rewritten internal path (e.g. /products instead of /V102_en/lubricants).
  const STORE_CODE_RE = /^[A-Za-z0-9_]+_(en|ar)$/;
  const pathnameFirstSeg = pathname?.split("/").filter(Boolean)[0] || "";
  // Read cookie post-mount only — reading document.cookie during render produces
  // different output on server vs client and causes a hydration mismatch.
  const [storeCookie, setStoreCookie] = useState("");
  useEffect(() => {
    setStoreCookie(document.cookie.match(/NEXT_STORE=([^;]+)/)?.[1] || "");
  }, [pathname]);
  const currentStore = (STORE_CODE_RE.test(pathnameFirstSeg) || isValidLocale(pathnameFirstSeg))
    ? pathnameFirstSeg
    : (searchParams?.get("store") || (STORE_CODE_RE.test(storeCookie) ? storeCookie : "") || "");

  // Strip locale or store-code prefix from a path for prefix-agnostic comparison.
  const stripPrefix = (path: string) => {
    const segs = (path || "").split("/").filter(Boolean);
    const first = segs[0] || "";
    if (isValidLocale(first) || STORE_CODE_RE.test(first)) return "/" + segs.slice(1).join("/") || "/";
    return path || "/";
  };

  // Extract the relative path from a full store_url (e.g. https://domain.com/V101_en/all-tyres.html → /V101_en/all-tyres.html)
  const getStoreUrlPath = (storeUrl: string): string => {
    try {
      return new URL(storeUrl).pathname;
    } catch {
      return storeUrl;
    }
  };
  const isAuthenticated = status === "authenticated";
  const { cart, refetchCart } = useCart();
  const [navLinks, setNavLinks] = useState<NavLink[]>([]);
  const [navLoading, setNavLoading] = useState(true);
  const [warehouseItems, setWarehouseItems] = useState<WarehouseItem[]>([]);
  const [allPermittedStores, setAllPermittedStores] = useState<any[]>([]);
  const [storeDropOpen, setStoreDropOpen] = useState(false);
  const storeDropRef = useRef<HTMLDivElement>(null);
  const [openWarehouseMenu, setOpenWarehouseMenu] = useState<string | null>(null);
  const warehouseNavRef = useRef<HTMLElement>(null);

  const { data: customerData } = useSelector((state: RootState) => state.customer);
  const dispatch = useDispatch();

  const isLoadingName = isAuthenticated && !customerData;
  const displayUser = isLoadingName
    ? ""
    : (customerData as any)?.firstname
      ? `${(customerData as any).firstname} ${(customerData as any).lastname || ""}`.trim()
      : session?.user?.name || session?.user?.email;


  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // Which mobile-drawer nav accordion is expanded (e.g. "ALL LUBRICANTS").
  // null = all collapsed. Single-open accordion keyed by item.href.
  const [mobileOpenMenu, setMobileOpenMenu] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  // Mount drawers only after first open so their JS chunks aren't downloaded on initial page load.
  const [cartMounted, setCartMounted] = useState(false);
  const [notifMounted, setNotifMounted] = useState(false);
  const [searchMounted, setSearchMounted] = useState(false);
  const [storeName, setStoreName] = useState<string>("");


  const [subAccountName, setSubAccountName] = useState<string | null>(null);
  const [isSubAccount, setIsSubAccount] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { unreadCount, fetchNotifications: pullNotifications } = useNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const logoutCalledRef = useRef(false);

  const cartCount = cart?.items_count || 0;

  const handleLogout = async () => {
    await handleGlobalLogout(lp("/login"));
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSubAccountName(localStorage.getItem("subAccountName"));
      setIsSubAccount(localStorage.getItem("isSubAccount") === "true");
    }
  }, [pathname]);

  useEffect(() => {
    if (status === "authenticated") {
      const sess = session as any;
      if (sess?.error === "MagentoTokenExpired" && !logoutCalledRef.current) {
        logoutCalledRef.current = true;
        handleLogout();
      }
    }
    // Reset guard when session becomes valid again (fresh login)
    if (status !== "authenticated") {
      logoutCalledRef.current = false;
    }
  }, [status, session]);

  useEffect(() => {
    if (!isAuthenticated) return;
    // Defer so the products fetch (critical path) gets a head start on the
    // available Magento server connections before non-visible badge data lands.
    const id = setTimeout(() => pullNotifications(), 500);
    return () => clearTimeout(id);
  }, [isAuthenticated, pullNotifications]);

  useEffect(() => {
    if (!isAuthenticated || customerData) return;
    // Defer slightly — the username display can wait a moment while products load.
    const id = setTimeout(() => dispatch(fetchCustomerInfo() as any), 300);
    return () => clearTimeout(id);
  }, [isAuthenticated, customerData, dispatch]);

  useEffect(() => {
    const fn = () => pullNotifications();
    window.addEventListener("notifications-updated", fn);
    return () => window.removeEventListener("notifications-updated", fn);
  }, [pullNotifications]);

  useEffect(() => {
    const fn = () => refetchCart();
    window.addEventListener("cart-updated", fn);
    return () => window.removeEventListener("cart-updated", fn);
  }, [refetchCart]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setIsProfileOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (storeDropRef.current && !storeDropRef.current.contains(e.target as Node))
        setStoreDropOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close the warehouse / nav-category dropdown when tapping outside.
  // Touch devices don't fire onMouseLeave, so the hover-based close wasn't
  // reliable on tablets — this gives tap users a way to dismiss the menu.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (warehouseNavRef.current && !warehouseNavRef.current.contains(e.target as Node))
        setOpenWarehouseMenu(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Update document title and sync storeName state
  useEffect(() => {
    const found = warehouseItems.find(w => w.code === currentStore);
    // Strictly use found.name (Store Name e.g. "Arabic") as primary
    const displayName = found ? (found.name || found.label) : (typeof sessionStorage !== "undefined" ? sessionStorage.getItem(`storeName_${currentStore}`) : null) || currentStore;
    setStoreName(displayName);

    if (displayName && displayName !== currentStore) {
      document.title = `AutoOno - ${displayName}`;
    }

    // Pre-cache all names to ensure they are ready when clicking/navigating
    if (warehouseItems.length > 0 && typeof sessionStorage !== "undefined") {
      warehouseItems.forEach(w => {
        sessionStorage.setItem(`storeName_${w.code}`, w.name || w.label);
      });
    }
  }, [currentStore, warehouseItems]);

  // Fetch dynamic menu from API (re-fetches when locale changes)
  useEffect(() => {
    let cancelled = false;

    const CACHE_KEY = `navmenu_${locale}`;
    const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 h

    const toLinks = (raw: any[]): NavLink[] =>
      raw.map((item: any) => ({
        label: item.label,
        href: item.href,
        code: item.code,
        magentoUrl: item.magentoUrl,
        categoryId: item.categoryId ?? null,
        children: item.children && item.children.length > 0 ? item.children : undefined,
      }));

    const applyLinks = (links: NavLink[]) => {
      setNavLinks(links);
      const firstCat = links.find((l) => l.categoryId);
      if (firstCat?.categoryId && typeof sessionStorage !== "undefined") {
        sessionStorage.setItem("defaultCategoryId", firstCat.categoryId);
      }
    };

    const readLocalCache = (): NavLink[] | null => {
      try {
        const raw = typeof window !== "undefined" ? localStorage.getItem(CACHE_KEY) : null;
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed.expires > Date.now() && Array.isArray(parsed.items) && parsed.items.length > 0)
          return parsed.items;
      } catch { }
      return null;
    };

    const fetchMenu = async () => {
      // Immediately show cached data so menu appears before API responds
      const localCached = readLocalCache();
      if (localCached) {
        applyLinks(localCached);
        setNavLoading(false);
      } else {
        setNavLoading(true);
      }

      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

        let menuPromise = _menuInflight.get(locale);
        if (!menuPromise) {
          menuPromise = fetch("/api/kleverapi/menu", {
            headers: {
              "Content-Type": "application/json",
              ...(token && { "Authorization": `Bearer ${token}` }),
              "x-locale": locale,
            },
          })
            .then(r => r.json())
            .catch(err => {
              console.error("[Navbar] Menu fetch network error:", err);
              return null;
            })
            .finally(() => _menuInflight.delete(locale));
          _menuInflight.set(locale, menuPromise);
        }

        const data = await menuPromise;
        if (cancelled) return;

        if (!data || data.message) {
          throw new Error("Menu fetch failed");
        }

        const fallbackLinks: NavLink[] = [
          { label: t("nav.allLubricants") || "All Lubricants", href: lp("/lubricants") },
          { label: t("nav.aboutUs") || "About Us", href: lp("/about") },
          { label: t("nav.branchLocations") || "Branch Locations", href: lp("/locations") },
        ];

        if (Array.isArray(data) && data.length > 0) {
          const links = toLinks(data);
          applyLinks(links);
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ items: links, expires: Date.now() + CACHE_TTL }));
          } catch { }
        } else if (!localCached) {
          applyLinks(fallbackLinks);
        }
      } catch (err) {
        console.error("[Navbar] Menu fetch error:", err);
        const fallbackLinks: NavLink[] = [
          { label: t("nav.allLubricants") || "All Lubricants", href: lp("/lubricants") },
          { label: t("nav.aboutUs") || "About Us", href: lp("/about") },
          { label: t("nav.branchLocations") || "Branch Locations", href: lp("/locations") },
        ];
        if (!cancelled && !localCached) applyLinks(fallbackLinks);
      } finally {
        if (!cancelled) setNavLoading(false);
      }
    };

    fetchMenu();


    return () => { cancelled = true; };
  }, [locale]);

  // Fetch warehouse list for the "All Lubricants"/"All Tyres" dropdown.
  // Matches the live Magento site — enabled/disabled by admin via source-permission.
  useEffect(() => {
    if (!isAuthenticated) {
      setWarehouseItems([]);
      setAllPermittedStores([]);
      // Clear cache on sign-out so the next user gets fresh data
      _sourcePermCache.clear();
      _sourcePermInflight.clear();
      _availStoresCache.clear();
      _availStoresInflight.clear();
      return;
    }
    let cancelled = false;

    const applySourcePerm = (data: any) => {
      if (cancelled) return;
      if (process.env.NODE_ENV !== "production") {
        console.log("[Navbar] source-permission raw response:", data);
      }
      const raw: any[] = Array.isArray(data?.permitted_stores)
        ? data.permitted_stores
        : (Array.isArray(data) ? data : []);

      setAllPermittedStores(raw);

      const filtered = raw.filter((s) =>
        s?.is_active !== false &&
        (String(s.store_code).endsWith(`_${locale}`) || String(s.store_code) === locale)
      );

      const mapped: WarehouseItem[] = filtered.map((s) => {
        const storeCode = String(s.store_code ?? "");
        // Dropdown label: group_name → store_name → website_name → store_code
        // Never filter out a store just because admin left group_name/store_name blank.
        const label = String(s.group_name || s.store_name || s.website_name || storeCode);
        return {
          label,
          code: storeCode,
          storeUrl: String(s.store_url ?? ""),
          name: String(s.store_name || s.group_name || storeCode),
        };
      }).filter((w) => !!w.code);

      setWarehouseItems(mapped);
    };

    (async () => {
      try {
        // 1. Serve from cache if fresh (avoids fetch on locale toggle or re-render)
        const cached = _sourcePermCache.get(locale);
        if (cached && Date.now() - cached.fetchedAt < SOURCE_PERM_TTL) {
          applySourcePerm(cached.data);
          return;
        }

        // 2. Resolve token via getAuthToken() — handles sub-account tokens and
        //    the post-login race where localStorage isn't written yet.
        const token = await getAuthToken();
        if (!token) {
          if (!cancelled) { setWarehouseItems([]); setAllPermittedStores([]); }
          return;
        }

        const authHeaders = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-locale": locale,
        };

        // 3. Deduplicate concurrent fetches — StrictMode double-mount or rapid
        //    locale+auth changes both resolve from the same in-flight Promise.
        let perm = _sourcePermInflight.get(locale);
        if (!perm) {
          perm = fetch("/api/kleverapi/source-permission", { headers: authHeaders })
            .then(async (res) => {
              if (!res.ok) {
                if (res.status === 401) return null;
                throw new Error("source-permission fetch failed");
              }
              return res.json();
            })
            .finally(() => _sourcePermInflight.delete(locale));
          _sourcePermInflight.set(locale, perm);
        }

        const permData = await perm;
        if (permData === null) {
          if (!cancelled) { setWarehouseItems([]); setAllPermittedStores([]); }
          return;
        }

        // 4. Always fetch kleverSourceAvailableStores so that base locale stores
        //    (store_code "en" / "ar", group_name "All Warehouse") are always available.
        //    These are never included in kleverSourcePermissions.permitted_stores even
        //    for restricted customers, so they must come from the available-stores list.
        const permittedStores: any[] = Array.isArray(permData?.permitted_stores)
          ? permData.permitted_stores
          : [];

        // Serve available-stores from cache if fresh
        const availCached = _availStoresCache.get(locale);
        let availPromise: Promise<any[]>;
        if (availCached && Date.now() - availCached.fetchedAt < AVAIL_STORES_TTL) {
          availPromise = Promise.resolve(availCached.data);
        } else {
          // Deduplicate concurrent fetches
          let avail = _availStoresInflight.get(locale);
          if (!avail) {
            avail = fetch("/api/kleverapi/source-permission/stores", { headers: authHeaders })
              .then(async (res) => {
                if (!res.ok) return [];
                const stores = await res.json();
                const arr = Array.isArray(stores) ? stores : [];
                _availStoresCache.set(locale, { data: arr, fetchedAt: Date.now() });
                return arr;
              })
              .catch(() => [])
              .finally(() => _availStoresInflight.delete(locale));
            _availStoresInflight.set(locale, avail);
          }
          availPromise = avail;
        }

        const allStores = await availPromise;

        // Build the final store list:
        // - Unrestricted (has_restrictions=false) OR no permitted stores → show all available
        // - Restricted (has_restrictions=true, has stores) → show base locale stores
        //   ("All Warehouse") + customer's specific permitted stores, deduped by store_code
        let finalStores: any[];
        if (permData?.has_restrictions === false || permittedStores.length === 0) {
          finalStores = allStores.length > 0 ? allStores : permittedStores;
        } else {
          // Base locale stores are those whose store_code is exactly "en" or "ar"
          // (not a warehouse prefix like V101_en) — they represent "All Warehouse"
          const baseStores = allStores.filter(
            (s: any) => s.store_code === "en" || s.store_code === "ar"
          );
          const combined = [...baseStores, ...permittedStores];
          // Deduplicate — base stores listed first so they win on code collision
          const seen = new Set<string>();
          finalStores = combined.filter((s: any) => {
            const code = String(s.store_code ?? "");
            if (!code || seen.has(code)) return false;
            seen.add(code);
            return true;
          });
        }

        const merged = { ...permData, permitted_stores: finalStores };
        _sourcePermCache.set(locale, { data: merged, fetchedAt: Date.now() });
        applySourcePerm(merged);
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[Navbar] source-permission fetch failed:", err);
        }
        if (!cancelled) setWarehouseItems([]);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, locale]);

  // Resolve the display label for a menu item in the following precedence:
  //   1. code → CODE_TO_TRANSLATION_KEY (most stable across locales)
  //   2. href → HREF_TO_TRANSLATION_KEY (fallback for APIs that don't return code)
  //   3. raw item.label from the API (may be stale-locale text)
  // This runs at render time, so toggling /en ↔ /ar re-renders labels instantly
  // without waiting for the menu re-fetch to complete.
  const resolveLabel = (item: { code?: string; href?: string; label?: string }): string => {
    const label = item.label || "";
    const lower = label.toLowerCase().trim();
    const href = (item.href || "").toLowerCase();
    const code = (item.code || "").toLowerCase();

    const isMatch = (keywords: string[]) =>
      keywords.some(k => lower.includes(k) || href.includes(k) || code.includes(k));

    if (isMatch(["about us", "about-us", "/about"])) return t("nav.aboutUs") || label;
    if (isMatch(["locations", "branch locations", "branches"])) return t("nav.branchLocations") || label;
    if (isMatch(["catalogue", "catalog"])) return t("nav.productCatalogue") || label;
    if (isMatch(["lubricants", "all lubricants"])) return t("nav.allLubricants") || label;
    if (isMatch(["tyres", "all tyres", "tires"])) return t("nav.allTyres") || label;

    return label;
  };



  return (
    <>
      {/* sticky keeps the navbar in the document flow so other content
          doesn't jump up when the user scrolls (previously `position` toggled
          between relative and fixed, causing a ~108px layout shift on scroll). */}
      <div className={`main-header w-full sticky top-0 left-0 right-0 z-[60] flex flex-col transition-[box-shadow,background-color] duration-300 ease-in-out ${isScrolled ? 'fadeInDown shadow-[0_2px_8px_rgba(0,0,0,0.08)]' : ''}`}>

        {/* ── HEADER ── */}
        <header className="bg-white border-b border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <div className="relative flex items-center justify-between h-[56px] sm:h-[64px] lg:h-[72px] px-3 sm:px-5 lg:px-8 xl:px-14">

            {/* LEFT: BTIRE logo */}
            <Link href={lp("/")} className="flex items-center flex-shrink-0 z-10">
              <img
                src="/logo/btire-logo-horizontal.svg"
                alt="BTIRE Logo"
                width={4221}
                height={1433}
                className="h-6 sm:h-8 lg:h-10 w-auto"
              />
            </Link>

            {/* CENTER: Bridgestone logo — flex center on mobile, absolute center on md+ */}
            <div className="flex-1 flex items-center justify-center min-w-0 px-2 lg:px-0 lg:absolute lg:inset-0 lg:pointer-events-none">
              <Link href={lp("/")} className="flex-shrink-0 lg:pointer-events-auto">
                <img
                  src="/logo/auttono-logo.jpg"
                  alt="AL TALAYI KSA"
                  width={587}
                  height={194}
                  className="h-[24px] sm:h-[32px] lg:h-[42px] xl:h-[50px] w-auto object-contain"
                />
              </Link>
            </div>

            {/* RIGHT: Actions */}
            <div className="flex items-center gap-2 sm:gap-3 md:gap-5 flex-shrink-0 z-10">



              {/* Welcome badge & Account Dropdown — md+ */}
              {isAuthenticated && !isLoadingName && pathname !== "/login" && (
                <div className="relative hidden md:block" ref={dropdownRef}>
                  <div
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-1.5 lg:gap-2 bg-white border border-gray-100 rounded-full px-1.5 lg:px-3 py-1 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.12)] hover:shadow-md transition-shadow group cursor-pointer"
                  >
                    <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center flex-shrink-0 transition-transform">
                      <UserCircle size={16} strokeWidth={2.5} className="text-white" />
                    </div>
                    <div className="flex flex-col min-w-0 pr-1 rtl:pr-0 rtl:pl-1">
                      <span className="hidden lg:block text-[8px] text-black/50 font-semibold uppercase tracking-widest leading-none">{t("nav.welcomeBack")}</span>
                      <span className="text-body text-black font-semibold tracking-tighter leading-snug mt-0.5 truncate max-w-[80px] lg:max-w-[140px]">
                        {isSubAccount && subAccountName ? subAccountName : displayUser}
                      </span>
                    </div>

                  </div>

                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-sm shadow-2xl border border-gray-200 py-1 z-[100]" dir={isRtl ? "rtl" : "ltr"}>
                      <Link
                        href={lp("/customer/account")}
                        className="block px-4 py-2.5 text-body font-semibold text-black hover:bg-primary hover:text-white transition-colors ltr:text-left rtl:text-right"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        {t("nav.myAccount")}
                      </Link>
                      {isSubAccount && (
                        <Link
                          href={lp("/customer/account")}
                          className="block px-4 py-2.5 text-body font-semibold text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100 ltr:text-left rtl:text-right"
                          onClick={() => {
                            setIsProfileOpen(false);
                            localStorage.removeItem("subAccountToken");
                            localStorage.removeItem("subAccountName");
                            localStorage.removeItem("subAccountId");
                            localStorage.removeItem("isSubAccount");
                            setSubAccountName(null);
                            setIsSubAccount(false);
                          }}
                        >
                          {t("nav.backToMainAccount")}
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full ltr:text-left rtl:text-right px-4 py-2.5 text-body font-semibold text-black hover:bg-primary hover:text-white transition-colors cursor-pointer border-t border-gray-100"
                      >
                        {t("nav.signOut")}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Language / Store Switcher */}
              <div className="hidden md:block" ref={storeDropRef}>
                {(() => {
                  // ── Complex store switcher (authenticated + warehouse stores loaded) ──
                  if (isAuthenticated && pathname !== "/login" && currentStore && allPermittedStores.length > 0) {
                    // Use browser URL (not usePathname which may return the rewritten internal path)
                    const browserPath = typeof window !== "undefined" ? window.location.pathname : (pathname || "/");
                    const currentEntry = allPermittedStores.find(
                      (s) => String(s.store_code) === currentStore
                    );
                    const oppositeCode = currentStore.endsWith("_en")
                      ? currentStore.replace(/_en$/, "_ar")
                      : currentStore.endsWith("_ar")
                        ? currentStore.replace(/_ar$/, "_en")
                        : currentStore === "en" ? "ar" : "en";
                    const oppositeEntry = allPermittedStores.find(
                      (s) => String(s.store_code) === oppositeCode
                    );

                    // ─── Case 1: Both current and opposite store found (works for most stores) ───
                    if (currentEntry && oppositeEntry) {
                      const isLocaleOnly = isValidLocale(currentStore);
                      const buttonLabel = isLocaleOnly
                        ? String(oppositeEntry.store_name || oppositeCode)
                        : String(currentEntry.store_name || currentStore);

                      const getStorePath = (url: string): string => {
                        try { return new URL(url).pathname.replace(/\/$/, ""); } catch { return ""; }
                      };
                      const oppositeBasePath = getStorePath(oppositeEntry.store_url) || `/${oppositeCode}`;
                      const cleanCurrentPath = stripPrefix(browserPath).replace(/\.html$/, "") || "/";
                      const seoCurrentPath = cleanCurrentPath === "/" ? "" : `${cleanCurrentPath}.html`;
                      const href = `${oppositeBasePath}${seoCurrentPath}` || "/";
                      const targetLocale = (oppositeCode.endsWith("_ar") || oppositeCode === "ar") ? "ar" : "en";

                      return (
                        <Link
                          href={href}
                          onClick={() => {
                            setLocaleCookie(targetLocale);
                            i18n.changeLanguage(targetLocale);
                          }}
                          className="flex items-center gap-1.5 rounded px-3 py-1.5 text-body font-semibold text-black hover:bg-primary hover:text-white transition-colors"
                          title={`Switch to ${oppositeEntry.store_name || oppositeCode}`}
                        >
                          <span>{buttonLabel}</span>
                        </Link>
                      );
                    }

                    // ─── Case 2: Only one entry found (e.g. V102_en exists but V102_ar doesn't) ───
                    const displayEntry = currentEntry || oppositeEntry;
                    if (displayEntry) {
                      const friendlyName = String(displayEntry.store_name || currentStore);
                      const cleanCurrentPath = stripPrefix(browserPath).replace(/\.html$/, "") || "/";
                      const seoCurrentPath = cleanCurrentPath === "/" ? "" : `${cleanCurrentPath}.html`;
                      const href = `/${oppositeCode}${seoCurrentPath}` || "/";
                      const targetLocale = (oppositeCode.endsWith("_ar") || oppositeCode === "ar") ? "ar" : "en";

                      return (
                        <Link
                          href={href}
                          onClick={() => {
                            setLocaleCookie(targetLocale);
                            i18n.changeLanguage(targetLocale);
                          }}
                          className="flex items-center gap-1.5 rounded px-3 py-1.5 text-body font-semibold text-black hover:bg-primary hover:text-white transition-colors"
                          title={`Switch to ${oppositeCode}`}
                        >
                          <span>{friendlyName}</span>
                        </Link>
                      );
                    }
                    // Neither entry found — fall through to simple toggle
                  }

                  // ── Fallback: Simple Language Toggle ──
                  const targetLocale = locale === "en" ? "ar" : "en";
                  const targetLabel = locale === "en" ? "Arabic" : "English";
                  const base = pathname || "/";
                  const targetPath = base.startsWith(`/${locale}`)
                    ? base.replace(`/${locale}`, `/${targetLocale}`)
                    : `/${targetLocale}${base === "/" ? "" : base}`;

                  return (
                    <Link
                      href={targetPath}
                      onClick={() => {
                        setLocaleCookie(targetLocale);
                        i18n.changeLanguage(targetLocale);
                      }}
                      className="flex items-center gap-1.5 rounded px-3 py-1.5 text-body font-semibold text-black hover:bg-primary hover:text-white transition-colors"
                    >
                      <span>{targetLabel}</span>
                    </Link>
                  );
                })()}
              </div>

              {/* Search Icon */}
              {isAuthenticated && pathname !== "/login" && (
                <button
                  onClick={() => { setSearchMounted(true); setIsSearchOpen(true); }}
                  className="flex relative cursor-pointer hover:opacity-70 transition-opacity items-center justify-center -mb-1 focus:outline-none"
                  aria-label="Search"
                >
                  <Search size={22} stroke="black" strokeWidth={1.5} />
                </button>
              )}




              {/* Notification Bell */}
              {isAuthenticated && pathname !== "/login" && (

                <button
                  className="flex relative cursor-pointer items-center justify-center"
                  onClick={() => { setNotifMounted(true); setIsNotificationOpen(true); }}
                  aria-label="Notifications"
                >
                  <Bell size={24} fill="black" stroke="black" strokeWidth={1} />
                  {unreadCount > 0 && (
                    <span className="absolute w-[20px] h-[20px] lg:w-[26px] lg:h-[26px] font-semibold text-micro lg:text-body -top-[10px] lg:-top-[13px] -right-[6px] lg:-right-[14px] bg-primary text-black flex items-center justify-center rounded-full border border-white">
                      {unreadCount}
                    </span>
                  )}
                </button>
              )}

              {/* Cart */}
              {isAuthenticated && pathname !== "/login" && (
                <button
                  onClick={() => { setCartMounted(true); setIsCartOpen(true); }}
                  className="relative text-black cursor-pointer pr-2 md:pr-0"
                  aria-label="Shopping Cart"
                >
                  <ShoppingCart size={24} strokeWidth={1.5} />
                  {cartCount > 0 && (
                    <span className="absolute w-[20px] h-[20px] lg:w-[26px] lg:h-[26px] font-semibold text-micro lg:text-body -top-[10px] -right-[6px] lg:-right-[14px] bg-primary text-white flex items-center justify-center rounded-full border border-white">
                      {cartCount}
                    </span>
                  )}
                </button>
              )}

              {/* My Account — mobile-only icon (desktop uses the account dropdown above) */}
              {isAuthenticated && pathname !== "/login" && (
                <Link
                  href={lp("/customer/account")}
                  className="md:hidden flex text-black cursor-pointer items-center justify-center hover:opacity-70 transition-opacity"
                  aria-label="My Account"
                >
                  <UserCircle size={24} strokeWidth={1.5} />
                </Link>
              )}

              {/* Mobile hamburger — only on phones below md, since yellow nav
                  bar and desktop dropdowns (account, search, etc.) take over at md+. */}
              <button
                onClick={() => { setIsMenuOpen(!isMenuOpen); if (isMenuOpen) setMobileOpenMenu(null); }}
                className="md:hidden text-black hover:opacity-70 transition-opacity cursor-pointer"
                aria-label="Toggle Menu"
              >
                {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </header>

        {/* ── YELLOW NAV BAR — desktop only ──
            Locked to h-9 (36px) so the loading skeleton and the loaded nav
            links occupy the same vertical space. Without this, the bar
            measures ~16px during loading and jumps to ~40px after
            hydration, pushing every page section below it down. */}
        <nav ref={warehouseNavRef} className="bg-primary w-full hidden md:block h-11">
          <div className="flex items-center justify-center w-full h-full px-4">
            {navLoading ? (
              <div className="flex items-center gap-6">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-3 w-20 bg-black/10 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              navLinks.map((item) => {
                const isWarehouse = isWarehouseCategory(item);
                // Strip prefix/extension, rebuild as /{storeOrLocale}/{path}.html
                const cleanItemPath = stripPrefix(item.href.split("?")[0] || "/").replace(/\.html$/, "") || "/";
                const seoItemPath = cleanItemPath === "/" ? cleanItemPath : `${cleanItemPath}.html`;

                // On locale-only pages (e.g. /en/my-account), currentStore is "en"/"ar".
                // We use the current store or fall back to the locale.
                // We avoid forcing a warehouse code if the user hasn't picked one.
                const prefix = currentStore || locale;
                const href = `/${prefix}${seoItemPath}`;

                const strippedPathname = stripPrefix(pathname || "");
                const isActive = strippedPathname === cleanItemPath || strippedPathname.startsWith(cleanItemPath + "/");
                const children = isWarehouse ? undefined : item.children;
                const hasChildren = (isWarehouse && warehouseItems.length > 0) || !!(children && children.length > 0);

                const isOpen = openWarehouseMenu === item.href;
                return (
                  <div
                    key={item.href}
                    className="relative h-full"
                    onMouseEnter={() => hasChildren && setOpenWarehouseMenu(item.href)}
                    onMouseLeave={() => setOpenWarehouseMenu(null)}
                  >
                    {hasChildren ? (
                      <span
                        onClick={() => setOpenWarehouseMenu(isOpen ? null : item.href)}
                        className={`py-3 flex items-center h-full px-5 lg:px-7 text-sm md:text-base font-medium capitalize transition-all duration-200 whitespace-nowrap cursor-pointer select-none ${isActive
                          ? "bg-black text-white"
                          : "text-black hover:bg-black hover:text-white"
                          }`}
                      >
                        {resolveLabel(item)}
                      </span>
                    ) : (
                      <Link
                        href={href}
                        className={`py-3 flex items-center h-full px-5 lg:px-7 text-sm md:text-base font-medium capitalize transition-all duration-200 whitespace-nowrap ${isActive
                          ? "bg-black text-white"
                          : "text-black hover:bg-black hover:text-white"
                          }`}
                      >
                        {resolveLabel(item)}
                      </Link>
                    )}

                    {/* Warehouse dropdown — hover + tap (touch tablets) via React state.
                        ltr:left-0 rtl:right-0 keeps the dropdown anchored to the
                        nav item's start edge in both directions. */}
                    {hasChildren && isOpen && (
                      <div className="absolute top-full ltr:left-0 rtl:right-0 w-56 max-w-[calc(100vw-1rem)] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.08)] z-[100]">
                        <div className="flex flex-col py-1">

                          {isWarehouse
                            ? [...warehouseItems]
                              .sort((a, b) => {
                                if (a.code === currentStore) return -1;
                                if (b.code === currentStore) return 1;
                                return 0;
                              })
                              .map((w) => {
                                const isSelected = currentStore === w.code;
                                // Use the category's path (item.href) instead of the current pathname
                                // so that clicking a warehouse under 'Lubricants' actually takes you to Lubricants.
                                const targetCategoryPath = stripPrefix(item.href || "/").replace(/\.html$/, "") || "/";
                                const seoCategoryPath = targetCategoryPath === "/" ? "" : `${targetCategoryPath}.html`;
                                const wLocale = w.code.endsWith("_ar") ? "ar" : "en";
                                const warehouseHref = `/${w.code}${seoCategoryPath}`;

                                return (
                                  <Link
                                    key={w.code}
                                    href={warehouseHref}
                                    onClick={() => {
                                      setLocaleCookie(wLocale);
                                      i18n.changeLanguage(wLocale);
                                      document.cookie = `NEXT_STORE=${w.code};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
                                      setOpenWarehouseMenu(null);
                                    }}
                                    className={`text-start px-6 py-2.5 text-sm font-medium transition-colors cursor-pointer !text-black ${isSelected ? "bg-primary border-l-2 border-black" : "hover:bg-primary hover:!text-white"}`}
                                  >
                                    {w.label}
                                  </Link>
                                );
                              })
                            : children?.map((child, idx) => {
                              const childPath = stripPrefix(child.href.split("?")[0] || "/").replace(/\.html$/, "") || "/";
                              const childSeoPath = childPath === "/" ? childPath : `${childPath}.html`;
                              const childHref = `/${currentStore || locale}${childSeoPath}`;
                              return (
                                <Link
                                  key={idx}
                                  href={childHref}
                                  onClick={() => setOpenWarehouseMenu(null)}
                                  className="px-6 py-2.5 text-sm font-medium text-black hover:bg-primary hover:text-white transition-colors"
                                >
                                  {child.label}
                                </Link>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </nav>

        {/* ── MOBILE DRAWER — only below md, hamburger is hidden at md+ ── */}
        {/* Fixed positioning + backdrop + own scroll so the page content below
            isn't visible through the menu and the page doesn't scroll behind it. */}
        {isMenuOpen && (
          <>
            <div
              className="md:hidden fixed inset-0 top-[56px] sm:top-[64px] bg-black/40 z-30 animate-in fade-in duration-200"
              onClick={() => { setIsMenuOpen(false); setMobileOpenMenu(null); }}
              aria-hidden="true"
            />
            <div className="md:hidden fixed top-[56px] sm:top-[64px] left-0 right-0 bottom-0 bg-white shadow-2xl z-40 border-t border-gray-100 animate-in slide-in-from-top duration-200 overflow-y-auto overscroll-contain">
              <div className="flex flex-col py-2">

                {/* User info */}
                {isAuthenticated && pathname !== "/login" && (
                  <div className="px-4 py-3 bg-primary border-b border-gray-100 mb-1">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-micro text-black/50 font-semibold uppercase tracking-widest leading-none">{t("nav.loggedInAs")}</span>
                        <span className="text-body text-black font-semibold uppercase truncate tracking-tight">
                          {isSubAccount && subAccountName ? subAccountName : displayUser}
                        </span>
                        {/* {currentStore && (storeName || currentStore) && ( */}
                        {/* <span className="text-[10px] text-black/60 font-bold uppercase mt-0.5 leading-none truncate">{storeName || currentStore}</span> */}
                        {/* )} */}
                      </div>
                    </div>
                  </div>
                )}

                {/* Nav links */}
                <div className="px-4 py-2">
                  <span className="text-micro font-bold text-black/50 uppercase tracking-[0.2em] block mb-2">{t("nav.navigation")}</span>
                  {navLinks.map((item) => {
                    const isWarehouse = isWarehouseCategory(item);
                    // Strip prefix/extension, rebuild as /{storeOrLocale}/{path}.html
                    const cleanItemPath = stripPrefix(item.href.split("?")[0] || "/").replace(/\.html$/, "") || "/";
                    const seoItemPath = cleanItemPath === "/" ? cleanItemPath : `${cleanItemPath}.html`;

                    const prefix = currentStore || locale;
                    const href = `/${prefix}${seoItemPath}`;

                    const strippedPathname = stripPrefix(pathname || "");
                    const isActive = strippedPathname === cleanItemPath || strippedPathname.startsWith(cleanItemPath + "/");
                    const children = isWarehouse ? undefined : item.children;
                    const hasChildren = (isWarehouse && warehouseItems.length > 0) || !!(children && children.length > 0);
                    return (
                      <div key={item.href}>
                        {hasChildren ? (
                          <button
                            type="button"
                            onClick={() => setMobileOpenMenu(mobileOpenMenu === item.href ? null : item.href)}
                            aria-expanded={mobileOpenMenu === item.href}
                            className={`w-full py-2.5 text-sm font-semibold uppercase tracking-wide flex items-center justify-between cursor-pointer ${isActive ? "text-primary" : "text-black"
                              }`}
                          >
                            {resolveLabel(item)}
                            <ChevronDown
                              size={18}
                              className={`text-black/50 transition-transform duration-200 ${mobileOpenMenu === item.href ? "rotate-180" : ""}`}
                            />
                          </button>
                        ) : (
                          <Link
                            href={href}
                            className={`py-2.5 text-body font-semibold uppercase tracking-wide flex items-center justify-between group ${isActive ? "text-primary" : "text-black hover:text-primary"
                              }`}
                            onClick={() => setIsMenuOpen(false)}
                          >
                            {resolveLabel(item)}
                          </Link>
                        )}
                        {isWarehouse && warehouseItems.length > 0 && mobileOpenMenu === item.href && (
                          <div className="mb-1">
                            {[...warehouseItems]
                              .sort((a, b) => {
                                if (a.code === currentStore) return -1;
                                if (b.code === currentStore) return 1;
                                return 0;
                              })
                              .map((w) => {
                                const isSelected = currentStore === w.code;
                                // Use the category's path (item.href) instead of the current pathname
                                const targetCategoryPathM = stripPrefix(item.href || "/").replace(/\.html$/, "") || "/";
                                const seoCategoryPathM = targetCategoryPathM === "/" ? "" : `${targetCategoryPathM}.html`;
                                const mLocale = w.code.endsWith("_ar") ? "ar" : "en";
                                const warehouseHref = `/${w.code}${seoCategoryPathM}`;

                                return (
                                  <Link
                                    key={w.code}
                                    href={warehouseHref}
                                    onClick={() => {
                                      setLocaleCookie(mLocale);
                                      i18n.changeLanguage(mLocale);
                                      document.cookie = `NEXT_STORE=${w.code};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
                                      setIsMenuOpen(false);
                                    }}
                                    className={`block w-full text-start py-2 text-sm font-medium cursor-pointer !text-black ${isSelected ? "font-black" : "opacity-70 hover:opacity-100"}`}
                                  >
                                    {w.label}
                                  </Link>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Quick actions */}
                <div className="px-4 py-3 mt-1 border-t border-gray-100">
                  <span className="text-micro font-bold text-black/50 uppercase tracking-[0.2em] block mb-2">{t("nav.quickActions")}</span>

                  {/* Mobile Language Switcher — always visible on mobile drawer.
                    Shows the OPPOSITE language to switch to:
                      • locale === "en" → button reads AR / العربية
                      • locale === "ar" → button reads EN / English
                    Click switches locale cookie and navigates to the same
                    pathname under the opposite locale prefix. */}
                  <Link
                    href={pathname.startsWith(`/${locale}`) ? pathname.replace(`/${locale}`, `/${locale === "en" ? "ar" : "en"}`) : `/${locale === "en" ? "ar" : "en"}${pathname}`}
                    onClick={() => {
                      const target = locale === "en" ? "ar" : "en";
                      setLocaleCookie(target);
                      i18n.changeLanguage(target);
                      setIsMenuOpen(false);
                    }}
                    className="py-2.5 text-body font-semibold text-black/80 flex items-center gap-3 w-full"
                  >
                    {/* <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                      {locale === "en" ? "AR" : "EN"}
                    </div> */}
                    {/* Show selected store/warehouse name; fall back to language
                      name if no store is active. Click still toggles locale. */}
                    {(currentStore && (storeName || currentStore)) || (locale === "en" ? "Arabic" : "English")}
                  </Link>

                  {/* Search / Notifications / My Account moved to the mobile header
                      (icon buttons next to the cart) — no longer duplicated here. */}


                  {isAuthenticated && pathname !== "/login" && (
                    <button
                      onClick={handleLogout}
                      className="py-2.5 mt-2 text-body font-semibold text-red-600 flex items-center gap-3 border-t border-gray-100 w-full pt-3"
                    >
                      <LogOut size={16} /> {t("nav.signOut")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

      </div>
      {cartMounted && <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />}
      {notifMounted && <NotificationDrawer isOpen={isNotificationOpen} onClose={() => setIsNotificationOpen(false)} />}
      {searchMounted && <SearchPopup isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />}
    </>
  );
}

