"use client";

import { useState, useCallback, useEffect } from "react";
import { getClientLocale, getClientStoreCode, getAuthToken } from "@/lib/api/api-client";

export interface CustomAttribute {
    attribute_code: string;
    value: string;
}

export interface Address {
    id: string;
    firstname: string;
    lastname: string;
    company?: string;
    street: string;
    city: string;
    region?: string;
    postcode?: string;
    country_id: string;
    telephone: string;
    isDefault?: boolean;
    custom_attributes?: CustomAttribute[];
}

export interface ShippingMethod {
    code: string;
    carrierCode: string;
    methodCode: string;
    title: string;
    description: string;
    price: number;
    currency: string;
}

export interface PaymentMethod {
    code: string;
    title: string;
}

export interface Store {
    id: string;
    name: string;
    address: string;
    email: string;
    gps_location: string;
}

export interface CheckoutTotals {
    subtotal: number;
    tax_amount: number;
    shipping_amount?: number;
    discount_amount?: number;
    grand_total: number;
    currency_code: string;
    [key: string]: any; // Allow for custom attributes from the API
}

/**
 * Formats Magento error messages that contain placeholders like %1, %2
 */
function formatMagentoError(data: any): string {
    if (!data) return "An unknown error occurred";

    let message = data.message || "An unknown error occurred";

    // Magento positional placeholders (%1, %2)
    if (data.parameters) {
        if (Array.isArray(data.parameters)) {
            data.parameters.forEach((param: any, index: number) => {
                message = message.replace(`%${index + 1}`, String(param));
            });
        } else if (typeof data.parameters === 'object') {
            // Sometimes it's key-value
            Object.keys(data.parameters).forEach(key => {
                message = message.replace(`%${key}`, String(data.parameters[key]));
            });
        }
    }

    // Append child errors only when they add information beyond the main message.
    // Magento GraphQL often surfaces the same text in both data.message and
    // data.errors[0].message — skip details that are identical to avoid
    // "Internal server error. Details: Internal server error".
    if (data.errors && Array.isArray(data.errors)) {
        const details = data.errors
            .map((e: any) => e.message || JSON.stringify(e))
            .filter((detail: string) => detail && detail !== message)
            .join(". ");
        if (details) message = `${message}. Details: ${details}`;
    }

    return message;
}

export interface UseCheckoutOptions {
    skipInitialFetch?: boolean;
}

export function useCheckout(options: UseCheckoutOptions = {}) {
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [totals, setTotals] = useState<CheckoutTotals | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isTotalsLoading, setIsTotalsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sourcePermission, setSourcePermission] = useState<any>(null);

    // ─── Fetch Checkout Totals ───
    const fetchTotals = useCallback(async () => {
        try {
            setIsTotalsLoading(true);
            const token = await getAuthToken();
            if (!token) return;

            const res = await fetch("/api/kleverapi/checkout/totals", {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "x-locale": getClientLocale(),
                    ...(getClientStoreCode() && { "x-store-code": getClientStoreCode() })
                },
                cache: "no-store",
            });
            const data = await res.json();

            if (res.ok) {
                // Map discount_amount if present
                const mappedTotals: CheckoutTotals = {
                    ...data, // Include any extra fields from API
                    subtotal: Number(data.subtotal || 0),
                    tax_amount: Number(data.tax_amount || 0),
                    shipping_amount: Number(data.shipping_amount || 0),
                    discount_amount: Math.abs(Number(data.discount_amount || 0)),
                    grand_total: Number(data.grand_total || 0),
                    currency_code: data.currency_code || "SAR"
                };
                setTotals(mappedTotals);
            }
        } catch (err) {
            console.error("Fetch Totals Error:", err);
        } finally {
            setIsTotalsLoading(false);
        }
    }, []);

    // ─── Fetch Customer Addresses ───
    const fetchAddresses = useCallback(async () => {
        try {
            setIsLoading(true);
            const token = await getAuthToken();
            if (!token) return;

            const res = await fetch("/api/kleverapi/addresses", {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "x-locale": getClientLocale(),
                    ...(getClientStoreCode() && { "x-store-code": getClientStoreCode() })
                },
            });
            const data = await res.json();

            // The 'addresses' endpoint usually returns an array of addresses directly,
            // or an object with an 'addresses' field if it's the customer info.
            const addressesData = Array.isArray(data) ? data : (data.addresses || []);

            if (res.ok) {
                const mapped: Address[] = addressesData.map((addr: any) => (
                    console.log('addr :: ', addr),
                    {
                        id: (addr.id || addr.entity_id || "").toString(),
                        firstname: addr.firstname || "",
                        lastname: addr.lastname || "",
                        company: addr.company || "",
                        street: Array.isArray(addr.street) ? addr.street.join(", ") : (addr.street || ""),
                        city: addr.city || "",
                        region: typeof addr.region === 'string' ? addr.region : (addr.region?.region || addr.region?.region_code || ""),
                        postcode: addr.postcode || "",
                        country_id: addr.country_id || "SA",
                        telephone: addr.telephone || "",
                        isDefault: !!(addr.default_shipping || addr.is_default_shipping),
                        custom_attributes: addr.custom_attributes || [],
                    }));
                setAddresses(mapped);
            }
        } catch (err) {
            console.error("Fetch Addresses Error:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // ─── Fetch Shipping Methods ───
    const fetchShippingMethods = useCallback(async () => {
        try {
            const token = await getAuthToken();
            if (!token) return;

            const res = await fetch("/api/kleverapi/checkout/shipping-methods", {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "x-locale": getClientLocale(),
                    ...(getClientStoreCode() && { "x-store-code": getClientStoreCode() })
                },
            });

            if (res.ok) {
                const data = await res.json();
                // Normalize — API may return array or object with methods key
                const methods = Array.isArray(data) ? data : (data.methods || data.shipping_methods || []);
                const mapped: ShippingMethod[] = methods.map((m: any) => ({
                    code: m.code || `${m.carrier_code}_${m.method_code}`,
                    carrierCode: m.carrier_code || m.carrierCode || m.code?.split('_')[0] || "",
                    methodCode: m.method_code || m.methodCode || m.code?.split('_')[1] || m.code || "",
                    title: m.method_title || m.carrier_title || m.title || "Shipping",
                    description: m.carrier_title || m.description || "",
                    price: m.amount || m.price || 0,
                    currency: m.base_currency_code || m.currency || "SAR",
                }));
                if (mapped.length > 0) {
                    console.log("DEBUG: Shipping Methods Loaded:", mapped);
                    setShippingMethods(mapped);
                    return;
                }
                console.warn("DEBUG: No shipping methods found in API response");
                // Leave shippingMethods empty — do not auto-select until Magento returns
                // real methods. Hardcoded fallbacks caused setShippingMethod to fire on
                // empty/syncing carts, triggering the "empty cart" Magento error.
            } else {
                const data = await res.json();
                const errorMsg = formatMagentoError(data);
                throw new Error(errorMsg);
            }
        } catch (err) {
            // Silently handle "empty cart" or generic retrieval errors during background fetch
            const msg = err instanceof Error ? err.message.toLowerCase() : "";
            if (msg.includes("empty cart") || msg.includes("retrieving shipping methods")) {
                console.warn("Background fetch shipping methods skipped: cart not ready or empty");
            } else {
                console.error("Fetch Shipping Methods Error:", err);
            }
            // Leave shippingMethods empty on error — auto-select must not fire until
            // Magento returns valid methods for a cart that actually has items.
        }
    }, []);

    // ─── Fetch Payment Methods ───
    const fetchPaymentMethods = useCallback(async () => {
        try {
            const token = await getAuthToken();
            if (!token) {
                console.warn("No token available for fetchPaymentMethods");
                return;
            }

            const res = await fetch("/api/kleverapi/checkout/payment-methods", {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "x-locale": getClientLocale(),
                    ...(getClientStoreCode() && { "x-store-code": getClientStoreCode() })
                },
            });

            if (res.ok) {
                const data = await res.json();
                const methods = Array.isArray(data) ? data : (data.methods || data.payment_methods || []);
                const mapped: PaymentMethod[] = methods
                    .filter((m: any) => m.is_available !== false) // Only show available methods
                    .map((m: any) => ({
                        code: m.code || m.method_code || "",
                        title: m.title || m.method_title || "",
                    }));
                if (mapped.length > 0) {
                    setPaymentMethods(mapped);
                    return;
                }
            }
            // Fallback
            setPaymentMethods([
                { code: "creditaccount", title: "Credit Account" },
                { code: "banktransfer", title: "Bank Transfer Payment" },
                { code: "mageworx_ordereditor", title: "MageWorx Payment method" },
            ]);
        } catch (err) {
            // Silently handle "empty cart" errors during background fetch
            if (err instanceof Error && err.message.toLowerCase().includes("empty cart")) {
                console.warn("Background fetch payment methods skipped: cart is empty");
            } else {
                console.error("Fetch Payment Methods Error:", err);
            }
            setPaymentMethods([
                { code: "creditaccount", title: "Credit Account" },
                { code: "banktransfer", title: "Bank Transfer Payment" },
                { code: "mageworx_ordereditor", title: "MageWorx Payment method" },
            ]);
        }
    }, []);


    // ─── Fetch Source Permission ───
    const fetchSourcePermission = useCallback(async () => {
        try {
            const token = await getAuthToken();
            if (!token) return;

            const res = await fetch("/api/kleverapi/source-permission", {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "x-locale": getClientLocale(),
                    ...(getClientStoreCode() && { "x-store-code": getClientStoreCode() })
                }
            });
            if (res.ok) {
                const data = await res.json();
                setSourcePermission(data);
            }
        } catch (err) {
            console.error("Fetch Source Permission Error:", err);
        }
    }, []);

    // ─── Fetch Pickup Stores ───
    const fetchPickupStores = useCallback(async () => {
        try {
            const token = await getAuthToken();
            if (!token) return;

            const res = await fetch("/api/kleverapi/checkout/pickup-stores", {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "x-locale": getClientLocale(),
                    ...(getClientStoreCode() && { "x-store-code": getClientStoreCode() })
                },
            });

            if (res.status === 401) {
                console.warn("[useCheckout] 401 Unauthorized for pickup stores");
                const { signOut } = await import("next-auth/react");
                const locale = typeof window !== "undefined" && window.location.pathname.startsWith("/ar") ? "ar" : "en";
                await signOut({ redirect: false });
                window.location.href = `/${locale}/login`;
                return;
            }

            if (res.ok) {
                const data = await res.json();
                const storesData = Array.isArray(data) ? data : (data.stores || []);
                const mapped: Store[] = storesData.map((s: any) => ({
                    id: s.id?.toString() || s.store_id?.toString() || "",
                    name: s.name || s.store_name || "",
                    address: s.address || "",
                    email: s.email || "",
                    gps_location: s.gps_location || "",
                }));
                setStores(mapped);
            }
        } catch (err) {
            console.error("Fetch Pickup Stores Error:", err);
        }
    }, []);

    // ─── Fetch Pickup Time Slots ───
    const fetchPickupTimeSlots = useCallback(async (storeId: string, date: string) => {
        try {
            const token = await getAuthToken();
            if (!token) return [];

            const res = await fetch(`/api/kleverapi/checkout/pickup-time-slots/${storeId}/${date}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "x-locale": getClientLocale(),
                    ...(getClientStoreCode() && { "x-store-code": getClientStoreCode() })
                },
            });

            if (res.ok) {
                const data = await res.json();
                // Normalize response: Expecting array of { time, label, enabled }
                let slots = Array.isArray(data) ? data : (data.slots || data.time_slots || []);

                // If API returns strings instead of objects, convert them
                slots = slots.map((s: any) => {
                    if (typeof s === 'string') {
                        return { time: s, label: s, enabled: true };
                    }
                    return {
                        time: s.time || s.value || "",
                        label: s.label || s.time || s.value || "",
                        enabled: typeof s.enabled === 'boolean' ? s.enabled : true
                    };
                });

                if (slots.length > 0) return slots;
            }

            // Fallback generated slots if API fails or returns empty
            const generatedSlots = [];
            for (let h = 9; h <= 21; h++) { // 9 AM to 9 PM
                for (let m = 0; m < 60; m += 30) {
                    const hh = h % 12 || 12;
                    const ampm = h < 12 ? 'am' : 'pm';
                    const mm = m === 0 ? '00' : '30';
                    const h24 = String(h).padStart(2, '0');
                    const m24 = String(m).padStart(2, '0');
                    generatedSlots.push({
                        time: `${h24}:${m24}`,
                        label: `${hh}:${mm} ${ampm.toUpperCase()}`,
                        enabled: true
                    });
                }
            }
            return generatedSlots;
        } catch (err) {
            console.error("Fetch Pickup Time Slots Error:", err);
            return [];
        }
    }, []);

    // ─── Set Shipping Address (also refreshes totals + methods) ───
    const setShippingAddress = useCallback(async (addressId: string) => {
        try {
            setIsTotalsLoading(true);
            const token = await getAuthToken();
            if (!token) throw new Error("Not authenticated");

            const res = await fetch("/api/kleverapi/checkout/shipping-address", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                    "x-locale": getClientLocale(),
                    ...(getClientStoreCode() && { "x-store-code": getClientStoreCode() }),
                },
                body: JSON.stringify({ address_id: Number(addressId) }),
            });

            if (!res.ok) {
                const data = await res.json();
                const errorMsg = formatMagentoError(data);
                throw new Error(errorMsg);
            }

            const data = await res.json();

            // If the API returns shipping methods or payment methods alongside, use them
            if (data.shipping_methods && Array.isArray(data.shipping_methods)) {
                const mapped: ShippingMethod[] = data.shipping_methods.map((m: any) => ({
                    code: m.code || `${m.carrier_code}_${m.method_code}`,
                    carrierCode: m.carrier_code || m.carrierCode || "",
                    methodCode: m.method_code || m.methodCode || "",
                    title: m.method_title || m.carrier_title || m.title || "Shipping",
                    description: m.carrier_title || m.description || "",
                    price: m.amount || m.price || 0,
                    currency: m.base_currency_code || m.currency || "SAR",
                }));
                if (mapped.length > 0) setShippingMethods(mapped);
            }

            if (data.payment_methods && Array.isArray(data.payment_methods)) {
                const mapped = data.payment_methods.map((m: any) => ({
                    code: m.code || m.method_code || "",
                    title: m.title || m.method_title || "",
                }));
                if (mapped.length > 0) setPaymentMethods(mapped);
            }

            // Refresh totals and shipping methods after address change
            await fetchTotals();
            await fetchShippingMethods();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to set shipping address");
            throw err;
        } finally {
            setIsTotalsLoading(false);
        }
    }, [fetchTotals, fetchShippingMethods]);

    // ─── Add New Address ───
    const addAddress = useCallback(async (addressData: Partial<Address>) => {
        try {
            setIsLoading(true);
            const token = await getAuthToken();
            if (!token) throw new Error("Not authenticated");

            const res = await fetch("/api/kleverapi/my-account", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                    "x-locale": getClientLocale(),
                    ...(getClientStoreCode() && { "x-store-code": getClientStoreCode() }),
                },
                body: JSON.stringify({ address: addressData }),
            });
            const data = await res.json();
            if (!res.ok) {
                const errorMsg = formatMagentoError(data);
                throw new Error(errorMsg);
            }
            await fetchAddresses();
            return data;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to add address");
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [fetchAddresses]);

    // ─── Save PO Number ───
    const savePoNumber = useCallback(async (poNumber: string) => {
        try {
            const token = await getAuthToken();
            if (!token) throw new Error("Not authenticated");

            const res = await fetch("/api/kleverapi/checkout/po-number", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                    "x-locale": getClientLocale(),
                    ...(getClientStoreCode() && { "x-store-code": getClientStoreCode() }),
                },
                body: JSON.stringify({ poNumber }),
            });
            const data = await res.json();
            if (!res.ok) {
                const errorMsg = formatMagentoError(data);
                throw new Error(errorMsg);
            }
            return data;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save PO number");
            throw err;
        }
    }, []);

    // ─── Set Order Comment ───
    const saveOrderComment = useCallback(async (comment: string) => {
        try {
            const token = await getAuthToken();
            if (!token) throw new Error("Not authenticated");

            const res = await fetch("/api/kleverapi/checkout/order-comment", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                    "x-locale": getClientLocale(),
                    ...(getClientStoreCode() && { "x-store-code": getClientStoreCode() }),
                },
                body: JSON.stringify({ comment }),
            });
            const data = await res.json();
            if (!res.ok) {
                const errorMsg = formatMagentoError(data);
                throw new Error(errorMsg);
            }
            return data;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save order comment");
            throw err;
        }
    }, []);

    // ─── Get Order Comment ───
    const getOrderComment = useCallback(async () => {
        try {
            const token = await getAuthToken();
            if (!token) throw new Error("Not authenticated");

            const res = await fetch("/api/kleverapi/checkout/order-comment", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "x-locale": getClientLocale(),
                    ...(getClientStoreCode() && { "x-store-code": getClientStoreCode() }),
                },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to get order comment");

            // Handle different resonse formats: { comment: "..." } or "..." or { data: { comment: "..." } }
            // If common Magento responses return just the string
            if (typeof data === 'string') return data;
            return data.comment || data.order_comment || "";
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to get order comment");
            throw err;
        }
    }, []);

    // ─── Upload PO File ───
    const uploadPoFile = useCallback(async (payload: { fileContent: string; fileName: string }) => {
        try {
            const token = await getAuthToken();
            if (!token) throw new Error("Not authenticated");

            const res = await fetch("/api/kleverapi/checkout/po-upload", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                    "x-locale": getClientLocale(),
                    ...(getClientStoreCode() && { "x-store-code": getClientStoreCode() }),
                },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) {
                const errorMsg = formatMagentoError(data);
                throw new Error(errorMsg);
            }
            return data;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to upload PO file");
            throw err;
        }
    }, []);

    // ─── Get PO Upload ───
    const getPoUpload = useCallback(async () => {
        try {
            const token = await getAuthToken();
            if (!token) throw new Error("Not authenticated");

            const res = await fetch("/api/kleverapi/checkout/po-upload", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "x-locale": getClientLocale(),
                    ...(getClientStoreCode() && { "x-store-code": getClientStoreCode() }),
                },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to get PO upload");
            return data;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to get PO upload");
            throw err;
        }
    }, []);

    // ─── Delete PO File ───
    const deletePoFile = useCallback(async (filename: string) => {
        try {
            const token = await getAuthToken();
            if (!token) throw new Error("Not authenticated");

            const res = await fetch(`/api/kleverapi/checkout/po-upload/${encodeURIComponent(filename)}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "x-locale": getClientLocale(),
                    ...(getClientStoreCode() && { "x-store-code": getClientStoreCode() }),
                },
            });
            const data = await res.json();
            if (!res.ok) {
                const errorMsg = formatMagentoError(data);
                throw new Error(errorMsg);
            }
            return data;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete PO file");
            throw err;
        }
    }, []);

    // ─── Set Shipping Method ───
    const setShippingMethod = useCallback(async (carrierCode: string, methodCode: string) => {
        try {
            setIsTotalsLoading(true);
            const token = await getAuthToken();
            if (!token) throw new Error("Not authenticated");

            console.log(">>> Set Shipping Method Payload:", { carrier_code: carrierCode, method_code: methodCode });

            const res = await fetch("/api/kleverapi/checkout/shipping-method", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                    "x-locale": getClientLocale(),
                    ...(getClientStoreCode() && { "x-store-code": getClientStoreCode() }),
                },
                body: JSON.stringify({
                    carrier_code: carrierCode,
                    method_code: methodCode
                }),
            });

            const data = await res.json();
            console.log("<<< Set Shipping Method Response Status:", res.status, data);
            if (!res.ok) {
                const errorMsg = formatMagentoError(data);
                throw new Error(errorMsg);
            }

            // Refresh totals and payment methods after selection
            await fetchTotals();
            await fetchPaymentMethods();
            return data;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to set shipping method");
            throw err;
        } finally {
            setIsTotalsLoading(false);
        }
    }, [fetchTotals, fetchPaymentMethods]);

    // ─── Set Shipping Extras (Pickup details) ───
    const setShippingExtras = useCallback(async (extras: {
        pickupStore: string;
        pickupDate: string;
        pickupTime: string;
        pickupPersonName: string;
        pickupPersonId: string;
        pickupMobileNumber: string;
    }) => {
        try {
            const token = await getAuthToken();
            if (!token) throw new Error("Not authenticated");

            const res = await fetch("/api/kleverapi/checkout/shipping-extras", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                    "x-locale": getClientLocale(),
                    ...(getClientStoreCode() && { "x-store-code": getClientStoreCode() }),
                },
                body: JSON.stringify(extras),
            });
            const data = await res.json();
            if (!res.ok) {
                const errorMsg = formatMagentoError(data);
                throw new Error(errorMsg);
            }
            return data;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to set shipping extras");
            throw err;
        }
    }, []);

    // ─── Place Order ───
    const placeOrder = useCallback(async (orderData: {
        address_id: number;
        shipping_method: string;
        payment_method: string;
        cart_id?: number | string | null;
        po_number?: string;
        comment?: string;
    }) => {
        try {
            setIsLoading(true);
            const token = await getAuthToken();
            if (!token) throw new Error("Not authenticated");

            const res = await fetch("/api/kleverapi/checkout/place-order", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                    "x-locale": getClientLocale(),
                    ...(getClientStoreCode() && { "x-store-code": getClientStoreCode() }),
                },
                body: JSON.stringify(orderData),
            });
            const data = await res.json();
            if (!res.ok) {
                const errorMsg = formatMagentoError(data);
                throw new Error(errorMsg);
            }
            return data;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to place order");
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // ─── Fetch Checkout Success ───
    const fetchCheckoutSuccess = useCallback(async (orderId: string) => {
        try {
            const token = await getAuthToken();
            if (!token) throw new Error("Not authenticated");

            const pathLocale = typeof window !== "undefined" && window.location.pathname.startsWith("/ar") ? "ar" : "en";
            const res = await fetch(`/api/kleverapi/checkout/success/${orderId}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "x-locale": pathLocale,
                },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to get order success data");
            return data;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to get order success data");
            throw err;
        }
    }, []);

    // ─── Initial Load ───
    useEffect(() => {
        if (options.skipInitialFetch) return;

        fetchAddresses();
        fetchTotals();
        fetchShippingMethods();
        fetchPaymentMethods();
        fetchSourcePermission();
    }, [fetchAddresses, fetchTotals, fetchShippingMethods, fetchPaymentMethods, fetchSourcePermission, options.skipInitialFetch]);

    return {
        addresses,
        shippingMethods,
        paymentMethods,
        stores,
        totals,
        isLoading,
        isTotalsLoading,
        error,
        sourcePermission,
        refetchAddresses: fetchAddresses,
        refetchTotals: fetchTotals,
        refetchShippingMethods: fetchShippingMethods,
        refetchPaymentMethods: fetchPaymentMethods,
        refetchPickupStores: fetchPickupStores,
        fetchPickupTimeSlots,
        setShippingAddress,
        addAddress,
        placeOrder,
        savePoNumber,
        uploadPoFile,
        getPoUpload,
        deletePoFile,
        setShippingMethod,
        setShippingExtras,
        fetchCheckoutSuccess,
        getOrderComment,
        saveOrderComment,
    };
}
