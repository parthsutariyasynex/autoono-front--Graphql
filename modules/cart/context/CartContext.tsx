"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
  useRef,
} from "react";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { getAuthToken } from "@/lib/api/api-client";

const CART_STORE_CODE_RE = /^[A-Za-z0-9_]+_(en|ar)$/;

// URL-only store code for cart isolation — never reads localStorage or cookies.
// getClientStoreCode() falls back to localStorage["selectedStoreCode"] (written by
// ProductsListing when browsing a warehouse), which would make All-Warehouse pages
// appear to belong to the last-visited warehouse and bleed its cart across stores.
function getCartStoreCode(): string {
  if (typeof window === "undefined") return "";
  const seg = window.location.pathname.split("/").filter(Boolean)[0] || "";
  return CART_STORE_CODE_RE.test(seg) ? seg : "";
}

export interface CartItem {
  item_id: number;
  sku: string;
  name: string;
  price: number;
  qty: number;
  image_url: string;
  product_url?: string;
  size_display?: string;
  pattern_display?: string;
  row_total: number;
  discount_amount?: number;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  tax_amount: number;
  tax_label: string;
  shipping_amount: number;
  grand_total: number;
  currency_code: string;
  items_count: number;
  cart_id: number | string | null;
  discount_amount?: number;
  applied_coupons?: Array<{ code: string }>;
}

interface CartContextType {
  cart: Cart | null;
  isLoading: boolean;
  isCartSyncing: boolean;
  error: string | null;
  addToCart: (sku: string, qty: number) => Promise<void>;
  updateCartItem: (itemId: number, qty: number) => Promise<void>;
  removeFromCart: (itemId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refetchCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function isAuthError(status: number): boolean {
  return status === 401 || status === 403;
}

function handleAuthError() {
  console.warn("Cart: token expired or unauthorized — signing out");
  const locale = typeof window !== "undefined" && window.location.pathname.startsWith("/ar") ? "ar" : "en";
  // redirect:false + manual navigation keeps us on the current origin;
  // NextAuth's internal redirect falls back to http://localhost:3000.
  signOut({ redirect: false }).finally(() => {
    if (typeof window !== "undefined") window.location.href = `/${locale}/login`;
  });
}

export function getWarehouseKey(storeCode: string): string {
  if (!storeCode) return "cart_allwarehouse";
  // Strip _en/_ar suffix so EN and AR views of the same warehouse share one isolated
  // cart key. V202_en and V202_ar both become cart_v202, preventing the sync logic
  // from treating a locale switch as a warehouse change and clearing the cart.
  const base = storeCode.replace(/_(en|ar)$/i, "");
  return `cart_${base.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCartSyncing, setIsCartSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pathname = usePathname();
  const isFetching = useRef(false);
  const pendingFetch = useRef(false);
  const isSyncing = useRef(false);
  // Tracks which warehouse key was last synced so pathname changes within the same
  // warehouse (e.g. /en/products → /en/cart) don't re-trigger a full sync.
  const prevStoreKeyRef = useRef<string | null>(null);

  const fetchCart = useCallback(async (showLoader = true, _retry = 0) => {
    // If already fetching, mark a pending fetch so we re-run once current one finishes
    if (isFetching.current) {
      pendingFetch.current = true;
      return;
    }
    try {
      isFetching.current = true;
      pendingFetch.current = false;
      if (showLoader) setIsLoading(true);
      setError(null);

      const token = await getAuthToken();
      if (!token) {
        setCart(null);
        return;
      }

      // Read locale from URL (most up-to-date during language switch)
      const pathLocale = window.location.pathname.startsWith("/ar") ? "ar" : "en";
      const storeCode = getCartStoreCode();
      console.log(`[CartFetch] locale=${pathLocale} storeCode="${storeCode}" warehouseKey="${getWarehouseKey(storeCode)}"`);
      const res = await fetch("/api/kleverapi/cart", {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-locale": pathLocale,
          ...(storeCode && { "x-store-code": storeCode }),
        },
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        if (isAuthError(res.status)) {
          // Retry once after delay (handles post-login race condition)
          if (_retry < 1) {
            await new Promise(r => setTimeout(r, 1000));
            return fetchCart(showLoader, _retry + 1);
          }
          setCart(null);
          handleAuthError();
          return;
        }
        // Backend down or server error — fail silently
        setCart(null);
        return;
      }

      // Normalize Magento kleverapi/cart response
      // Sometimes items are in data.items, sometimes in data.cart.items
      const rawItems = Array.isArray(data.items) ? data.items
        : Array.isArray(data.cart?.items) ? data.cart.items
          : [];

      // Ensure each item has the fields requested by the user
      const items: CartItem[] = rawItems.map((item: any) => ({
        item_id: Number(item.item_id),
        sku: item.sku,
        name: item.name,
        price: Number(item.price || 0),
        qty: Number(item.qty || 0),
        image_url: item.image_url || "/images/tyre-sample.png",
        product_url: item.product_url,
        size_display: item.size_display,
        pattern_display: item.pattern_display,
        row_total: Number(item.row_total || 0),
        discount_amount: item.discount_amount ? Number(item.discount_amount) : undefined,
      }));
      console.log(`[CartFetch] rawItems=${rawItems.length} mappedItems=${items.length} skus=${JSON.stringify(items.map(i => i.sku))}`);

      const subtotal = Number(data.subtotal ?? data.cart?.subtotal ?? 0);
      const tax_amount = Number(data.tax_amount ?? data.cart?.tax_amount ?? 0);
      const tax_label = data.tax_label ?? data.cart?.tax_label ?? "Tax";
      const shipping_amount = Number(data.shipping_amount ?? data.cart?.shipping_amount ?? 0);
      const grand_total = Number(data.grand_total ?? data.cart?.grand_total ?? subtotal);
      const currency_code = data.currency_code ?? data.cart?.currency_code ?? "SAR";
      // Magento's kleverapi/cart does not return a discount field directly.
      // Derive it from the totals: discount = subtotal + tax - grand_total (0 when no discount)
      const derived = subtotal + tax_amount - grand_total;
      const discount_amount = derived > 0.005 ? Math.round(derived * 100) / 100 : 0;

      // Calculate total units instead of unique SKUs for navbar count
      const items_count = items.reduce((sum: number, i: CartItem) => sum + i.qty, 0);
      const cart_id = data.cart_id ?? data.cart?.cart_id ?? null;
      console.log(`[CartFetch] cartId=${cart_id} subtotal=${subtotal} grandTotal=${grand_total} items=${items.length}`);
      const applied_coupons = Array.isArray(data.applied_coupons)
        ? data.applied_coupons.filter((c: { code?: unknown }) => c && typeof c.code === "string")
        : [];

      setCart({ items, subtotal, tax_amount, tax_label, shipping_amount, grand_total, currency_code, items_count, cart_id, discount_amount, applied_coupons });
    } catch {
      // Network error or backend unreachable — fail silently
      setCart(null);
    } finally {
      isFetching.current = false;
      if (showLoader) setIsLoading(false);
      // If another fetch was requested while we were running, do it now
      if (pendingFetch.current) {
        pendingFetch.current = false;
        fetchCart(false);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const performSync = async () => {
      if (isSyncing.current) return;
      isSyncing.current = true;
      const token = await getAuthToken();
      if (!token) {
        isSyncing.current = false;
        return;
      }

      const storeCode = getCartStoreCode();
      const activeKey = getWarehouseKey(storeCode);
      let lastSynced = localStorage.getItem("current_synced_cart_warehouse");
      // lastSyncedStoreCode is the real Magento store code for the previously-synced
      // warehouse (e.g. "Anwar_Khaled_en"). We store it so Step 1 can fetch the cart
      // using the correct warehouse URL, not just the locale fallback.
      const lastSyncedStoreCode = localStorage.getItem("current_synced_cart_storecode") || "";

      console.log(`[CartSync] pathname=${pathname} storeCode="${storeCode}" activeKey="${activeKey}" lastSynced="${lastSynced}" lastSyncedStoreCode="${lastSyncedStoreCode}"`);

      // MIGRATION A: old key format was cart_FIRSTWORD (e.g. cart_anwar), current format is
      // cart_BASESTORECODE (e.g. cart_anwar_khaled, no locale suffix). If lastSynced is a
      // prefix of activeKey they represent the same warehouse — rename without doing a full sync.
      if (lastSynced && lastSynced !== activeKey && activeKey.startsWith(lastSynced + "_")) {
        const oldData = localStorage.getItem(lastSynced);
        if (oldData) {
          localStorage.setItem(activeKey, oldData);
          localStorage.removeItem(lastSynced);
        }
        localStorage.setItem("current_synced_cart_warehouse", activeKey);
        lastSynced = activeKey;
      }

      // MIGRATION B: locale-suffixed keys (e.g. cart_v202_en) → normalized base keys
      // (e.g. cart_v202). Runs once after deploy for existing users who had locale-specific keys.
      if (lastSynced && lastSynced !== activeKey) {
        const migratedKey = lastSynced.replace(/_(en|ar)$/, "");
        if (migratedKey === activeKey) {
          console.log(`[CartSync] Locale-key migration: ${lastSynced} → ${activeKey}`);
          if (!localStorage.getItem(activeKey)) {
            const oldData = localStorage.getItem(lastSynced);
            if (oldData) localStorage.setItem(activeKey, oldData);
          }
          localStorage.setItem("current_synced_cart_warehouse", activeKey);
          lastSynced = activeKey;
        }
      }

      if (lastSynced === activeKey) {
        // Same warehouse (possibly different locale) — keep storecode current and refetch.
        if (storeCode) localStorage.setItem("current_synced_cart_storecode", storeCode);
        isSyncing.current = false;
        fetchCart(false);
        return;
      }

      // Warehouse changed or first visit — swap cart contents so each store is isolated.
      // Runs entirely in the background; does NOT set isLoading so the page renders
      // immediately while sync completes behind the scenes.
      // lastSynced === null means first visit / localStorage cleared.
      console.log(`[CartSync] Warehouse switch: ${lastSynced || "none"} → ${activeKey}`);
      const pathLocale = window.location.pathname.startsWith("/ar") ? "ar" : "en";

      // Signal to checkout that cart contents are being swapped — APIs that require
      // an active cart (set shipping method, PO upload/delete) must wait.
      setIsCartSyncing(true);
      try {
        // Steps 1+2 combined: one fetch to snapshot + clear the previous warehouse cart.
        // Avoids the previous pattern of fetching the same cart twice (once to save,
        // once to read item_ids for removal). Skip on first visit (lastSynced is null).
        if (lastSynced) {
          try {
            const cartRes = await fetch("/api/kleverapi/cart", {
              headers: {
                Authorization: `Bearer ${token}`,
                "x-locale": pathLocale,
                ...(lastSyncedStoreCode && { "x-store-code": lastSyncedStoreCode }),
              },
              cache: "no-store",
            });
            if (cartRes.ok) {
              const cartData = await cartRes.json();
              const rawItems = Array.isArray(cartData.items) ? cartData.items
                : (Array.isArray(cartData.cart?.items) ? cartData.cart.items : []);

              // Step 1: Persist paid items so they can be restored on warehouse switch-back.
              // Promo/free-gift items (price === 0) are NOT saved — they re-appear via
              // the gift popup and must not bleed across warehouse carts.
              const itemsToSave = rawItems
                .filter((item: any) => Number(item.price || 0) > 0)
                .map((item: any) => ({ sku: item.sku, qty: Number(item.qty || 1) }));
              console.log(`[CartSync] Saving ${itemsToSave.length} item(s) for ${lastSynced}`);
              localStorage.setItem(lastSynced, JSON.stringify(itemsToSave));

              // Step 2: Clear backend cart in parallel using the same item list.
              // Avoids /cart/clear — that deletes the Magento quote entirely, causing
              // every subsequent API (menu, notifications, my-account) to return 500.
              await Promise.all(rawItems.map((item: any) =>
                fetch(`/api/kleverapi/cart/remove/${item.item_id}`, {
                  method: "DELETE",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "x-locale": pathLocale,
                    ...(lastSyncedStoreCode && { "x-store-code": lastSyncedStoreCode }),
                  },
                }).catch(() => { })
              ));
            }
          } catch { /* non-critical — continue with switch */ }
        }

        // Step 3: Re-populate backend cart with only the active warehouse's saved items.
        const savedRaw = localStorage.getItem(activeKey);
        if (!savedRaw) localStorage.setItem(activeKey, "[]");
        const savedItems: Array<{ sku: string; qty: number }> = (() => {
          try { return JSON.parse(savedRaw || "[]"); } catch { return []; }
        })();

        console.log(`[CartSync] Restoring ${savedItems.length} item(s) for ${activeKey} (${storeCode || "locale"})`);
        const addHeaders = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "x-locale": pathLocale,
          ...(storeCode && { "x-store-code": storeCode }),
        };
        // After a cart clear, Magento may need a moment to create a new quote.
        // If the first add returns 5xx, wait 1.5s and retry once before giving up.
        let firstAddFailed = false;
        for (const item of savedItems) {
          if (!item.sku || !item.qty) continue;
          try {
            if (firstAddFailed) await new Promise(r => setTimeout(r, 1500));
            const addRes = await fetch("/api/kleverapi/cart/add", {
              method: "POST",
              headers: addHeaders,
              body: JSON.stringify({ sku: item.sku, qty: item.qty }),
            });
            if (!addRes.ok) {
              if (addRes.status >= 500 && !firstAddFailed) {
                firstAddFailed = true;
                await new Promise(r => setTimeout(r, 1500));
                const retry = await fetch("/api/kleverapi/cart/add", {
                  method: "POST",
                  headers: addHeaders,
                  body: JSON.stringify({ sku: item.sku, qty: item.qty }),
                });
                if (!retry.ok) console.warn(`[CartSync] Retry also failed for SKU ${item.sku} (${retry.status})`);
              } else {
                console.warn(`[CartSync] Failed to re-add SKU ${item.sku} (${addRes.status})`);
              }
            }
          } catch (e) {
            console.warn(`[CartSync] Exception re-adding SKU ${item.sku}:`, e);
          }
        }

        localStorage.setItem("current_synced_cart_warehouse", activeKey);
        // Persist the store code so next switch can fetch from the correct warehouse URL
        if (storeCode) localStorage.setItem("current_synced_cart_storecode", storeCode);
        else localStorage.removeItem("current_synced_cart_storecode");
      } finally {
        isSyncing.current = false;
        setIsCartSyncing(false);
        setIsLoading(false);
        await fetchCart(false);
        window.dispatchEvent(new Event("cart-updated"));
      }
    };

    performSync();
  }, [pathname, fetchCart]);

  // Re-fetch cart when locale changes (cart labels come from Magento in locale)
  useEffect(() => {
    const onLocaleChanged = () => fetchCart();
    window.addEventListener("locale-changed", onLocaleChanged);
    return () => window.removeEventListener("locale-changed", onLocaleChanged);
  }, [fetchCart]);

  const addToCart = async (sku: string, qty: number) => {
    try {
      setError(null);
      const token = await getAuthToken();
      if (!token) throw new Error("Not authenticated");

      // Check if item already exists in cart to update its quantity instead of adding a duplicate
      const existingItem = cart?.items?.find((item) => item.sku === sku);

      if (existingItem) {
        // Increment existing quantity
        const newQty = existingItem.qty + qty;
        await updateCartItem(existingItem.item_id, newQty);
        return;
      }

      // Update warehouse storage first
      const storeCode = getCartStoreCode();
      const activeKey = getWarehouseKey(storeCode);
      const savedItems = JSON.parse(localStorage.getItem(activeKey) || "[]");
      const itemIndex = savedItems.findIndex((i: any) => i.sku === sku);
      if (itemIndex > -1) {
        savedItems[itemIndex].qty += qty;
      } else {
        savedItems.push({ sku, qty });
      }
      localStorage.setItem(activeKey, JSON.stringify(savedItems));

      const pathLocale = window.location.pathname.startsWith("/ar") ? "ar" : "en";
      const res = await fetch("/api/kleverapi/cart/add", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "x-locale": pathLocale,
          ...(storeCode && { "x-store-code": storeCode }),
        },
        body: JSON.stringify({ sku, qty }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (isAuthError(res.status)) { handleAuthError(); return; }
        throw new Error(data.message || "Failed to add item");
      }

      await fetchCart();
      window.dispatchEvent(new Event("cart-updated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add item");
      throw err;
    }
  };

  const updateCartItem = async (itemId: number, qty: number) => {
    try {
      setError(null);
      const token = await getAuthToken();
      if (!token) throw new Error("Not authenticated");

      // If qty is less than 1, remove the item instead
      if (qty < 1) {
        await removeFromCart(itemId);
        return;
      }

      // Update warehouse storage first
      const itemToUpdate = cart?.items?.find(i => i.item_id === itemId);
      if (itemToUpdate) {
        const storeCode = getCartStoreCode();
        const activeKey = getWarehouseKey(storeCode);
        const savedItems = JSON.parse(localStorage.getItem(activeKey) || "[]");
        const itemIndex = savedItems.findIndex((i: any) => i.sku === itemToUpdate.sku);
        if (itemIndex > -1) {
          savedItems[itemIndex].qty = qty;
          localStorage.setItem(activeKey, JSON.stringify(savedItems));
        }
      }

      // Optimistically update local state so UI reflects change immediately
      setCart(prev => {
        if (!prev) return null;
        const updatedItems = prev.items.map(i =>
          i.item_id === itemId ? { ...i, qty, row_total: i.price * qty } : i
        );
        const items_count = updatedItems.reduce((s, i) => s + i.qty, 0);
        return { ...prev, items: updatedItems, items_count };
      });

      const pathLocale = window.location.pathname.startsWith("/ar") ? "ar" : "en";
      const storeCode = getCartStoreCode();
      const res = await fetch(`/api/kleverapi/cart/update/${itemId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "x-locale": pathLocale,
          ...(storeCode && { "x-store-code": storeCode }),
        },
        body: JSON.stringify({ qty, cart_id: cart?.cart_id }),
      });

      if (!res.ok) {
        if (isAuthError(res.status)) { handleAuthError(); return; }
        const data = await res.json();
        throw new Error(data.message || "Failed to update cart");
      }

      // Don't fetchCart here — caller (handleUpdateCart) does a single refetch at the end
      window.dispatchEvent(new Event("cart-updated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update cart");
      throw err;
    }
  };

  const removeFromCart = async (itemId: number) => {
    console.log(`[Cart Remove] ── START itemId=${itemId}`);
    console.log(`[Cart Remove] Current cart items:`, cart?.items?.map(i => ({ item_id: i.item_id, sku: i.sku, name: i.name?.slice(0, 30) })));

    try {
      const token = await getAuthToken();
      if (!token) throw new Error("Not authenticated");

      // Snapshot the item before any mutation.
      // Use Object.is so NaN===NaN resolves correctly if Magento ever returns UID-based IDs.
      const itemToRemove = cart?.items?.find(i => Object.is(i.item_id, itemId));
      console.log(`[Cart Remove] itemToRemove:`, itemToRemove ?? "NOT FOUND in local state");

      // Update warehouse storage first
      if (itemToRemove) {
        const storeCode = getCartStoreCode();
        const activeKey = getWarehouseKey(storeCode);
        const savedItems = JSON.parse(localStorage.getItem(activeKey) || "[]");
        const filteredItems = savedItems.filter((i: any) => i.sku !== itemToRemove.sku);
        localStorage.setItem(activeKey, JSON.stringify(filteredItems));
      }

      const pathLocale = window.location.pathname.startsWith("/ar") ? "ar" : "en";
      const storeCode = getCartStoreCode();

      const callRemoveAPI = async (id: number) => {
        console.log(`[Cart Remove] DELETE /api/kleverapi/cart/remove/${id}`);
        const r = await fetch(`/api/kleverapi/cart/remove/${id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "x-locale": pathLocale,
            ...(storeCode && { "x-store-code": storeCode }),
          },
        });
        console.log(`[Cart Remove] Response status: ${r.status}`);
        if (!r.ok) {
          if (isAuthError(r.status)) { handleAuthError(); return null; }
          const d = await r.json();
          console.error(`[Cart Remove] API error:`, d);
          throw new Error(d.message || "Failed to remove item");
        }
        const data = await r.json();
        console.log(`[Cart Remove] Response items:`, (data?.items as any[] | undefined)?.map((i: any) => ({ item_id: i.item_id, sku: i.sku })) ?? "(no items in response)");
        return data;
      };

      // Helper: check whether the target item is still present in a response payload.
      // Prefers SKU match (stable across cart rebuilds) and falls back to item_id.
      const targetSku = itemToRemove?.sku;
      const findInResponse = (data: any): { sku: string; item_id: number } | null => {
        if (!Array.isArray(data?.items)) return null;
        const items = data.items as Array<{ sku: string; item_id: number }>;
        if (targetSku) return items.find(i => i.sku === targetSku) ?? null;
        // No SKU available (rare — itemToRemove was not in local state): fall back to item_id
        return items.find(i => Number(i.item_id) === itemId) ?? null;
      };

      // ── First attempt ───────────────────────────────────────────────
      let responseData = await callRemoveAPI(itemId);

      // ── Stale-ID retry ──────────────────────────────────────────────
      // The route stamps __guard_fired:true when it short-circuits WITHOUT calling
      // the mutation (stale item_id — Magento rebuilt the cart after a gift selection).
      // In that case find the current item_id from the response and retry.
      //
      // IMPORTANT: do NOT retry when __guard_fired is absent (false/undefined).
      // That means the mutation ran successfully — if the same SKU appears again in
      // the response it was put back by a promo rule, which is correct server behaviour.
      if (responseData?.__guard_fired === true) {
        const freshItem = findInResponse(responseData);
        if (freshItem) {
          console.warn(`[Cart Remove] Guard fired — mutation never ran. Retrying with fresh item_id=${freshItem.item_id} (sku=${freshItem.sku})`);
          responseData = await callRemoveAPI(freshItem.item_id);
        }
      }

      // ── Verify removal (guard-fire path only) ──────────────────────
      // If the retry also fired the guard, the item genuinely cannot be found;
      // throw so the upstream caller shows an error toast instead of success.
      if (responseData?.__guard_fired === true) {
        const stillAfterRetry = findInResponse(responseData);
        if (stillAfterRetry) {
          console.error(`[Cart Remove] Item STILL present after retry (guard fired twice) — sku=${targetSku ?? "unknown"}. Throwing error.`);
          throw new Error("Item could not be removed from cart. Please refresh and try again.");
        }
      }

      console.log(`[Cart Remove] Server confirmed removal. Updating local state.`);

      // ── State update ────────────────────────────────────────────────
      // Use the server response items as the authoritative list so both the removed
      // item and any auto-removed gift items are reflected immediately.
      // Merge size_display / pattern_display from the previous state since the remove
      // route (reshapeCustomerCart) does not return those display-only attributes.
      setCart(prev => {
        if (!prev) return null;

        let updatedItems: CartItem[];

        if (Array.isArray(responseData?.items)) {
          const prevBySku: Record<string, CartItem> = {};
          for (const p of prev.items) {
            if (p.sku) prevBySku[p.sku] = p;
          }
          updatedItems = (responseData.items as Array<any>).map((ri): CartItem => {
            const existing = prevBySku[ri.sku];
            return {
              item_id: Number(ri.item_id),
              sku: ri.sku,
              name: ri.name ?? existing?.name ?? "",
              price: Number(ri.price ?? 0),
              qty: Number(ri.qty ?? 0),
              image_url: ri.image_url || existing?.image_url || "/images/tyre-sample.png",
              product_url: ri.product_url ?? existing?.product_url,
              size_display: existing?.size_display,
              pattern_display: existing?.pattern_display,
              row_total: Number(ri.row_total ?? 0),
              discount_amount: ri.discount_amount ? Number(ri.discount_amount) : existing?.discount_amount,
            };
          });
        } else {
          // Fallback: optimistic filter when response has no items list
          updatedItems = prev.items.filter(i =>
            targetSku ? i.sku !== targetSku : !Object.is(i.item_id, itemId)
          );
        }

        const items_count = updatedItems.reduce((s, i) => s + i.qty, 0);
        const subtotal = responseData?.subtotal ?? prev.subtotal;
        const tax_amount = responseData?.tax_amount ?? prev.tax_amount;
        const tax_label = responseData?.tax_label ?? prev.tax_label;
        const shipping_amount = responseData?.shipping_amount ?? prev.shipping_amount ?? 0;
        const grand_total = responseData?.grand_total ?? prev.grand_total;
        const derived = subtotal + tax_amount - grand_total;
        const discount_amount = derived > 0.005
          ? Math.round(derived * 100) / 100
          : (prev.discount_amount ?? 0);
        const applied_coupons = responseData?.applied_coupons ?? prev.applied_coupons;

        console.log(`[Cart Remove] State updated → items_count=${items_count} subtotal=${subtotal} grand_total=${grand_total}`);
        return { ...prev, items: updatedItems, items_count, subtotal, tax_amount, tax_label, shipping_amount, grand_total, discount_amount, applied_coupons };
      });

      window.dispatchEvent(new Event("cart-updated"));

      // Background re-fetch syncs any additional Magento side-effects (promo rule
      // recalculation, auto-removed gift items, updated shipping).
      // This runs AFTER the state is already correct so it only refines totals.
      fetchCart(false);
    } catch (err) {
      console.error(`[Cart Remove] ── ERROR:`, err);
      // Do NOT set global cart error — remove failures are handled locally
      // by the caller (handleRemove in CartPage shows a toast instead).
      throw err;
    }
  };

  const clearCart = async () => {
    try {
      setError(null);
      const token = await getAuthToken();
      if (!token) throw new Error("Not authenticated");

      // Update warehouse storage first
      const storeCode = getCartStoreCode();
      const activeKey = getWarehouseKey(storeCode);
      localStorage.setItem(activeKey, JSON.stringify([]));

      const pathLocale = window.location.pathname.startsWith("/ar") ? "ar" : "en";

      // Remove items individually — never call /cart/clear because it deletes the
      // Magento quote, causing every subsequent API request to return 500.
      // Each request has a 10s abort timeout to prevent hanging after place-order.
      const items = cart?.items ?? [];
      for (const item of items) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10_000);
        try {
          const removeRes = await fetch(`/api/kleverapi/cart/remove/${item.item_id}`, {
            method: "DELETE",
            signal: controller.signal,
            headers: {
              Authorization: `Bearer ${token}`,
              "x-locale": pathLocale,
              ...(storeCode && { "x-store-code": storeCode }),
            },
          });
          clearTimeout(timeoutId);
          if (!removeRes.ok && isAuthError(removeRes.status)) {
            handleAuthError();
            return;
          }
        } catch (fetchErr) {
          clearTimeout(timeoutId);
          console.warn(`Cart item ${item.item_id} removal failed (timeout or network):`, fetchErr);
          // Continue clearing remaining items rather than hanging
        }
      }

      // Immediately clear local state so the UI empties without waiting for the re-fetch
      setCart(prev => prev
        ? { ...prev, items: [], items_count: 0, subtotal: 0, tax_amount: 0, shipping_amount: 0, grand_total: 0, discount_amount: 0 }
        : null
      );
      window.dispatchEvent(new Event("cart-updated"));

      // Background re-fetch to sync with server (no loader since we already cleared the UI)
      fetchCart(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear cart");
      throw err;
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        isLoading,
        isCartSyncing,
        error,
        addToCart,
        updateCartItem,
        removeFromCart,
        clearCart,
        refetchCart: fetchCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return context;
}