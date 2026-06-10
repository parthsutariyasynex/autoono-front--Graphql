// "use client";

// import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
// import { useCart } from "../hooks/useCart";
// import GiftModal from "@/components/GiftModal";
// import toast from "react-hot-toast";
// import { usePathname } from "next/navigation";
// import { getSession } from "next-auth/react";

// export interface GiftItem {
//     id: string;
//     sku: string;
//     name: string;
//     image: string;
//     qty_available: number;
//     group_name: string;
//     rule_id: number;
// }

// interface GiftContextType {
//     isGiftModalOpen: boolean;
//     setIsGiftModalOpen: (open: boolean) => void;
//     openGiftModal: () => void;
//     availableGifts: GiftItem[];
//     hasGifts: boolean;
//     fetchDiscountPopup: () => Promise<void>;
// }

// const GiftContext = createContext<GiftContextType | undefined>(undefined);

// async function getAuthToken(): Promise<string | null> {
//     const session: any = await getSession();
//     if (session?.accessToken) return session.accessToken;
//     if (typeof window !== "undefined") {
//         const local = localStorage.getItem("token");
//         if (local) return local;
//     }
//     return null;
// }

// function parsePromoRules(promoRules: any[]): { gifts: GiftItem[]; maxQty: number } {
//     const gifts: GiftItem[] = [];
//     let maxQty = 0;

//     for (const rule of promoRules) {
//         const ruleId: number = rule.rule_id ?? rule.id ?? 0;
//         const ruleName: string = rule.name ?? rule.label ?? rule.title ?? `Rule ${ruleId}`;
//         const ruleMaxQty: number = rule.max_qty ?? rule.qty ?? rule.common_qty ?? rule.free_qty ?? 1;
//         maxQty += ruleMaxQty;

//         const items: any[] = rule.items ?? rule.products ?? rule.gift_items ?? rule.free_products ?? [];

//         if (items.length === 0 && rule.sku) {
//             gifts.push({
//                 id: `${ruleId}_${rule.sku}`,
//                 sku: rule.sku,
//                 name: rule.name ?? rule.sku,
//                 image: rule.image_url ?? rule.image ?? rule.thumbnail ?? "/logo/auttono-logo.jpg",
//                 qty_available: rule.qty_available ?? rule.stock_qty ?? ruleMaxQty,
//                 group_name: `${ruleName} (${ruleMaxQty})`,
//                 rule_id: ruleId,
//             });
//             continue;
//         }

//         for (const item of items) {
//             gifts.push({
//                 id: `${ruleId}_${item.sku}`,
//                 sku: item.sku,
//                 name: item.name ?? item.sku,
//                 image: item.image_url ?? item.image ?? item.thumbnail ?? "/logo/auttono-logo.jpg",
//                 qty_available: item.qty_available ?? item.stock_qty ?? ruleMaxQty,
//                 group_name: `${ruleName} (${ruleMaxQty})`,
//                 rule_id: ruleId,
//             });
//         }
//     }

//     return { gifts, maxQty: maxQty || 3 };
// }

// function loadSavedSelections(): Record<string, number> {
//     if (typeof window === "undefined") return {};
//     try {
//         const raw = localStorage.getItem("free_gift_selections");
//         return raw ? JSON.parse(raw) : {};
//     } catch { return {}; }
// }

// export function GiftProvider({ children }: { children: ReactNode }) {
//     const { cart, refetchCart } = useCart();
//     const pathname = usePathname();

//     // const [isGiftModalOpen, setIsGiftModalOpen] = useState(true);
//     const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
//     const hasSeenRef = useRef(false);
//     // const pathnameRef = useRef(pathname);
//     // useEffect(() => { pathnameRef.current = pathname; }, [pathname]);
//     const [availableGifts, setAvailableGifts] = useState<GiftItem[]>([]);
//     const [maxGifts, setMaxGifts] = useState(3);
//     const [savedSelections, setSavedSelections] = useState<Record<string, number>>(loadSavedSelections);

//     // Computed here so it's available to everything below
//     const giftSkus = availableGifts.map(g => g.sku);
//     // const hasGifts = cart?.items?.some(item => giftSkus.includes(item.sku)) || false;
//     const hasGifts =
//         giftSkus.length > 0 &&
//         cart?.items?.some(item => giftSkus.includes(item.sku)) || false;
//     // const hasGifts = false;
//     // Persist selections to localStorage whenever they change
//     useEffect(() => {
//         if (typeof window === "undefined") return;
//         try {
//             localStorage.setItem("free_gift_selections", JSON.stringify(savedSelections));
//         } catch { }
//     }, [savedSelections]);

//     // Internal fetch — returns parsed gifts so openGiftModal can use them immediately
//     const fetchDiscountPopupAndReturn = useCallback(async (): Promise<GiftItem[] | null> => {
//         const token = await getAuthToken();
//         if (!token) {
//             console.warn("[GiftContext] fetchDiscountPopup: no token");
//             return null;
//         }

//         const storeCode = typeof window !== "undefined"
//             ? (localStorage.getItem("selectedStoreCode") ||
//                 document.cookie.match(/NEXT_STORE=([^;]+)/)?.[1] ||
//                 document.cookie.match(/NEXT_LOCALE=([^;]+)/)?.[1] || "")
//             : "";
//         const storeParam = storeCode ? `?store=${encodeURIComponent(storeCode)}` : "";

//         try {
//             const res = await fetch(`/api/kleverapi/cart/discount-popup${storeParam}`, {
//                 headers: {
//                     Authorization: `Bearer ${token}`,
//                     "Content-Type": "application/json",
//                 },
//             });
//             console.log("[GiftContext] discount-popup status:", res.status);
//             if (!res.ok) {
//                 console.warn("[GiftContext] discount-popup not ok:", res.status);
//                 return null;
//             }

//             const data = await res.json();
//             console.log("[GiftContext] discount-popup data:", JSON.stringify(data).slice(0, 500));

//             let promoRules: any[] = [];
//             if (Array.isArray(data)) {
//                 promoRules = data;
//             } else if (Array.isArray(data.promo_rules)) {
//                 promoRules = data.promo_rules;
//             } else if (Array.isArray(data.rules)) {
//                 promoRules = data.rules;
//             } else if (Array.isArray(data.items)) {
//                 promoRules = data.items;
//             } else if (data.data && Array.isArray(data.data)) {
//                 promoRules = data.data;
//             } else if (data.popup_data) {
//                 promoRules = data.popup_data.promo_rules ?? data.popup_data.rules ?? [];
//             }
//             console.log("[GiftContext] promo_rules count:", promoRules.length);

//             if (promoRules.length === 0) {
//                 setAvailableGifts([]);
//                 return null;
//             }

//             const { gifts, maxQty } = parsePromoRules(promoRules);
//             setAvailableGifts(gifts);
//             setMaxGifts(maxQty);

//             return gifts;
//         } catch (err) {
//             console.error("[GiftContext] fetchDiscountPopup error:", err);
//             return null;
//         }
//     }, []);

//     // Public API wrapper
//     const fetchDiscountPopup = useCallback(async (): Promise<void> => {
//         await fetchDiscountPopupAndReturn();
//     }, [fetchDiscountPopupAndReturn]);

//     // Build selections seeded from current cart gift items (for editing existing gifts)
//     const buildEditSelections = useCallback((gifts: GiftItem[]): Record<string, number> => {
//         if (!cart?.items || !gifts.length) return {};
//         const result: Record<string, number> = {};
//         for (const gift of gifts) {
//             const cartItem = cart.items.find(ci => ci.sku === gift.sku);
//             if (cartItem && cartItem.qty > 0) result[gift.id] = cartItem.qty;
//         }
//         return result;
//     }, [cart?.items]);

//     const openGiftModal = useCallback(async () => {
//         const latestGifts = await fetchDiscountPopupAndReturn();
//         const gifts = latestGifts ?? availableGifts;

//         // Pre-populate from cart when user wants to edit already-selected gifts
//         if (hasGifts && gifts.length > 0) {
//             const editSelections = buildEditSelections(gifts);
//             if (Object.keys(editSelections).length > 0) {
//                 setSavedSelections(editSelections);
//             }
//         }

//         setIsGiftModalOpen(true);
//         hasSeenRef.current = true;
//     }, [fetchDiscountPopupAndReturn, availableGifts, hasGifts, buildEditSelections]);

//     // Fetch when cart qty changes; reset hasSeenRef so popup can reopen if no gifts in cart
//     // useEffect(() => {
//     //     if (cart?.items_count && cart.items_count > 0) {
//     //         const cartHasGifts = cart?.items?.some(item => giftSkus.includes(item.sku));
//     //         if (!cartHasGifts) hasSeenRef.current = false;
//     //         fetchDiscountPopup();
//     //     } else {
//     //         setAvailableGifts([]);
//     //     }
//     // }, [cart?.items_count, fetchDiscountPopup]);
//     useEffect(() => {
//         if (cart?.items_count && cart.items_count > 0) {

//             const cartHasGifts =
//                 giftSkus.length > 0 &&
//                 cart?.items?.some(item => giftSkus.includes(item.sku)) || false;

//             // reset only when NO gifts in cart
//             if (!cartHasGifts) {
//                 hasSeenRef.current = false;
//             }

//             fetchDiscountPopup();

//         } else {
//             setAvailableGifts([]);
//         }
//     }, [cart?.items_count, cart?.items, giftSkus, fetchDiscountPopup]);

//     // Re-fetch when navigating to cart page
//     useEffect(() => {
//         const isCartPage = pathname?.endsWith("/cart") || pathname === "/cart";
//         if (isCartPage && (cart?.items_count || 0) > 0) {
//             fetchDiscountPopup();
//         }
//     }, [pathname]);

//     // Auto-open on cart page as secondary trigger (after availableGifts update)
//     // useEffect(() => {
//     //     const isCartPage = pathname?.endsWith("/cart") || pathname === "/cart";
//     //     const totalUnits = cart?.items_count || 0;
//     //     const cartHasGifts = cart?.items?.some(item => giftSkus.includes(item.sku));

//     //     if (isCartPage && totalUnits > 0 && availableGifts.length > 0 && !cartHasGifts && !hasSeenRef.current) {
//     //         setIsGiftModalOpen(true);
//     //         hasSeenRef.current = true;
//     //     }
//     // }, [cart?.items_count, cart?.items, availableGifts, pathname]);

//     useEffect(() => {
//         if (availableGifts.length === 0) return;

//         const isCartPage = pathname?.endsWith("/cart") || pathname === "/cart";
//         const totalUnits = cart?.items_count || 0;

//         const cartHasGifts =
//             giftSkus.length > 0 &&
//             cart?.items?.some(item => giftSkus.includes(item.sku));

//         if (
//             isCartPage &&
//             totalUnits > 0 &&
//             !cartHasGifts &&
//             !hasSeenRef.current
//         ) {
//             setIsGiftModalOpen(true);
//             hasSeenRef.current = true;
//         }
//     }, [cart?.items_count, cart?.items, availableGifts, pathname, giftSkus]);

//     const handleSelectGifts = async (selections: Record<string, number>) => {
//         const selectedEntries = Object.entries(selections).filter(([_, qty]) => qty > 0);
//         if (selectedEntries.length === 0) {
//             setIsGiftModalOpen(false);
//             hasSeenRef.current = true;
//             return;
//         }

//         const token = await getAuthToken();
//         if (!token) {
//             toast.error("Please log in to add gifts.");
//             return;
//         }

//         const toastId = toast.loading("Adding your free gifts...");

//         const items = selectedEntries
//             .map(([id, qty]) => {
//                 const gift = availableGifts.find(g => g.id === id);
//                 if (!gift) return null;
//                 return { sku: gift.sku, rule_id: gift.rule_id, qty };
//             })
//             .filter(Boolean);

//         const addStoreCode = typeof window !== "undefined"
//             ? (localStorage.getItem("selectedStoreCode") ||
//                 document.cookie.match(/NEXT_STORE=([^;]+)/)?.[1] || "")
//             : "";
//         const addStoreParam = addStoreCode ? `?store=${encodeURIComponent(addStoreCode)}` : "";

//         try {
//             const res = await fetch(`/api/kleverapi/cart/promo-items/add${addStoreParam}`, {
//                 method: "POST",
//                 headers: {
//                     Authorization: `Bearer ${token}`,
//                     "Content-Type": "application/json",
//                 },
//                 body: JSON.stringify({ items }),
//             });

//             const data = await res.json();

//             if (!res.ok) {
//                 toast.error(data.message || "Failed to add gifts.", { id: toastId });
//             } else {
//                 toast.success("Free gifts added to your cart!", { id: toastId });
//                 setSavedSelections({});
//                 await refetchCart();
//                 window.dispatchEvent(new Event("cart-updated"));
//             }
//         } catch (err) {
//             console.error("[GiftContext] handleSelectGifts error:", err);
//             toast.error("Failed to add gifts. Please try again.", { id: toastId });
//         }

//         setIsGiftModalOpen(false);
//         hasSeenRef.current = true;
//     };

//     return (
//         <GiftContext.Provider value={{ isGiftModalOpen, setIsGiftModalOpen, openGiftModal, availableGifts, hasGifts, fetchDiscountPopup }}>
//             {children}
//             {isGiftModalOpen && availableGifts.length > 0 && (
//                 <GiftModal
//                     isOpen={isGiftModalOpen}
//                     onClose={() => {
//                         setIsGiftModalOpen(false);
//                         hasSeenRef.current = true;
//                     }}
//                     onSelectGifts={handleSelectGifts}
//                     maxGifts={maxGifts}
//                     availableGifts={availableGifts}
//                     initialSelections={savedSelections}
//                     onSelectionsChange={setSavedSelections}
//                 />
//             )}
//         </GiftContext.Provider>
//     );
// }

// export function useGift() {
//     const context = useContext(GiftContext);
//     if (context === undefined) {
//         throw new Error("useGift must be used within a GiftProvider");
//     }
//     return context;
// }



"use client";

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useRef,
    ReactNode,
} from "react";
import { useCart } from "../hooks/useCart";
import GiftModal from "@/components/GiftModal";
import toast from "react-hot-toast";
import { usePathname } from "next/navigation";
import { getAuthToken } from "@/lib/api/api-client";

export interface GiftItem {
    id: string;
    sku: string;
    name: string;
    image: string;
    qty_available: number;
    group_name: string;
    rule_id: number;
}

interface GiftContextType {
    isGiftModalOpen: boolean;
    setIsGiftModalOpen: (open: boolean) => void;
    openGiftModal: () => void;
    availableGifts: GiftItem[];
    hasGifts: boolean;
    isAllGiftsSelected: boolean;
    fetchDiscountPopup: () => Promise<void>;
    promoRuleName: string;
}

const GiftContext = createContext<GiftContextType | undefined>(undefined);

// Matches /cart, /en/cart, /ar/cart, /V101_en/cart, /V202_en/cart, etc.
// Uses endsWith so /cart/something is NOT treated as the cart page.
function isCartPathname(pathname: string | null): boolean {
    if (!pathname) return false;
    return (
        pathname === "/cart" ||
        pathname.endsWith("/cart") ||
        pathname.endsWith("/cart/")
    );
}

function parsePromoRules(
    promoRules: any[],
    topLevelCommonQty?: number | null,
): { gifts: GiftItem[]; maxQty: number; firstRuleName: string } {
    const gifts: GiftItem[] = [];
    let maxQty = 0;
    let firstRuleName = "";

    for (const rule of promoRules) {
        const ruleId: number = rule.rule_id ?? rule.id ?? 0;

        // Use a proper name only if the API actually provides one
        const apiProvidedName: string | undefined =
            rule.name ??
            rule.label ??
            rule.title;

        const ruleName: string = apiProvidedName ?? `Rule ${ruleId}`;

        // Only capture as popup title when it's a real name (not auto-generated)
        if (!firstRuleName && apiProvidedName) firstRuleName = apiProvidedName;

        const ruleMaxQty: number =
            rule.max_qty ??
            rule.qty ??
            rule.common_qty ??
            rule.free_qty ??
            topLevelCommonQty ??
            1;

        maxQty += ruleMaxQty;

        const items: any[] =
            rule.items ??
            rule.products ??
            rule.gift_items ??
            rule.free_products ??
            [];

        // single sku rule
        if (items.length === 0 && rule.sku) {
            gifts.push({
                id: `${ruleId}_${rule.sku}`,
                sku: rule.sku,
                name: rule.name ?? rule.sku,
                image:
                    rule.image_url ??
                    rule.image ??
                    rule.thumbnail ??
                    "/logo/auttono-logo.jpg",
                qty_available:
                    rule.qty_available ??
                    rule.available_qty ??
                    rule.stock_qty ??
                    ruleMaxQty,
                group_name: `${ruleName} (${ruleMaxQty})`,
                rule_id: ruleId,
            });

            continue;
        }

        // multiple items
        for (const item of items) {
            gifts.push({
                id: `${ruleId}_${item.sku}`,
                sku: item.sku,
                name: item.name ?? item.sku,
                image:
                    item.image_url ??
                    item.image ??
                    // item.thumbnail ??
                    "/logo/auttono-logo.jpg",
                qty_available:
                    item.qty_available ??
                    item.available_qty ??
                    item.stock_qty ??
                    ruleMaxQty,
                group_name: `${ruleName} (${ruleMaxQty})`,
                rule_id: ruleId,
            });
        }
    }

    return {
        gifts,
        maxQty: maxQty || 3,
        firstRuleName,
    };
}

function loadSavedSelections(): Record<string, number> {
    if (typeof window === "undefined") {
        return {};
    }

    try {
        const raw = localStorage.getItem("free_gift_selections");

        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

export function GiftProvider({
    children,
}: {
    children: ReactNode;
}) {
    const { cart, refetchCart, isLoading } = useCart();
    const pathname = usePathname();

    const [isGiftModalOpen, setIsGiftModalOpen] =
        useState(false);

    const [availableGifts, setAvailableGifts] = useState<
        GiftItem[]
    >([]);

    const [maxGifts, setMaxGifts] = useState(3);

    const [promoRuleName, setPromoRuleName] = useState("");

    // auto_open_popup flag from kleverDiscountPopup API response.
    // When false the server is signalling the popup should not auto-open
    // (e.g. all gifts already in cart, rule disabled, etc.).
    const [autoOpenPopup, setAutoOpenPopup] = useState(false);

    const [savedSelections, setSavedSelections] =
        useState<Record<string, number>>(
            loadSavedSelections
        );

    // prevent popup reopening repeatedly on same state
    const hasSeenRef = useRef(false);
    const prevMaxGiftsRef = useRef(maxGifts);
    const prevAvailableCountRef = useRef(availableGifts.length);

    // save selections
    useEffect(() => {
        if (typeof window === "undefined") return;

        try {
            localStorage.setItem(
                "free_gift_selections",
                JSON.stringify(savedSelections)
            );
        } catch { }
    }, [savedSelections]);

    // fetch popup gifts
    const fetchDiscountPopupAndReturn = useCallback(
        async (): Promise<GiftItem[] | null> => {
            const token = await getAuthToken();

            if (!token) {
                return null;
            }

            const storeCode =
                typeof window !== "undefined"
                    ? localStorage.getItem(
                        "selectedStoreCode"
                    ) ||
                    document.cookie.match(
                        /NEXT_STORE=([^;]+)/
                    )?.[1] ||
                    document.cookie.match(
                        /NEXT_LOCALE=([^;]+)/
                    )?.[1] ||
                    ""
                    : "";

            const storeParam = storeCode
                ? `?store=${encodeURIComponent(storeCode)}`
                : "";

            try {
                const res = await fetch(
                    `/api/kleverapi/cart/discount-popup${storeParam}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type":
                                "application/json",
                        },
                    }
                );

                if (!res.ok) {
                    return null;
                }

                const data = await res.json();

                console.log("[GiftContext] discount-popup raw:", {
                    auto_open_popup: data.auto_open_popup,
                    common_qty: data.common_qty,
                    promo_rules_count: Array.isArray(data.promo_rules) ? data.promo_rules.length : "n/a",
                });

                // ── Full debug dump ──────────────────────────────────────
                console.log("[GiftContext] raw popup response:", JSON.stringify(data).slice(0, 1000));
                console.log("[GiftContext] promo_rules from response:", Array.isArray(data.promo_rules) ? data.promo_rules.length : "not array", data.promo_rules);
                console.log("[GiftContext] auto_open_popup:", data.auto_open_popup);
                console.log("[GiftContext] common_qty:", data.common_qty);
                console.log("[GiftContext] subtotal:", data.subtotal);

                // Store auto_open_popup from server — false means "don't trigger
                // auto-open this time" (e.g. gifts already in cart, rule off).
                const serverAutoOpen = Boolean(data.auto_open_popup);
                setAutoOpenPopup(serverAutoOpen);

                // Top-level common_qty is a global max across all rules; used as
                // fallback when individual rule.max_qty is null.
                const topCommonQty: number | null =
                    typeof data.common_qty === "number" ? data.common_qty : null;

                let promoRules: any[] = [];

                if (Array.isArray(data)) {
                    promoRules = data;
                } else if (
                    Array.isArray(data.promo_rules)
                ) {
                    promoRules = data.promo_rules;
                } else if (Array.isArray(data.rules)) {
                    promoRules = data.rules;
                } else if (Array.isArray(data.items)) {
                    promoRules = data.items;
                } else if (
                    data.data &&
                    Array.isArray(data.data)
                ) {
                    promoRules = data.data;
                } else if (data.popup_data) {
                    promoRules =
                        data.popup_data.promo_rules ??
                        data.popup_data.rules ??
                        [];
                }

                console.log("[GiftContext] promoRules extracted:", promoRules.length, promoRules.slice(0, 2));

                if (promoRules.length === 0) {
                    setAvailableGifts([]);
                    return null;
                }

                const { gifts, maxQty, firstRuleName } =
                    parsePromoRules(promoRules, topCommonQty);

                console.log("[GiftContext] Fetched gifts:", {
                    count: gifts.length,
                    maxQty,
                    firstRuleName,
                    autoOpen: serverAutoOpen,
                });

                setAvailableGifts(gifts);
                setMaxGifts(maxQty);
                if (firstRuleName) setPromoRuleName(firstRuleName);

                return gifts;
            } catch (err) {
                console.error(
                    "[GiftContext] fetch error:",
                    err
                );

                return null;
            }
        },
        []
    );

    const fetchDiscountPopup = useCallback(async () => {
        await fetchDiscountPopupAndReturn();
    }, [fetchDiscountPopupAndReturn]);

    // A cart item only counts as a "selected gift" when it's actually free
    // (price === 0). Without this guard, a paid product whose SKU happens to
    // overlap with a gift-eligible SKU would be miscounted, making
    // isAllGiftsSelected fire prematurely and blocking the auto-open popup.
    const isFreeGiftItem = (item: { sku: string; price?: number }) =>
        Number(item.price || 0) === 0 &&
        availableGifts.some((gift) => gift.sku === item.sku);

    const hasGifts =
        availableGifts.length > 0 &&
        (cart?.items?.some(isFreeGiftItem) || false);

    const totalSelectedGifts = (cart?.items || [])
        .filter(isFreeGiftItem)
        .reduce(
            (sum, item) => sum + Number(item.qty || 0),
            0
        );

    const isAllGiftsSelected =
        availableGifts.length > 0 &&
        maxGifts > 0 &&
        totalSelectedGifts >= maxGifts;

    // fetch gifts when cart changes
    // useEffect(() => {
    //     if (
    //         cart?.items_count &&
    //         cart.items_count > 0
    //     ) {
    //         fetchDiscountPopup();
    //     } else {
    //         if (availableGifts.length > 0) {
    //             setAvailableGifts([]);
    //         }
    //     }
    // }, [cart?.items_count]);

    // // open popup automatically
    // useEffect(() => {
    //     const isCartPage =
    //         pathname?.endsWith("/cart") ||
    //         pathname === "/cart";

    //     const totalUnits = cart?.items_count || 0;

    //     if (
    //         isCartPage &&
    //         totalUnits > 0 &&
    //         availableGifts.length > 0 &&
    //         !hasGifts &&
    //         !hasSeenRef.current
    //     ) {
    //         // setIsGiftModalOpen(true);
    //         // hasSeenRef.current = true;
    //         setTimeout(() => {
    //             setIsGiftModalOpen(true);
    //             hasSeenRef.current = true;
    //         }, 300);
    //     }
    // }, [
    //     pathname,
    //     cart?.items_count,
    //     availableGifts,
    //     hasGifts,
    // ]);

    useEffect(() => {
        const isCartPage = isCartPathname(pathname);

        if (
            (cart?.items_count && cart.items_count > 0) ||
            (isCartPage && (cart?.items_count || 0) > 0)
        ) {
            fetchDiscountPopup();
        } else {
            if (availableGifts.length > 0) {
                setAvailableGifts([]);
            }
        }
    }, [cart?.items_count, pathname, fetchDiscountPopup]);

    // Listen to the `cart-updated` event which CartContext dispatches AFTER every
    // mutation API call completes (add/update/remove/sync). This is more reliable
    // than watching `cart.items_count` alone because:
    //   1) The event fires after Magento has already processed the change, so the
    //      discount-popup query sees the correct cart state.
    //   2) It fires even when the total items_count stays the same (e.g., user
    //      increased one SKU's qty and decreased another by the same amount), which
    //      would otherwise miss the gift-eligibility re-check.
    useEffect(() => {
        const onCartUpdated = () => {
            if ((cart?.items_count ?? 0) > 0) {
                fetchDiscountPopup();
            }
        };
        window.addEventListener("cart-updated", onCartUpdated);
        return () => window.removeEventListener("cart-updated", onCartUpdated);
    }, [cart?.items_count, fetchDiscountPopup]);

    // ADD THIS
    useEffect(() => {
        if (!cart?.items_count || cart.items_count <= 0) {
            hasSeenRef.current = false;
        }
    }, [cart?.items_count]);

    // // open popup automatically
    // useEffect(() => {
    //     const isCartPage =
    //         pathname?.endsWith("/cart") ||
    //         pathname === "/cart";

    //     const totalUnits = cart?.items_count || 0;

    //     if (
    //         isCartPage &&
    //         totalUnits > 0 &&
    //         availableGifts.length > 0 &&
    //         !hasGifts &&
    //         !hasSeenRef.current
    //     ) {
    //         setTimeout(() => {
    //             setIsGiftModalOpen(true);
    //             hasSeenRef.current = true;
    //         }, 300);
    //     }
    // }, [
    //     pathname,
    //     cart?.items_count,
    //     availableGifts,
    //     hasGifts,
    // ]);
    // reset hasSeenRef when navigating away from cart
    useEffect(() => {
        if (!isCartPathname(pathname)) {
            hasSeenRef.current = false;
        }
    }, [pathname]);

    // reset hasSeenRef if user becomes eligible for more gifts
    useEffect(() => {
        if (
            maxGifts > prevMaxGiftsRef.current ||
            availableGifts.length >
            prevAvailableCountRef.current
        ) {
            hasSeenRef.current = false;
        }
        prevMaxGiftsRef.current = maxGifts;
        prevAvailableCountRef.current =
            availableGifts.length;
    }, [maxGifts, availableGifts.length]);

    // auto open if not all gifts selected
    useEffect(() => {
        const isCartPage = isCartPathname(pathname);
        const totalUnits = cart?.items_count || 0;

        console.log("[GiftContext] Auto-open check:", {
            pathname,
            isCartPage,
            totalUnits,
            availableGiftsCount: availableGifts.length,
            autoOpenPopup,
            totalSelectedGifts,
            maxGifts,
            isAllGiftsSelected,
            hasSeen: hasSeenRef.current,
            isModalOpen: isGiftModalOpen,
        });

        if (
            isCartPage &&
            totalUnits > 0 &&
            availableGifts.length > 0 &&
            autoOpenPopup &&
            !isAllGiftsSelected &&
            !hasSeenRef.current &&
            !isGiftModalOpen
        ) {
            const timer = setTimeout(() => {
                console.log("[GiftContext] Triggering auto-open...");
                setIsGiftModalOpen(true);
                hasSeenRef.current = true;
            }, 300);

            return () => clearTimeout(timer);
        }
    }, [
        pathname,
        cart?.items_count,
        availableGifts,
        autoOpenPopup,
        isAllGiftsSelected,
        isGiftModalOpen,
        maxGifts,
        totalSelectedGifts,
    ]);

    // TEMP DEBUG: track every isGiftModalOpen change to spot rogue closers
    useEffect(() => {
        console.log(
            `[GiftContext] ⚡ isGiftModalOpen changed → ${isGiftModalOpen}`,
            new Error("trace").stack?.split("\n").slice(1, 5).join("\n")
        );
    }, [isGiftModalOpen]);

    // manual open
    const openGiftModal = useCallback(async () => {
        // hasSeenRef.current = false;

        await fetchDiscountPopupAndReturn();

        setIsGiftModalOpen(true);
    }, [fetchDiscountPopupAndReturn]);

    // add gifts
    const handleSelectGifts = async (
        selections: Record<string, number>
    ) => {
        const selectedEntries = Object.entries(
            selections
        ).filter(([_, qty]) => qty > 0);

        if (selectedEntries.length === 0) {
            setIsGiftModalOpen(false);
            return;
        }

        const token = await getAuthToken();

        if (!token) {
            toast.error(
                "Please log in to add gifts."
            );

            return;
        }

        const toastId = toast.loading(
            "Adding your free gifts..."
        );

        const items = selectedEntries
            .map(([id, qty]) => {
                const gift = availableGifts.find(
                    (g) => g.id === id
                );

                if (!gift) return null;

                return {
                    sku: gift.sku,
                    rule_id: gift.rule_id,
                    qty,
                };
            })
            .filter(Boolean);

        const addStoreCode =
            typeof window !== "undefined"
                ? localStorage.getItem(
                    "selectedStoreCode"
                ) ||
                document.cookie.match(
                    /NEXT_STORE=([^;]+)/
                )?.[1] ||
                ""
                : "";

        const addStoreParam = addStoreCode
            ? `?store=${encodeURIComponent(
                addStoreCode
            )}`
            : "";

        try {
            const res = await fetch(
                `/api/kleverapi/cart/promo-items/add${addStoreParam}`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        items,
                    }),
                }
            );

            const data = await res.json();

            if (!res.ok) {
                toast.error(
                    data.message ||
                    "Failed to add gifts.",
                    {
                        id: toastId,
                    }
                );
            } else {
                const addedGiftNames = selectedEntries
                    .map(([id]) => {
                        const gift = availableGifts.find((g) => g.id === id);
                        return gift ? gift.name : null;
                    })
                    .filter(Boolean);

                const successMessage =
                    addedGiftNames.length > 1
                        ? `Free gifts ${addedGiftNames.join(", ")} were added to your shopping cart`
                        : `Free gift ${addedGiftNames[0]} was added to your shopping cart`;

                toast.success(
                    successMessage,
                    {
                        id: toastId,
                    }
                );

                setSavedSelections({});
                setIsGiftModalOpen(false);

                await refetchCart();

                window.dispatchEvent(
                    new Event("cart-updated")
                );
            }
        } catch (err) {
            console.error(
                "[GiftContext] add gifts error:",
                err
            );

            toast.error(
                "Failed to add gifts.",
                {
                    id: toastId,
                }
            );
        }
    };

    const remaining = Math.max(0, maxGifts - totalSelectedGifts);

    return (
        <GiftContext.Provider
            value={{
                isGiftModalOpen,
                setIsGiftModalOpen,
                openGiftModal,
                availableGifts,
                hasGifts,
                isAllGiftsSelected,
                fetchDiscountPopup,
                promoRuleName,
            }}
        >
            {children}

            {(() => {
                console.log(
                    `[GiftContext] 🎨 RENDER gate — isGiftModalOpen=${isGiftModalOpen}, availableGifts.length=${availableGifts.length}, willRender=${isGiftModalOpen && availableGifts.length > 0}`
                );
                return null;
            })()}
            {isGiftModalOpen &&
                availableGifts.length > 0 && (
                    <GiftModal
                        isOpen={isGiftModalOpen}
                        onClose={() => {
                            console.log("[GiftContext] ❌ GiftModal.onClose called");
                            setIsGiftModalOpen(false);
                        }}
                        onSelectGifts={
                            handleSelectGifts
                        }
                        maxGifts={maxGifts}
                        availableGifts={
                            availableGifts
                        }
                        initialSelections={
                            savedSelections
                        }
                        onSelectionsChange={
                            setSavedSelections
                        }
                        ruleName={promoRuleName}
                        remaining={remaining}
                    />
                )}
        </GiftContext.Provider>
    );
}

export function useGift() {
    const context = useContext(GiftContext);

    if (context === undefined) {
        throw new Error(
            "useGift must be used within a GiftProvider"
        );
    }

    return context;
}