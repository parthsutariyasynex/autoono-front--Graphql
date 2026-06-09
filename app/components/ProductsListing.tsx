"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { X, Star, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, ChevronsUpDown, AlertTriangle, Check, Filter } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
const ProductDialog = dynamic(() => import("../components/ProductDialog"), { ssr: false });
const ProductEnquiryModal = dynamic(() => import("../components/ProductEnquiryModal"), { ssr: false });
const AddToCartPopup = dynamic(() => import("../components/AddToCartPopup"), { ssr: false });
import { checkAuth } from "../products/api";
import { useCart } from "@/modules/cart/hooks/useCart";
import SidebarFilter from "../components/SidebarFilter";
import Drawer from "../components/Drawer";
import Modal from "../components/Modal";
import { api, getClientStoreCode } from "@/lib/api/api-client";
import { formatPrice, redirectToLogin, formatMagentoQueryParams, parseMagentoQueryParams } from "@/utils/helpers";
import Price from "../components/Price";
import PortalDropdown from "@/components/PortalDropdown";
import { ProductCard, StockBadge } from "../components/ProductCard";

import { toast } from "react-hot-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { useLocalePath } from "@/hooks/useLocalePath";
import { useLocale } from "@/lib/i18n/client";

const PAGE_SIZE = 20;

// Base headers/widths — Action column added dynamically only when products need it.
const BASE_HEADER_KEYS = ['m.brand', 'm.name', 'm.image', 'm.stock', 'm.price'] as const;
const BASE_COL_WIDTHS = ['10%', '40%', '10%', '12%', '18%'] as const;
const ACTION_COL_WIDTH = '120px';
const SHIMMER_ROWS = 10;
const ROW_HEIGHT = 'h-auto md:h-[52px]';

function TableColGroup({ showAction }: { showAction: boolean }) {
  return (
    <colgroup>
      {BASE_COL_WIDTHS.map((w, i) => <col key={i} style={{ width: w }} />)}
      {showAction && <col style={{ width: ACTION_COL_WIDTH }} />}
    </colgroup>
  );
}

function ShimmerRows({ colCount }: { colCount: number }) {
  return (
    <>
      {Array.from({ length: SHIMMER_ROWS }).map((_, i) => (
        <tr key={`shimmer-${i}`} className={`animate-pulse ${ROW_HEIGHT}`}>
          {Array.from({ length: colCount }).map((_, j) => (
            <td key={j} className="px-4">
              <div className="h-3 bg-gray-100 rounded w-full"></div>
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function MobileCardShimmer() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg border border-gray-100 p-3 animate-pulse">
          <div className="flex gap-2.5">
            <div className="flex-1 space-y-1.5">
              <div className="h-2 bg-gray-200 rounded w-14"></div>
              <div className="h-3 bg-gray-200 rounded w-full max-w-[140px]"></div>
              <div className="h-2.5 bg-gray-200 rounded w-24"></div>
              <div className="h-2 bg-gray-200 rounded w-16"></div>
            </div>
            <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0"></div>
          </div>
          <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
            <div className="h-3.5 bg-gray-200 rounded w-20"></div>
            <div className="flex gap-1">
              <div className="h-8 w-16 bg-gray-200 rounded-lg"></div>
              <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

interface ProductsPageProps {
  categoryId?: string | null;
  storeCode?: string | null;
}

export default function ProductsPage({ categoryId: propCategoryId, storeCode: propStoreCode }: ProductsPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t, isRtl } = useTranslation();
  const lp = useLocalePath();
  const locale = useLocale();
  // Store code lives in the URL path prefix (e.g. /V101_en/products) — read it here
  // so the products API always uses the right warehouse without a ?store= query param.
  const STORE_CODE_RE_PL = /^[A-Za-z0-9_]+_(en|ar)$/;
  const pathStoreCode = (() => {
    const firstSeg = (pathname || "").split("/").filter(Boolean)[0] || "";
    return STORE_CODE_RE_PL.test(firstSeg) ? firstSeg : "";
  })();
  // Direct hook call — component is inside <Suspense> in the page file so this is safe.
  const rawSearchParams = useSearchParams();
  const { cart, addToCart } = useCart();
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [isAddedPopupOpen, setIsAddedPopupOpen] = useState(false);
  const [addedProduct, setAddedProduct] = useState<any | null>(null);
  const [productQtys, setProductQtys] = useState<Record<string, number>>({});

  const [products, setProducts] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  // Lazily initialize all URL-derived state so the product fetch fires on the
  // very first render without waiting for a SearchParams sync effect.
  const [currentPage, setCurrentPage] = useState(() => Math.max(1, Number(rawSearchParams.get("page") ?? "1") || 1));
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [sortBy, setSortBy] = useState<string>(() => rawSearchParams.get("sortBy") ?? "none");
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>(() => {
    const { filters } = parseMagentoQueryParams(new URLSearchParams(rawSearchParams.toString()));
    return filters;
  });
  const [selectedFilterLabels, setSelectedFilterLabels] = useState<Record<string, { value: string; label: string }[]>>({});
  const [apiFilters, setApiFilters] = useState<any[] | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isMobileSortOpen, setIsMobileSortOpen] = useState(false);
  const [searchByTerm, setSearchByTerm] = useState(() =>
    rawSearchParams.get("searchby") || rawSearchParams.get("search") || rawSearchParams.get("searchBy") || ""
  );
  const [itemCodeTerm, setItemCodeTerm] = useState(() =>
    rawSearchParams.get("item_code") || rawSearchParams.get("itemCode") || ""
  );

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
  const [inquiryProduct, setInquiryProduct] = useState<any | null>(null);
  const [previewProduct, setPreviewProduct] = useState<any | null>(null);
  const [urlCategoryId, setUrlCategoryId] = useState<string | null>(() => rawSearchParams.get("categoryId") || null);

  const [isMounted, setIsMounted] = useState(false);
  const isSyncingFromUrl = useRef(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favIds, setFavIds] = useState<number[]>([]);
  const [selectedStoreCode, setSelectedStoreCode] = useState<string | null>(() => rawSearchParams.get("store") || null);
  const [storeName, setStoreName] = useState<string>("");
  const [serverError, setServerError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Mount-only: read localStorage/sessionStorage (unavailable on server).
  useEffect(() => {
    setIsMounted(true);
    const stored = localStorage.getItem("favourites");
    if (stored) setFavIds(JSON.parse(stored));

    if (typeof sessionStorage !== "undefined") {
      const sc = propStoreCode || pathStoreCode || rawSearchParams.get("store") || sessionStorage.getItem("defaultStoreCode") || "";
      const sn = sessionStorage.getItem(`storeName_${sc}`);
      if (sn) setStoreName(sn);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // URL → state: sync when the URL changes after mount (e.g. browser back/forward,
  // external navigation). Skipped on first mount because state was already
  // lazily initialized from rawSearchParams above.
  useEffect(() => {
    if (!isMounted) return;

    let changed = false;

    const cid = rawSearchParams.get("categoryId");
    if (cid && cid !== urlCategoryId) {
      setUrlCategoryId(cid);
      setCurrentPage(1);
      setProducts([]);
      changed = true;
    }

    const sc = rawSearchParams.get("store");
    if (sc !== selectedStoreCode) {
      setSelectedStoreCode(sc);
      setCurrentPage(1);
      setProducts([]);
      changed = true;
      if (sc) {
        try { localStorage.setItem("selectedStoreCode", sc); } catch { }
      } else {
        try { localStorage.removeItem("selectedStoreCode"); } catch { }
      }
    }

    const sb = rawSearchParams.get("searchby") || rawSearchParams.get("search") || rawSearchParams.get("searchBy") || "";
    if (sb !== searchByTerm) {
      setSearchByTerm(sb);
      setCurrentPage(1);
      setProducts([]);
      setSelectedFilters({});
      setSelectedFilterLabels({});
      setApiFilters(null);
      changed = true;
    }

    const ic = rawSearchParams.get("item_code") || rawSearchParams.get("itemCode") || "";
    if (ic !== itemCodeTerm) {
      setItemCodeTerm(ic);
      setCurrentPage(1);
      setProducts([]);
      setSelectedFilters({});
      setSelectedFilterLabels({});
      setApiFilters(null);
      changed = true;
    }

    const { filters, page, sortBy: parsedSortBy } = parseMagentoQueryParams(new URLSearchParams(rawSearchParams.toString()));

    if (JSON.stringify(filters) !== JSON.stringify(selectedFilters)) {
      setSelectedFilters(filters);
      setCurrentPage(1);
      changed = true;
    }
    if (page !== currentPage && !changed) {
      setCurrentPage(page);
      changed = true;
    }
    if (parsedSortBy !== sortBy) {
      setSortBy(parsedSortBy);
      changed = true;
    }

    if (changed) isSyncingFromUrl.current = true;

    if (typeof sessionStorage !== "undefined") {
      const sc2 = propStoreCode || pathStoreCode || rawSearchParams.get("store") || sessionStorage.getItem("defaultStoreCode") || "";
      const sn = sessionStorage.getItem(`storeName_${sc2}`);
      if (sn) setStoreName(sn);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawSearchParams, isMounted]);

  useEffect(() => {
    if (!isMounted) return;

    if (isSyncingFromUrl.current) {
      isSyncingFromUrl.current = false;
      return;
    }

    const next = new URLSearchParams();
    if (currentPage > 1) next.set("page", String(currentPage));
    if (sortBy && sortBy !== "none") next.set("sortBy", sortBy);
    if (searchByTerm) next.set("searchby", searchByTerm);
    if (itemCodeTerm) next.set("item_code", itemCodeTerm);

    Object.entries(selectedFilters).forEach(([key, values]) => {
      if (Array.isArray(values)) {
        values.forEach((val, index) => next.append(`${key}[${index}]`, val));
      }
    });

    next.sort();
    const current = new URLSearchParams(rawSearchParams.toString());
    current.sort();

    if (next.toString() !== current.toString()) {
      const newUrl = `${window.location.pathname}${next.toString() ? `?${next.toString()}` : ""}`;
      router.replace(newUrl, { scroll: false });
    }
  }, [selectedFilters, currentPage, sortBy, searchByTerm, itemCodeTerm, isMounted, router, rawSearchParams]);

  const toggleFavorite = useCallback(async (product: any) => {
    const { product_id: productId } = product;
    const stored = localStorage.getItem("favourites");
    const favIds: number[] = stored ? JSON.parse(stored) : [];
    // Already favorited — just navigate without re-adding
    if (favIds.includes(productId)) {
      router.push(lp("/favorites"));
      return;
    }
    // Optimistically update local state
    favIds.push(productId);
    localStorage.setItem("favourites", JSON.stringify(favIds));
    setFavIds(favIds);
    const toastId = toast.loading(t("favorites.addingToFavorites"));
    try {
      const storeCode = getClientStoreCode();
      const result = await api.post(
        "/kleverapi/favorite-products",
        { product_id: productId },
        storeCode ? { headers: { "x-store-code": storeCode } } : {},
      );
      if (result?.success === false) throw new Error("Server declined favorite add");
      toast.success(t("favorites.cartAdded"), { id: toastId });
      // Only navigate on confirmed success — banner is only shown when add worked
      router.push(lp(`/favorites?added=${encodeURIComponent(product.name || "")}`));
    } catch (err) {
      console.error("API favorite add error:", err);
      toast.error(t("favorites.syncFailed"), { id: toastId });
      // Revert optimistic local state on failure
      const reverted = favIds.filter((id: number) => id !== productId);
      localStorage.setItem("favourites", JSON.stringify(reverted));
      setFavIds(reverted);
    }
  }, [t, router, lp]);

  const handleInquiry = useCallback((product: any) => {
    setInquiryProduct(product);
    setIsInquiryModalOpen(true);
  }, []);

  const handleImagePreview = useCallback((product: any) => {
    setSelectedImage(product.image_url);
    setPreviewProduct(product);
    setIsImageModalOpen(true);
  }, []);

  const handleQtyChange = useCallback((sku: string, qty: number) => {
    setProductQtys(prev => ({ ...prev, [sku]: qty }));
  }, []);

  // Initialize alongside selectedFilters so both start from URL on first render.
  const [debouncedFilters, setDebouncedFilters] = useState<Record<string, string[]>>(() => {
    const { filters } = parseMagentoQueryParams(new URLSearchParams(rawSearchParams.toString()));
    return filters;
  });
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return; // Both already initialized from URL — no debounce needed
    }
    const handler = setTimeout(() => setDebouncedFilters(selectedFilters), 300);
    return () => clearTimeout(handler);
  }, [selectedFilters]);

  useEffect(() => {
    const abortController = new AbortController();
    const loadProducts = async () => {
      try {
        setLoading(true);
        setError("");
        setServerError(false);
        const token = localStorage.getItem("token");
        if (!token) { redirectToLogin(router); return; }
        // Derive locale from URL: handle both /ar/... and store-code URLs like /V102_ar/...
        const firstSeg = window.location.pathname.split("/").filter(Boolean)[0] || "";
        const storeLocaleMatch = firstSeg.match(/^[A-Za-z0-9]+_(en|ar)$/);
        const pathLocale = storeLocaleMatch ? storeLocaleMatch[1]
          : (firstSeg === "ar" || firstSeg === "en") ? firstSeg : "";
        const cookieLocale = document.cookie.match(/NEXT_LOCALE=([^;]+)/)?.[1] || "";
        const pathStoreCodeFromUrl = window.location.pathname.split("/").filter(Boolean)[0];
        const tempStoreCode = propStoreCode || (STORE_CODE_RE_PL.test(pathStoreCodeFromUrl) ? pathStoreCodeFromUrl : null) || selectedStoreCode || "";
        const fetchLocale = pathLocale || cookieLocale || "en";
        const headers: HeadersInit = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "x-locale": fetchLocale,
          ...(tempStoreCode && { "x-store-code": tempStoreCode })
        };

        const queryString = formatMagentoQueryParams(debouncedFilters, currentPage, sortBy);

        // Priority for categoryId: Prop > URL Param > Default (15)
        const categoryIdFromUrl = propCategoryId || urlCategoryId || "15";
        // Whether the user/page has explicitly chosen a category (vs the fallback default)
        const isExplicitCategory = !!(propCategoryId || urlCategoryId);

        const storeParam = tempStoreCode ? `&storeCode=${encodeURIComponent(tempStoreCode)}` : "";

        // When an item code (SKU) is typed, route through /api/category-products with
        // the native itemCode filter on kleverCategoryProducts — server-side exact match
        // against the full catalog. The old /product-search path used a 200-product
        // client-side pool which missed items not in the first page.
        let url: string;
        if (itemCodeTerm) {
          const storeParam = tempStoreCode ? `&storeCode=${encodeURIComponent(tempStoreCode)}` : "";
          url = `/api/category-products?item_code=${encodeURIComponent(itemCodeTerm)}&categoryId=${encodeURIComponent(categoryIdFromUrl)}&pageSize=${PAGE_SIZE}&page=${currentPage}&lang=${fetchLocale}${storeParam}`;
        } else {
          const searchByParam = searchByTerm ? `&searchby=${encodeURIComponent(searchByTerm)}` : "";
          // For pure text searches with no explicit category, omit categoryId so the
          // route handler routes through Elasticsearch (cross-category full-text search).
          // With a categoryId, the custom kleverCategoryProducts query restricts results
          // to that category's pool, returning nothing for brands outside that category.
          const catParam = (isExplicitCategory || !searchByTerm) ? `&categoryId=${encodeURIComponent(categoryIdFromUrl)}` : "";
          url = `/api/category-products?${queryString ? queryString + "&" : ""}pageSize=${PAGE_SIZE}&lang=${fetchLocale}${storeParam}${catParam}${searchByParam}`;
        }

        const res = await fetch(url, { headers, signal: abortController.signal });
        if (!res.ok) {
          if (res.status === 401) { localStorage.removeItem("token"); redirectToLogin(router); return; }
          throw new Error(`API Error: ${res.status}`);
        }
        const data = await res.json();
        if (data.server_error) {
          setServerError(true);
          setProducts([]);
          setLoading(false);
          return;
        }
        const productArray = Array.isArray(data) ? data
          : Array.isArray(data.products) ? data.products
            : Array.isArray(data.items) ? data.items
              : Array.isArray(data.data) ? data.data
                : [];
        const total = typeof data.total_count === "number" ? data.total_count : productArray.length;

        const mappedProducts = productArray.map((p: any) => ({
          ...p,
          final_price: Number(p.final_price ?? p.special_price ?? p.price ?? 0),
          // product-search doesn't return is_action — default to "Yes" so the
          // Action column (qty + cart + favourite) always shows for search results.
          is_action: p.is_action ?? "Yes",
        }));

        if (abortController.signal.aborted) return;
        setProducts(mappedProducts);
        setTotalCount(total);
        if (data.filters) {
          setApiFilters(data.filters);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(t("products.noProducts"));
        console.error(err);
      } finally {
        if (!abortController.signal.aborted) setLoading(false);
      }
    };
    loadProducts();
    return () => abortController.abort();
  }, [currentPage, debouncedFilters, sortBy, pathStoreCode, selectedStoreCode, searchByTerm, itemCodeTerm, retryCount]);
  // Note: locale intentionally excluded — fetchLocale reads from window.location directly
  // Adding locale here causes double-fetch and abort race condition


  const handleFilterChange = useCallback(
    (filters: Record<string, string[]>, labels: Record<string, { value: string; label: string }[]>) => {
      setSelectedFilters(filters);
      setSelectedFilterLabels(labels);
      setCurrentPage(1);
    }, [],
  );

  const clearAllFilters = () => { setSelectedFilters({}); setSelectedFilterLabels({}); setIsFavorite(false); setCurrentPage(1); setSearchByTerm(""); setItemCodeTerm(""); };
  const clearSearchBy = () => { setSearchByTerm(""); setCurrentPage(1); };
  const clearItemCode = () => { setItemCodeTerm(""); setCurrentPage(1); };

  const removeSpecificFilter = (code: string, value: string) => {
    const nextFilters = { ...selectedFilters };
    nextFilters[code] = (nextFilters[code] || []).filter(v => v !== value);
    if (nextFilters[code].length === 0) delete nextFilters[code];
    const nextLabels = { ...selectedFilterLabels };
    if (nextLabels[code]) { nextLabels[code] = nextLabels[code].filter(l => l.value !== value); if (nextLabels[code].length === 0) delete nextLabels[code]; }
    setSelectedFilters(nextFilters);
    setSelectedFilterLabels(nextLabels);
    setCurrentPage(1);
  };

  const handleAddToCart = useCallback(async (product: any) => {
    try {
      const qty = productQtys[product.sku] || 1;
      setAddingToCart(product.sku);
      await addToCart(product.sku, qty);
      setAddedProduct(product);
      setIsAddedPopupOpen(true);
      setJustAdded(product.sku);
      setTimeout(() => setJustAdded(null), 2000);
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "401") {
        localStorage.removeItem("token");
        router.replace(lp("/login"));
      }
      else toast.error(t("favorites.cartAddFailed"));
    } finally {
      setAddingToCart(null);
    }
  }, [addToCart, router, productQtys]);

  // Stock tier: 0 = available, 1 = limited, 2 = out of stock.
  const stockTier = (p: any): number => {
    const outOfStock = p.is_in_stock === false
      || p.stock_label === "Not Available"
      || p.stock_status === "Out of Stock"
      || p.stock_status === "Not Available"
      || Number(p.stock_qty || 0) <= 0;
    if (outOfStock) return 2;
    if (Number(p.stock_qty || 0) > 0 && Number(p.stock_qty) <= 10) return 1;
    return 0;
  };
  const cmpStr = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: "base" });

  const sortedProducts = useMemo(() => {
    let result = [...products];
    if (isFavorite) result = result.filter(p => favIds.includes(p.product_id));
    const selectedOffers = selectedFilters["offers"];
    if (selectedOffers?.length) result = result.filter(p => p?.offer && selectedOffers.some((o: string) => o === p.offer));

    switch (sortBy) {
      case "price-asc":  return result.sort((a, b) => (a.final_price ?? 0) - (b.final_price ?? 0));
      case "price-desc": return result.sort((a, b) => (b.final_price ?? 0) - (a.final_price ?? 0));
      case "brand-asc":  return result.sort((a, b) => cmpStr(a.brand ?? "", b.brand ?? ""));
      case "brand-desc": return result.sort((a, b) => cmpStr(b.brand ?? "", a.brand ?? ""));
      case "name-asc":   return result.sort((a, b) => cmpStr(a.name ?? "", b.name ?? ""));
      case "name-desc":  return result.sort((a, b) => cmpStr(b.name ?? "", a.name ?? ""));
      case "stock-asc":  return result.sort((a, b) => stockTier(a) - stockTier(b));
      case "stock-desc": return result.sort((a, b) => stockTier(b) - stockTier(a));
      default:           return result;
    }
  }, [products, sortBy, isFavorite, favIds, selectedFilters]);

  // Click a column header to cycle: none → asc → desc → none.
  const cycleSort = (field: "brand" | "name" | "stock" | "price") => {
    setSortBy(prev => {
      if (prev === `${field}-asc`) return `${field}-desc`;
      if (prev === `${field}-desc`) return "none";
      return `${field}-asc`;
    });
    setCurrentPage(1);
  };
  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy === `${field}-asc`) return <ChevronUp size={14} strokeWidth={2.5} className="text-primary" />;
    if (sortBy === `${field}-desc`) return <ChevronDown size={14} strokeWidth={2.5} className="text-primary" />;
    return <ChevronsUpDown size={14} strokeWidth={2} className="text-black/30" />;
  };
  const SORTABLE_HEADERS: Record<string, "brand" | "name" | "stock" | "price" | null> = {
    "m.brand": "brand",
    "m.name": "name",
    "m.image": null,
    "m.stock": "stock",
    "m.price": "price",
  };

  // Show the Action column only if at least one loaded product has is_action === "Yes".
  // During loading we assume it may appear (prevents column count jump on shimmer → data).
  const showActionColumn = loading || sortedProducts.some(p => p.is_action === "Yes");
  const totalColumns = BASE_HEADER_KEYS.length + (showActionColumn ? 1 : 0);
  const displayCount = totalCount;
  const totalPages = Math.ceil(displayCount / PAGE_SIZE);


  /* ══════════════════════════════════════════════════════════════
     PAGINATION (shared)
  ══════════════════════════════════════════════════════════════ */
  const renderPagination = (compact = false) => {
    const show = !loading && displayCount > 0;
    const safeTotalPages = Math.max(1, totalPages);
    const WINDOW = 5;
    const endPage = Math.min(safeTotalPages, Math.max(1, currentPage - Math.floor(WINDOW / 2)) + WINDOW - 1);
    const startPage = Math.max(1, endPage - WINDOW + 1);
    const pageNumbers: number[] = [];
    for (let p = startPage; p <= endPage; p++) pageNumbers.push(p);
    return (
      <div className={`flex items-center justify-between ${compact ? 'py-3 px-1' : 'px-6 h-[52px] border-t border-gray-100 bg-gray-50/30'} ${show ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
        <span className={`font-semibold text-black/50 uppercase tracking-widest ${compact ? 'text-caption' : 'text-caption'}`}>
          {compact ? `${displayCount} ${t("m.products")}` : <>{t("m.found")} <span className="text-black">{displayCount}</span> {t("m.products")}</>}
        </span>
        <div className="flex items-center gap-1 md:gap-1.5">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className={`border border-gray-200 rounded-lg md:rounded-xl bg-white disabled:opacity-30 ${compact ? 'p-1.5' : 'p-2'}`}>{isRtl ? <ChevronRight size={compact ? 14 : 16} /> : <ChevronLeft size={compact ? 14 : 16} />}</button>
          {startPage > 1 && (
            <>
              <button onClick={() => setCurrentPage(1)} className={`rounded-lg md:rounded-xl font-semibold ${compact ? 'w-8 h-8 text-label' : 'w-9 h-9 text-xs'} bg-white text-black/50 border border-gray-200`}>1</button>
              {startPage > 2 && <span className="px-1 text-black/40 text-caption">…</span>}
            </>
          )}
          {pageNumbers.map((p) => (
            <button key={p} onClick={() => setCurrentPage(p)} className={`rounded-lg md:rounded-xl font-semibold ${compact ? 'w-8 h-8 text-label' : 'w-9 h-9 text-xs'} ${currentPage === p ? "bg-primary text-black" : "bg-white text-black/50 border border-gray-200"}`}>{p}</button>
          ))}
          {endPage < safeTotalPages && (
            <>
              {endPage < safeTotalPages - 1 && <span className="px-1 text-black/40 text-caption">…</span>}
              <button onClick={() => setCurrentPage(safeTotalPages)} className={`rounded-lg md:rounded-xl font-semibold ${compact ? 'w-8 h-8 text-label' : 'w-9 h-9 text-xs'} bg-white text-black/50 border border-gray-200`}>{safeTotalPages}</button>
            </>
          )}
          <button disabled={currentPage >= safeTotalPages} onClick={() => setCurrentPage(p => p + 1)} className={`border border-gray-200 rounded-lg md:rounded-xl bg-white disabled:opacity-30 ${compact ? 'p-1.5' : 'p-2'}`}>{isRtl ? <ChevronLeft size={compact ? 14 : 16} /> : <ChevronRight size={compact ? 14 : 16} />}</button>
        </div>
      </div>
    );
  };

  // Sidebar always reflects exactly what the current category-products call returns.
  // Magento narrows filter options to match the active query + selected filters,
  // so the sidebar stays in sync with the result set automatically.
  const sidebarFilters: any[] = apiFilters ?? [];

  /* ══════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════ */
  return (
    <>
      <div className="flex">
        {/* Desktop Sidebar — visible at lg+ (1024px) so iPad-landscape users
            don't have to open the mobile drawer just to use the filter. */}
        {!itemCodeTerm && (loading || products.length > 0) && (
          <div className="hidden lg:flex flex-col flex-shrink-0 self-stretch bg-white border-r border-gray-200">
            <SidebarFilter
              onFilterChange={handleFilterChange}
              selectedFilters={selectedFilters}
              isCollapsed={isSidebarCollapsed}
              setIsCollapsed={setIsSidebarCollapsed}
              initialFilters={sidebarFilters}
            />
          </div>
        )}

        {/* Mobile Filter Drawer — not available for exact SKU lookup */}
        {!itemCodeTerm && (
          <Drawer isOpen={isMobileFilterOpen} onClose={() => setIsMobileFilterOpen(false)}>
            <div className="flex flex-col h-full">
              <div className="bg-primary px-5 py-4 flex items-center justify-between flex-shrink-0">
                <h2 className="text-body-lg font-semibold text-black uppercase tracking-tight">{t("m.filter-options")}</h2>
                {Object.keys(selectedFilters).length > 0 && (
                  <button onClick={() => { clearAllFilters(); setIsMobileFilterOpen(false); }} className="text-label font-semibold text-black/70 uppercase underline">{t("m.clear-all")}</button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto">
                <div className="[&>aside]:!w-full [&>aside]:!h-auto [&>aside]:!static [&>aside]:!border-0 [&>aside]:!overflow-visible [&>aside>div]:!static [&>aside>div]:!h-auto [&>aside>div>div:first-child]:!hidden">
                  <SidebarFilter onFilterChange={(f, l) => { handleFilterChange(f, l); setIsMobileFilterOpen(false); }} selectedFilters={selectedFilters} isCollapsed={false} setIsCollapsed={() => { }} initialFilters={sidebarFilters} />
                </div>
              </div>
              <div className="p-4 border-t border-gray-100 flex-shrink-0">
                <button onClick={() => setIsMobileFilterOpen(false)} className="w-full h-[44px] bg-black text-white font-semibold uppercase text-body-sm tracking-widest rounded-lg active:scale-95 cursor-pointer">
                  {t("m.apply-filters")}
                </button>
              </div>
            </div>
          </Drawer>
        )}




        <div className="flex-1 flex flex-col w-full">

          {/* ── MOBILE CONTROLS ── */}
          <div className="xl:hidden flex flex-col gap-2 mb-3">
            {storeName && (loading || products.length > 0) && (
              <div className="px-1 mb-1">
                <h1 className="text-body-lg font-bold text-black uppercase tracking-tight">{storeName}</h1>
              </div>
            )}
            {/* Controls: 2 cols for SKU lookup (no filters), 3 cols otherwise.
                At lg+ the Filter button is hidden (sidebar replaces it), so the
                grid drops to 2 cols to fill the row evenly with Favorites + Sort. */}
            <div className={`grid ${itemCodeTerm ? "grid-cols-2" : "grid-cols-3 lg:grid-cols-2"} gap-2`}>
              <button onClick={() => router.push(lp("/favorites"))} className="h-[44px] bg-white border border-gray-200 rounded-xl flex items-center justify-center gap-2 text-label font-semibold uppercase tracking-wider shadow-sm active:scale-95 cursor-pointer">
                <Star className="w-4 h-4 fill-black text-black" /> {t("m.favourite-products")}
              </button>
              <button onClick={() => setIsMobileSortOpen(true)} className="h-[44px] bg-white border border-gray-200 rounded-xl flex items-center justify-center gap-2 text-label font-semibold uppercase tracking-wider shadow-sm active:scale-95 cursor-pointer">
                <ChevronDown className="w-4 h-4" />
                {sortBy === "none" ? t("products.sortByDefault") : sortBy === "price-asc" ? t("products.sortByLowToHigh") : t("products.sortByHighToLow")}
              </button>
              {!itemCodeTerm && (
                <button onClick={() => setIsMobileFilterOpen(true)} className="lg:hidden h-[44px] bg-white border border-gray-200 rounded-xl flex items-center justify-center gap-2 text-label font-semibold uppercase tracking-wider shadow-sm active:scale-95 cursor-pointer">
                  <Filter className="w-4 h-4" /> Filter
                  {Object.keys(selectedFilters).length > 0 && <span className="w-5 h-5 bg-primary rounded-full text-caption font-semibold flex items-center justify-center">{Object.keys(selectedFilters).length}</span>}
                </button>
              )}
            </div>
            {/* Active filter chips — wrapped in a stable-height slot so the
                grid below doesn't jump when chips appear/disappear. */}
            <div className="min-h-[38px] flex items-center">
              {(Object.keys(selectedFilterLabels).length > 0 || searchByTerm || itemCodeTerm || isFavorite) && (
                <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar-hide py-1 w-full">
                  <span className="text-caption font-bold text-black uppercase tracking-tight whitespace-nowrap px-1">
                    {t("products.yourSelections")} :
                  </span>
                  {searchByTerm && (
                    <div className="flex items-center gap-1.5 bg-blue-50 border border-primary/30 px-3 py-1 rounded-lg text-caption font-bold text-primary whitespace-nowrap flex-shrink-0">
                      {searchByTerm} <button onClick={clearSearchBy} className="text-red-500 ml-0.5"><X size={12} strokeWidth={3} /></button>
                    </div>
                  )}
                  {itemCodeTerm && (
                    <div className="flex items-center gap-1.5 bg-blue-50 border border-primary/30 px-3 py-1 rounded-lg text-caption font-bold text-primary whitespace-nowrap flex-shrink-0">
                      {itemCodeTerm} <button onClick={clearItemCode} className="text-red-500 ml-0.5"><X size={12} strokeWidth={3} /></button>
                    </div>
                  )}
                  {isFavorite && (
                    <div className="flex items-center gap-1.5 bg-blue-50 border border-primary/30 px-3 py-1 rounded-lg text-caption font-bold text-primary whitespace-nowrap flex-shrink-0">
                      {t("sidebar.favoriteProducts")} <button onClick={() => setIsFavorite(false)} className="text-red-500 ml-0.5"><X size={12} strokeWidth={3} /></button>
                    </div>
                  )}
                  {Object.entries(selectedFilterLabels).flatMap(([code, items]) => items.map((item) => (
                    <div key={`${code}-${item.value}`} className="flex items-center gap-1.5 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-lg text-caption font-bold text-black/80 whitespace-nowrap flex-shrink-0">
                      {item.label} <button onClick={() => removeSpecificFilter(code, item.value)} className="text-black/50 ml-0.5"><X size={12} strokeWidth={3} /></button>
                    </div>
                  )))}
                  <button onClick={clearAllFilters} className="text-caption font-bold text-red-500 uppercase whitespace-nowrap flex-shrink-0 px-2 underline decoration-2 underline-offset-2">{t("products.clearAll")}</button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Sort Bottom Sheet */}
          {isMobileSortOpen && (
            <div className="xl:hidden fixed inset-0 z-[100]">
              <div className="absolute inset-0 bg-black/40" onClick={() => setIsMobileSortOpen(false)} />
              <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <h3 className="text-body-lg font-semibold uppercase tracking-tight">{t("products.sortByDefault")}</h3>
                  <button onClick={() => setIsMobileSortOpen(false)} className="p-1 text-black/50 hover:text-black"><X size={20} /></button>
                </div>
                <div className="flex flex-col py-2">
                  {[
                    { value: "none", label: t("products.sortByDefault") },
                    { value: "price-asc", label: t("products.sortByLowToHigh") },
                    { value: "price-desc", label: t("products.sortByHighToLow") },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setSortBy(opt.value); setIsMobileSortOpen(false); }}
                      className={`px-5 py-3.5 text-body font-semibold text-start flex items-center justify-between transition-colors ${sortBy === opt.value ? "bg-primary/10 text-black" : "text-black/80 hover:bg-gray-50"}`}
                    >
                      {opt.label}
                      {sortBy === opt.value && <Check size={18} className="text-primary" strokeWidth={3} />}
                    </button>
                  ))}
                </div>
                <div className="h-[env(safe-area-inset-bottom,0px)]" />
              </div>
            </div>
          )}

          {/* ── MOBILE/TABLET CARD LIST ── */}
          {/* lg:grid-cols-2 keeps cards comfortable next to the 300px sidebar at 1024-1279px. */}
          <div className="xl:hidden flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-2.5 overflow-y-auto">
            {loading ? <MobileCardShimmer /> : serverError ? (
              <div className="flex-1 flex items-center justify-center py-10 px-4 col-span-full">
                <div className="bg-red-50 border border-red-100 text-red-700 px-5 py-4 rounded-xl flex flex-col items-center gap-3 w-full shadow-sm text-center">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-xs font-semibold uppercase tracking-wider">{t("common.serverError") || "Service temporarily unavailable"}</span>
                  <button onClick={() => setRetryCount(c => c + 1)} className="mt-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-widest px-5 py-2 rounded-lg transition-all active:scale-95">{t("common.tryAgain") || "Try Again"}</button>
                </div>
              </div>
            ) : sortedProducts.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-10 px-4 col-span-full">
                <div className="bg-[#FFF9E7] border border-[#FFE7A3] text-[#856404] px-5 py-4 rounded-xl flex items-center gap-3 w-full shadow-sm">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-xs font-semibold uppercase tracking-wider">{t("products.noProducts")}</span>
                </div>
              </div>
            ) : sortedProducts.map((p, i) => (
              <ProductCard
                key={p.sku || p.product_id || i}
                product={p}
                variant="card"
                priority={i < 4}
                qty={productQtys[p.sku] || 1}
                isAdding={addingToCart === p.sku}
                isJustAdded={justAdded === p.sku}
                isFavorite={favIds.includes(p.product_id)}
                onAddToCart={handleAddToCart}
                onToggleFavorite={toggleFavorite}
                onInquiry={handleInquiry}
                onQtyChange={handleQtyChange}
              />
            ))}
          </div>
          <div className="xl:hidden">{renderPagination(true)}</div>

          {/* ── DESKTOP CONTROLS + TABLE ── */}
          {/* For SKU lookup or empty results the sidebar is gone → full rounding; otherwise right-rounded only */}
          <div className={`hidden xl:flex flex-col bg-white shadow-sm border border-gray-200 overflow-hidden ${itemCodeTerm || (!loading && products.length === 0) ? "md:rounded-2xl" : "md:rounded-r-2xl border-l-0"}`}>
            {/* Desktop header */}
            {(loading || products.length > 0) && (
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center gap-4 min-h-[60px]">
                <div className="flex items-center gap-4">
                  <button onClick={() => router.push(lp("/favorites"))} className="bg-gray-50 border border-gray-200 text-black px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm text-xs font-semibold active:scale-95 cursor-pointer uppercase tracking-wider">
                    <Star className="w-5 h-5 fill-black text-black" /> {t("sidebar.favoriteProducts")}
                  </button>
                  <div className="flex flex-1 items-center gap-3 overflow-x-auto custom-scrollbar-hide max-w-[800px]">
                    {(searchByTerm || itemCodeTerm || isFavorite || Object.keys(selectedFilterLabels).length > 0) && (
                      <span className="text-body-sm font-bold text-black uppercase tracking-tight whitespace-nowrap">
                        {t("products.yourSelections")} :
                      </span>
                    )}
                    {/* Search term tag */}
                    {searchByTerm && (
                      <div className="flex items-center gap-1.5 bg-blue-50 border border-primary/30 px-3.5 py-1.5 rounded-lg text-body-sm font-bold text-primary shadow-sm whitespace-nowrap flex-shrink-0">
                        {searchByTerm}
                        <button onClick={clearSearchBy} className="hover:text-red-600 ml-1 transition-colors"><X size={14} strokeWidth={3} /></button>
                      </div>
                    )}
                    {itemCodeTerm && (
                      <div className="flex items-center gap-1.5 bg-blue-50 border border-primary/30 px-3.5 py-1.5 rounded-lg text-body-sm font-bold text-primary shadow-sm whitespace-nowrap flex-shrink-0">
                        {itemCodeTerm}
                        <button onClick={clearItemCode} className="hover:text-red-600 ml-1 transition-colors"><X size={14} strokeWidth={3} /></button>
                      </div>
                    )}
                    {isFavorite && (
                      <div className="flex items-center gap-1.5 bg-blue-50 border border-primary/30 px-3.5 py-1.5 rounded-lg text-body-sm font-bold text-primary shadow-sm flex-shrink-0">
                        {t("sidebar.favoriteProducts")} <button onClick={() => setIsFavorite(false)} className="hover:text-red-600 ml-1 transition-colors"><X size={14} strokeWidth={3} /></button>
                      </div>
                    )}
                    {Object.entries(selectedFilterLabels).flatMap(([code, items]) => items.map((item) => (
                      <div key={`${code}-${item.value}`} className="flex items-center gap-1.5 bg-white border border-gray-200 px-4 py-1.5 rounded-lg text-body-sm font-bold text-black/80 shadow-sm whitespace-nowrap flex-shrink-0">
                        {item.label} <button onClick={() => removeSpecificFilter(code, item.value)} className="hover:text-red-500 text-black/50 ml-1 transition-colors"><X size={14} strokeWidth={3} /></button>
                      </div>
                    )))}
                  </div>
                  {(Object.keys(selectedFilters).length > 0 || searchByTerm || itemCodeTerm || isFavorite) && (
                    <button onClick={clearAllFilters} className="text-caption font-bold text-red-500 uppercase flex items-center gap-1.5 bg-red-50 px-3 py-1.5 rounded-lg flex-shrink-0 hover:bg-red-100 transition-colors">
                      <X size={12} strokeWidth={3} /> {t("products.clearAll")}
                    </button>
                  )}
                </div>
                <PortalDropdown
                  value={sortBy}
                  onChange={setSortBy}
                  options={[{ label: t("products.sortByDefault"), value: "none" }, { label: t("products.sortByLowToHigh"), value: "price-asc" }, { label: t("products.sortByHighToLow"), value: "price-desc" }]}
                  buttonClassName="bg-gray-50 px-4 py-2 rounded-xl border border-gray-200 text-xs font-medium text-black cursor-pointer shadow-sm hover:border-gray-300 whitespace-nowrap"
                  minWidth={190}
                />
              </div>
            )}

            {/* Desktop table area */}
            <div className="flex-1 overflow-x-auto">
              <table className="w-full border-collapse table-fixed min-w-[700px]">
                <TableColGroup showAction={showActionColumn} />
                {(loading || products.length > 0) && (
                  <thead className="sticky top-0 z-20">
                    <tr className="bg-gray-50 border-b-2 border-gray-200">
                      {BASE_HEADER_KEYS.map(key => {
                        const field = SORTABLE_HEADERS[key];
                        if (!field) {
                          return (
                            <th key={key} className="px-2 md:px-4 py-2 md:py-3 text-label font-semibold text-black uppercase tracking-widest text-center">{t(key)}</th>
                          );
                        }
                        return (
                          <th key={key} className="px-2 md:px-4 py-2 md:py-3 text-label font-semibold text-black uppercase tracking-widest text-center">
                            <button
                              type="button"
                              onClick={() => cycleSort(field)}
                              className="inline-flex items-center gap-1 select-none hover:text-primary transition-colors cursor-pointer uppercase tracking-widest"
                              aria-label={`Sort by ${t(key)}`}
                            >
                              <span>{t(key)}</span>
                              <SortIcon field={field} />
                            </button>
                          </th>
                        );
                      })}
                      {showActionColumn && (
                        <th className="px-2 md:px-4 py-2 md:py-3 text-label font-semibold text-black uppercase tracking-widest text-center">{t('m.action')}</th>
                      )}
                    </tr>
                  </thead>
                )}
                <tbody className="divide-y divide-gray-50">
                  {loading ? <ShimmerRows colCount={totalColumns} /> : serverError ? (
                    <tr>
                      <td colSpan={totalColumns} className="py-24 px-6">
                        <div className="bg-red-50 border border-red-100 text-red-700 px-5 py-4 rounded-xl flex flex-col items-center gap-3 w-full shadow-sm max-w-2xl mx-auto text-center">
                          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                          <span className="text-xs font-semibold uppercase tracking-wider">{t("common.serverError") || "Service temporarily unavailable"}</span>
                          <button onClick={() => setRetryCount(c => c + 1)} className="mt-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-widest px-5 py-2 rounded-lg transition-all active:scale-95">{t("common.tryAgain") || "Try Again"}</button>
                        </div>
                      </td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={totalColumns} className="py-24 px-6">
                        <div className="bg-gray-50 border border-gray-200 text-gray-600 px-5 py-4 rounded-xl flex items-center gap-3 w-full shadow-sm max-w-2xl mx-auto">
                          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                          <span className="text-xs font-semibold uppercase tracking-wider">{t("products.noProducts")}</span>
                        </div>
                      </td>
                    </tr>
                  ) : sortedProducts.map((p, i) => (
                    <ProductCard
                      key={p.sku || p.product_id || i}
                      product={p}
                      variant="row"
                      priority={i < 4}
                      qty={productQtys[p.sku] || 1}
                      isAdding={addingToCart === p.sku}
                      isJustAdded={justAdded === p.sku}
                      isFavorite={favIds.includes(p.product_id)}
                      showActionColumn={showActionColumn}
                      onAddToCart={handleAddToCart}
                      onToggleFavorite={toggleFavorite}
                      onInquiry={handleInquiry}
                      onQtyChange={handleQtyChange}
                      onImagePreview={handleImagePreview}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            {renderPagination()}
          </div>
        </div>



      </div>
      <ProductDialog product={selectedProduct} isOpen={!!selectedProduct} onClose={() => setSelectedProduct(null)} />
      <ProductEnquiryModal isOpen={isInquiryModalOpen} productSku={inquiryProduct?.sku || ""} productName={inquiryProduct?.name || ""} productPrice={inquiryProduct?.final_price || 0} onClose={() => { setIsInquiryModalOpen(false); setInquiryProduct(null); }} />
      <AddToCartPopup isOpen={isAddedPopupOpen} product={addedProduct} onClose={() => { setIsAddedPopupOpen(false); setAddedProduct(null); }} />
      <Drawer isOpen={isImageModalOpen && !!selectedImage} onClose={() => setIsImageModalOpen(false)}>
        <div className="flex flex-col h-full bg-white">
          <div className="bg-primary px-4 md:px-8 py-4 md:py-6 flex items-center justify-center flex-shrink-0">
            <h2 className="text-body-lg md:text-[17px] font-semibold text-black text-center uppercase tracking-tight">
              {previewProduct ? previewProduct?.name || t("m.preview") : t("m.preview")}
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center justify-center">
            <div className="bg-white flex items-center justify-center min-h-[200px] md:min-h-[400px] w-full">
              <img src={selectedImage} alt={previewProduct ? previewProduct?.name || t("m.preview") : t("m.preview")} loading="lazy" className="max-w-full max-h-[60vh] md:max-h-[75vh] object-contain rounded-lg" />
            </div>
            <button onClick={() => setIsImageModalOpen(false)} className="mt-6 w-full py-3 md:py-4 bg-black text-white font-semibold uppercase tracking-widest rounded shadow-xl hover:bg-gray-800 text-sm cursor-pointer active:scale-95">{t("m.close")}</button>
          </div>
        </div>
      </Drawer>
    </>
  );
}
