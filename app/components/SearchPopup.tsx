"use client";

import React, { useState } from "react";
import Popup from "./Popup";
import { Search, X } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocalePath } from "@/hooks/useLocalePath";
import { getAuthToken, getClientStoreCode } from "@/lib/api/api-client";

interface SearchPopupProps {
    isOpen: boolean;
    onClose: () => void;
}

// Parse tyre size string like "195", "19565", "1956515", "195/65R15", "195/65 R15"
function parseTyreSize(input: string): { width: string; height: string; rim: string } | null {
    const cleaned = input.replace(/\s+/g, "").toUpperCase();

    // Stricter pattern: Needs 3 digits for width, optional 2 digits for height, optional R, then 2-3 digits for rim
    // Example: 225/55R17, 225 55 17, 1956515
    const patterns = [
        /^(\d{3})\/(\d{2})R(\d{2,3})$/i,  // 225/55R17
        /^(\d{3})\/(\d{2})(\d{1,2})$/i,   // 225/55 17
        /^(\d{3})(\d{2})R(\d{2})$/i,      // 22555R17
        /^(\d{3})(\d{2})(\d{2})$/i,       // 2256515
    ];

    for (const pattern of patterns) {
        const match = cleaned.match(pattern);
        if (match) {
            return { width: match[1], height: match[2], rim: match[3] };
        }
    }

    // Single width match (must be 3 digits exactly to avoid matching names like 10W40)
    const widthOnlyMatch = cleaned.match(/^(\d{3})$/);
    if (widthOnlyMatch) {
        return { width: widthOnlyMatch[1], height: "", rim: "" };
    }

    return null;
}

const SearchPopup: React.FC<SearchPopupProps> = ({ isOpen, onClose }) => {
    const { t, isRtl } = useTranslation();
    const router = useRouter();
    const lp = useLocalePath();
    const searchParams = useSearchParams();

    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<{ label: string; sku: string }[]>([]);
    const [totalFound, setTotalFound] = useState(0);
    const [isSearching, setIsSearching] = useState(false);
    const [noResults, setNoResults] = useState(false);

    // The popup is mounted once and re-opened many times (Navbar keeps
    // `searchMounted` sticky after first open). Without this reset, closing
    // the popup via the X button leaves the previously typed query in state,
    // so the next open shows stale text.
    React.useEffect(() => {
        if (!isOpen) {
            setQuery("");
            setSuggestions([]);
            setTotalFound(0);
            setIsSearching(false);
            setNoResults(false);
        }
    }, [isOpen]);

    // Carry over the user's current listing-page context so the search runs
    // within the same filtered dataset (category, store, brand, item_code, …).
    // Drop listing-UI state (`page`, `sortBy`) and any prior search term.
    const buildParamsWithContext = () => {
        const params = new URLSearchParams();
        // Drop all prior search/filter state — each new search starts clean.
        // store/category/storeCode are kept so search stays within the current scope.
        const skip = new Set(["page", "sortBy", "searchby", "search", "searchBy", "width", "height", "rim", "item_code", "itemCode"]);
        searchParams?.forEach((v, k) => { if (!skip.has(k)) params.append(k, v); });
        return params;
    };

    const handleSearch = (e?: React.FormEvent, term?: string) => {
        if (e) e.preventDefault();
        const searchVal = (term || query).trim();
        if (!searchVal) return;

        const params = buildParamsWithContext();

        const parsed = parseTyreSize(searchVal);
        if (parsed) {
            params.set("width", parsed.width);
            if (parsed.height) params.set("height", parsed.height);
            if (parsed.rim) params.set("rim", parsed.rim);
        } else {
            // If the query exactly matches a suggestion's SKU, route as item_code.
            // Otherwise if it looks like an item code (no spaces, mix of letters+digits),
            // also route as item_code — matching live site ?item_code= URL format.
            const matchedSku = suggestions.find(s => s.sku && s.sku.toLowerCase() === searchVal.toLowerCase())?.sku;
            const looksLikeItemCode = !searchVal.includes(" ") && /[A-Za-z]/.test(searchVal) && /\d/.test(searchVal);

            if (matchedSku) {
                params.set("item_code", matchedSku);
            } else if (looksLikeItemCode) {
                params.set("item_code", searchVal.toUpperCase());
            } else {
                params.set("searchby", searchVal);
            }
        }

        router.push(lp(`/products?${params.toString()}`));
        onClose();
        setQuery("");
        setSuggestions([]);
    };

    const handleSuggestionClick = (suggestion: { label: string; sku: string }) => {
        const params = buildParamsWithContext();
        // SKUs route through Magento's `itemCode` attribute filter (exact match);
        // names route through `searchBy` (name search). Mixing them returns
        // every category product because the name filter ignores SKU strings.
        if (suggestion.sku) {
            params.set("item_code", suggestion.sku);
        } else {
            params.set("searchby", suggestion.label);
        }

        router.push(lp(`/products?${params.toString()}`));
        onClose();
        setQuery("");
        setSuggestions([]);
        setNoResults(false);
    };

    // Forward listing-page context (store, category, layered filters) so the
    // popup searches within the same scope the user is currently browsing.
    // Skip listing-UI state (`page`, `sortBy`) and any prior search term.
    const contextParamsKey = (() => {
        if (!searchParams) return "";
        const skip = new Set(["page", "sortBy", "searchby", "search", "searchBy"]);
        const entries: [string, string][] = [];
        searchParams.forEach((v, k) => { if (!skip.has(k)) entries.push([k, v]); });
        entries.sort(([a], [b]) => a.localeCompare(b));
        return entries.map(([k, v]) => `${k}=${v}`).join("&");
    })();

    // Fetch product suggestions
    React.useEffect(() => {
        if (query.length < 2) {
            setSuggestions([]);
            setNoResults(false);
            return;
        }

        const abortController = new AbortController();
        const handler = setTimeout(async () => {
            setIsSearching(true);
            setNoResults(false);
            try {
                const token = await getAuthToken();

                // Use the lightweight /product-search proxy (pure Magento passthrough)
                // for typeahead — the heavy /category-products proxy with filter
                // mapping & offer injection is too slow per-keystroke.
                const PREVIEW_LIMIT = 20;
                const params = new URLSearchParams();
                params.set("query", query);
                params.set("pageSize", String(PREVIEW_LIMIT));
                params.set("page", "1");
                // Lightweight mode — stock products(search:) is ~17× faster
                // than the full kleverCategoryProducts pool. Typeahead only
                // needs name + sku, so the slim response is fine.
                params.set("light", "1");
                const store = searchParams?.get("store") || getClientStoreCode();
                if (store) params.set("store", store);

                const res = await fetch(`/api/kleverapi/product-search?${params.toString()}`, {
                    headers: {
                        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
                        ...(store ? { "x-store-code": store } : {}),
                    },
                    signal: abortController.signal,
                });

                if (res.ok) {
                    const data = await res.json();
                    const items = Array.isArray(data) ? data : (data.products || data.items || data.data || []);
                    const total = typeof data?.total_count === "number" ? data.total_count : items.length;

                    const results: { label: string; sku: string }[] = [];
                    const seen = new Set<string>();

                    items.forEach((item: any) => {
                        const name = (item.name || item.label || item.title || "").toString();
                        const sku = (item.sku || item.product_sku || item.item_code || item.itemCode || "").toString();
                        if (name && !seen.has(sku || name)) {
                            seen.add(sku || name);
                            results.push({ label: name, sku });
                        }
                    });

                    setSuggestions(results);
                    setTotalFound(total);
                    setNoResults(results.length === 0);
                } else {
                    setSuggestions([]);
                    setTotalFound(0);
                    setNoResults(true);
                }
            } catch (err: any) {
                if (err.name !== "AbortError") {
                    setSuggestions([]);
                    setNoResults(true);
                }
            } finally {
                if (!abortController.signal.aborted) setIsSearching(false);
            }
        }, 300);

        return () => {
            clearTimeout(handler);
            abortController.abort();
        };
    }, [query, contextParamsKey]);

    return (
        <Popup
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="max-w-3xl"
            className="!rounded-2xl overflow-visible h-fit"
            scrollable={false}
            closeOnOverlayClick={false}
        >
            <div className="relative p-6 md:p-10" dir={isRtl ? "rtl" : "ltr"}>
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className={`absolute -top-3 ${isRtl ? "-left-3" : "-right-3"} w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 hover:border-red-600 transition-all duration-300 z-[1001] cursor-pointer group hover:scale-110 active:scale-90`}
                >
                    <X size={16} className="text-black group-hover:text-white transition-colors" />
                </button>

                <div className="flex flex-col gap-0">
                    {/* Search Input */}
                    <form onSubmit={(e) => handleSearch(e)} className="flex items-stretch gap-0 bg-white border-2 border-primary rounded-xl overflow-hidden shadow-sm h-14 md:h-16 transition-all relative z-20 flex-shrink-0">
                        <input
                            type="text"
                            autoFocus
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={t("nav.searchPlaceholder")}
                            className="flex-1 px-6 md:px-10 text-base md:text-lg font-bold text-black outline-none placeholder:text-black/40 placeholder:font-medium bg-transparent min-w-0 ltr:text-left rtl:text-right"
                        />
                        <button
                            type="submit"
                            className="bg-primary hover:bg-primary text-black w-14 md:w-20 flex items-center justify-center transition-all duration-300 cursor-pointer active:scale-95 flex-shrink-0"
                        >
                            <Search size={22} strokeWidth={3} />
                        </button>
                    </form>

                    {/* Suggestions Dropdown */}
                    {(suggestions.length > 0 || isSearching || noResults) && (
                        <div className="bg-white border border-gray-200 border-t-0 rounded-b-xl max-h-[300px] overflow-y-auto shadow-lg">
                            {isSearching && (
                                <div className="py-2">
                                    {Array.from({ length: 3 }).map((_, i) => (
                                        <div key={i} className="flex items-center gap-3 px-6 md:px-10 py-3 animate-pulse">
                                            <div className="h-10 w-10 flex-shrink-0 rounded-md bg-gray-200" />
                                            <div className="flex-1 space-y-1.5">
                                                <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                                                <div className="h-3 bg-gray-200 rounded w-1/3" />
                                            </div>
                                            <div className="h-4 w-14 bg-gray-200 rounded" />
                                        </div>
                                    ))}
                                </div>
                            )}
                            {/* {!isSearching && suggestions.length > 0 && (
                                <div className="px-6 md:px-10 py-2 border-b border-gray-100 bg-gray-50/50 text-caption font-bold text-black/40 uppercase tracking-widest">
                                    {t("m.found")} {totalFound} {t("m.products")}
                                </div>
                            )} */}
                            {!isSearching && noResults && (
                                <div className="px-6 md:px-10 py-6 text-center text-black/50 text-sm font-medium">
                                    {t("quickOrder.noProducts")}
                                </div>
                            )}
                            {!isSearching && suggestions.map((item, idx) => (
                                <div
                                    key={`${item.sku}-${idx}`}
                                    onClick={() => handleSuggestionClick(item)}
                                    className="px-6 md:px-10 py-3.5 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-[14px] md:text-[15px] font-bold text-black truncate">{item.label}</span>
                                        {item.sku && (
                                            <span className="text-caption text-black/50 font-medium uppercase tracking-wider flex-shrink-0">{item.sku}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {/* {!isSearching && totalFound > suggestions.length && (
                                <div
                                    onClick={() => handleSearch()}
                                    className="px-6 md:px-10 py-3 hover:bg-primary/10 cursor-pointer bg-gray-50/50 text-center text-caption font-bold text-primary uppercase tracking-widest transition-colors"
                                >
                                    {t("m.view-all")} ({totalFound})
                                </div>
                            )} */}
                        </div>
                    )}
                </div>
            </div>
        </Popup>
    );
};

export default SearchPopup;
