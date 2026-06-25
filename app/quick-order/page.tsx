"use client";
import { useTranslation } from "@/hooks/useTranslation";
import { useLocalePath } from "@/hooks/useLocalePath";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, ShoppingCart, Trash2, Upload, FileDown, Check, X, Plus, ArrowRight, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCart } from "@/modules/cart/hooks/useCart";
import { toast } from "react-hot-toast";
import Price from "../components/Price";
import { redirectToLogin } from "@/utils/helpers";
import { api, getClientStoreCode } from "@/lib/api/api-client";
import { useGlobalLoading } from "@/components/GlobalLoadingOverlay";

interface QuickOrderItem {
    sku: string;
    name: string;
    qty: number;
    price: number;
    image?: string;
}

export default function QuickOrderPage() {
    const router = useRouter();
    const { t, isRtl } = useTranslation();
    const lp = useLocalePath();
    const { addToCart, refetchCart } = useCart();
    const { register: registerOverlay, unregister: unregisterOverlay } = useGlobalLoading();
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [items, setItems] = useState<QuickOrderItem[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Requirement 6: Persist data in localStorage
    useEffect(() => {
        const saved = localStorage.getItem("quick-order-items");
        if (saved) {
            try {
                setItems(JSON.parse(saved));
            } catch (err) {
                console.error("Error loading saved items:", err);
            }
        }
        setIsLoaded(true);
    }, []);

    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem("quick-order-items", JSON.stringify(items));
        }
    }, [items, isLoaded]);
    const [skuText, setSkuText] = useState("");
    const [file, setFile] = useState<File | null>(null);

    const searchRef = useRef<HTMLDivElement>(null);

    // Auth check
    useEffect(() => {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        if (!token) {
            redirectToLogin(router);
        }
    }, [router]);

    // Click outside to close search results
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setSearchResults([]);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Instant Search Logic - uses dedicated quick-order search API
    useEffect(() => {
        if (searchTerm.length < 2) {
            setSearchResults([]);
            return;
        }

        const abortController = new AbortController();
        const handler = setTimeout(async () => {
            setIsSearching(true);
            try {
                const token = localStorage.getItem("token");
                if (!token) {
                    redirectToLogin(router);
                    return;
                }
                const storeCode = getClientStoreCode();
                const res = await fetch(`/api/kleverapi/quick-order/search?query=${encodeURIComponent(searchTerm)}&pageSize=10`, {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        ...(storeCode && { "x-store-code": storeCode })
                    },
                    signal: abortController.signal,
                });
                if (res.status === 401) {
                    localStorage.removeItem("token");
                    redirectToLogin(router);
                    return;
                }
                if (res.ok) {
                    const data = await res.json();
                    setSearchResults(data.items || []);
                }
            } catch (err: any) {
                if (err.name !== "AbortError") console.error("Search error:", err);
            } finally {
                if (!abortController.signal.aborted) setIsSearching(false);
            }
        }, 400);

        return () => {
            clearTimeout(handler);
            abortController.abort();
        };
    }, [searchTerm]);

    const downloadCSV = (fileName: string, base64Content: string) => {
        try {
            const byteCharacters = atob(base64Content);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
            return true;
        } catch (err) {
            console.error("Error decoding base64 content:", err);
            return false;
        }
    };

    const addItemToOrder = (product: any) => {
        const sku = product.sku;
        const existing = items.find(i => i.sku === sku);
        if (existing) {
            setItems(items.map(i => i.sku === sku ? { ...i, qty: i.qty + 1 } : i));
        } else {
            setItems([...items, {
                sku,
                name: product.name || "",
                qty: 1,
                price: product.price || product.final_price || 0,
                image: product.image_url
            }]);
        }
        toast.success(`${sku} ${t("quickOrder.added")}`);
    };

    const removeOrderItem = async (sku: string) => {
        setLoading(true);
        const toastId = toast.loading(`${t("quickOrder.removing")} ${sku}...`);
        try {
            await api.delete(`/kleverapi/quick-order/remove/${sku}`);
            setItems(prev => prev.filter(i => i.sku !== sku));
            toast.success(`${sku} ${t("quickOrder.removed")}`, { id: toastId });
        } catch (err: any) {
            console.error(`Remove item ${sku} error:`, err);
            toast.error(err || `${t("quickOrder.removeFailed")} ${sku}`, { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    const updateQty = async (sku: string, qty: number) => {
        if (qty < 1) return;
        const originalItems = [...items];
        setItems(prev => prev.map(i => i.sku === sku ? { ...i, qty } : i));
        try {
            await api.put(`/kleverapi/quick-order/update-qty/${sku}`, { qty });
        } catch (err: any) {
            console.error(`Update qty error for ${sku}:`, err);
            setItems(originalItems);
            toast.error(`${t("quickOrder.qtyFailed")} ${sku}`);
        }
    };

    const handleDownloadSampleCsv = async (e: React.MouseEvent) => {
        e.preventDefault();
        setLoading(true);
        const toastId = toast.loading(t("quickOrder.downloading"));
        try {
            const response = await api.get("/kleverapi/quick-order/download-csv");
            const base64 = response?.file_content || response?.base64;
            const fileName = response?.file_name || response?.filename || "quick_order_sample.csv";

            if (base64) {
                const success = downloadCSV(fileName, base64);
                if (success) {
                    toast.success(t("quickOrder.downloadStarted"), { id: toastId });
                } else {
                    toast.error(t("quickOrder.downloadFailed"), { id: toastId });
                }
            } else {
                toast.error(response.message || t("quickOrder.downloadFailed"), { id: toastId });
            }
        } catch (err: any) {
            console.error("Download CSV error:", err);
            toast.error(err || t("quickOrder.downloadFailed"), { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    const handleAddMultipleSkus = async () => {
        if (!skuText.trim()) return;

        setLoading(true);
        const lines = skuText.split('\n');
        const validateItems: any[] = [];

        for (const line of lines) {
            const parts = line.split(',');
            const sku = parts[0]?.trim();
            const qty = parseInt(parts[1]?.trim() || "1");
            if (sku) {
                validateItems.push({ sku, qty });
            }
        }

        if (validateItems.length === 0) {
            setLoading(false);
            return;
        }

        const toastId = toast.loading(t("quickOrder.validating"));

        try {
            const token = localStorage.getItem("token");
            const storeCode = getClientStoreCode();
            const res = await fetch(`/api/kleverapi/quick-order/validate`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                    ...(storeCode && { "x-store-code": storeCode }),
                },
                body: JSON.stringify({ items: validateItems })
            });

            if (res.ok) {
                const validated = await res.json();
                const results = Array.isArray(validated) ? validated : (validated.items || []);
                const newItemsList: QuickOrderItem[] = [...items];

                results.forEach((p: any) => {
                    const sku = p.sku || p.product_sku;
                    if (sku) {
                        const existingIndex = newItemsList.findIndex(i => i.sku === sku);
                        if (existingIndex > -1) {
                            newItemsList[existingIndex].qty += Number(p.qty || 1);
                        } else {
                            newItemsList.push({
                                sku: sku,
                                name: p.name || p.product_name || `${p.brand || p.mgs_brand || ""} ${p.pattern || ""}`.trim() || sku,
                                qty: Number(p.qty || 1),
                                price: Number(p.price || p.final_price || p.special_price || 0),
                                image: p.image_url || p.image || p.thumbnail || p.small_image || null
                            });
                        }
                    }
                });

                setItems(newItemsList);
                setSkuText("");
                toast.success(t("quickOrder.listUpdated"), { id: toastId });
            } else {
                toast.error(t("quickOrder.validationFailed"), { id: toastId });
            }
        } catch (err) {
            console.error("Validation error:", err);
            toast.error(t("quickOrder.validationError"), { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFile(file);
    };

    const processFile = async () => {
        if (!file) {
            toast.error(t("quickOrder.selectCsv"));
            return;
        }

        registerOverlay("quick-order");
        setLoading(true);
        const toastId = toast.loading(`${t("quickOrder.processing")} ${file.name}...`);

        try {
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve, reject) => {
                reader.onload = () => {
                    const result = reader.result as string;
                    const base64 = result.split(",")[1];
                    resolve(base64);
                };
                reader.onerror = (error) => reject(error);
                reader.readAsDataURL(file);
            });

            const base64Content = await base64Promise;
            const response = await api.post("/kleverapi/quick-order/upload-csv", {
                fileContent: base64Content,
                fileName: file.name
            });

            const results = Array.isArray(response) ? response : (response.items || []);

            if (results.length > 0) {
                const newItemsList: QuickOrderItem[] = [...items];

                results.forEach((p: any) => {
                    const sku = p.sku || p.product_sku;
                    if (sku) {
                        const existingIndex = newItemsList.findIndex(i => i.sku === sku);
                        if (existingIndex > -1) {
                            newItemsList[existingIndex].qty += Number(p.qty || 1);
                        } else {
                            newItemsList.push({
                                sku: sku,
                                name: p.name || p.product_name || `${p.brand || p.mgs_brand || ""} ${p.pattern || ""}`.trim() || sku,
                                qty: Number(p.qty || 1),
                                price: Number(p.price || p.final_price || p.special_price || 0),
                                image: p.image_url || p.image || p.thumbnail || p.small_image || null
                            });
                        }
                    }
                });

                setItems(newItemsList);
                setFile(null);
                toast.success(t("quickOrder.addedFromFile").replace("{0}", String(results.length)).replace("{1}", file.name), { id: toastId });
            } else {
                toast.error(response.message || t("quickOrder.noValidProducts"), { id: toastId });
            }
        } catch (err: any) {
            console.error("Upload CSV error:", err);
            toast.error(err || t("quickOrder.uploadError"), { id: toastId });
        } finally {
            setLoading(false);
            unregisterOverlay("quick-order");
        }
    };

    const handleAddToCart = async () => {
        if (items.length === 0) {
            toast.error(t("quickOrder.emptyCart"));
            return;
        }

        registerOverlay("quick-order");
        setLoading(true);
        const toastId = toast.loading(t("quickOrder.addingToCart"));

        try {
            const storeCode = getClientStoreCode();
            const data = await api.post("/kleverapi/quick-order/add-to-cart", {
                items: items.map(item => ({ sku: item.sku, qty: item.qty }))
            }, { headers: storeCode ? { "x-store-code": storeCode } : {} });

            await refetchCart();
            toast.success(data?.message || t("quickOrder.addedToCart"), { id: toastId });
            setItems([]);
            router.push(lp("/cart"));
        } catch (err: any) {
            console.error("Add to cart partial error:", err);
            await refetchCart();
            toast.error(err || t("quickOrder.someFailed"), { id: toastId });
            router.push(lp("/cart"));
        } finally {
            setLoading(false);
            unregisterOverlay("quick-order");
        }
    };

    const handleCheckout = async () => {
        if (items.length === 0) {
            toast.error(t("quickOrder.emptyList2"));
            return;
        }

        registerOverlay("quick-order");
        setLoading(true);
        const toastId = toast.loading(t("quickOrder.preparingCheckout"));
        try {
            const storeCode = getClientStoreCode();
            await api.post("/kleverapi/quick-order/checkout", {
                items: items.map(item => ({
                    sku: item.sku,
                    qty: item.qty
                }))
            }, { headers: storeCode ? { "x-store-code": storeCode } : {} });

            await refetchCart();
            setItems([]);
            toast.success(t("quickOrder.checkoutInit"), { id: toastId });
            router.push(lp("/checkout"));
        } catch (err: any) {
            toast.error(err || t("quickOrder.checkoutFailed"), { id: toastId });
        } finally {
            setLoading(false);
            unregisterOverlay("quick-order");
        }
    };

    const handleClearAll = async () => {
        if (items.length === 0) return;
        setLoading(true);
        const toastId = toast.loading(t("quickOrder.clearing"));
        try {
            const response = await api.delete("/kleverapi/quick-order/clear");
            if (response.success || response.message?.toLowerCase().includes("already empty")) {
                setItems([]);
                toast.success(response.message || t("quickOrder.cleared"), { id: toastId });
            } else {
                toast.error(response.message || t("quickOrder.clearFailed"), { id: toastId });
            }
        } catch (err: any) {
            console.error("Clear list error:", err);
            toast.error(err || t("quickOrder.clearFailed"), { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

    return (
        <div className="min-h-screen bg-white pb-32" dir={isRtl ? "rtl" : "ltr"}>
            <div className="max-w-[1400px] mx-auto px-4 lg:px-14">

                {/* Top Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-10 gap-4 md:gap-6">
                    <h1 className="text-h2 sm:text-h1-sm md:text-[36px] font-bold text-black uppercase tracking-[-0.04em]">{t("quickOrder.title")}</h1>
                    <div className="flex gap-3 md:gap-4 w-full sm:w-auto">
                        <button
                            onClick={handleAddToCart}
                            className="flex-1 sm:flex-none h-[38px] md:h-[40px] px-4 md:px-6 bg-black text-white text-caption md:text-label font-bold uppercase tracking-[0.15em] rounded-sm hover:translate-y-[-2px] active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(0,0,0,0.1)]"
                        >
                            {t("quickOrder.addToCart")}
                        </button>
                        <button
                            onClick={handleCheckout}
                            className="flex-1 sm:flex-none h-[38px] md:h-[40px] px-4 md:px-6 bg-black text-white text-caption md:text-label font-bold uppercase tracking-[0.15em] rounded-sm hover:translate-y-[-2px] active:scale-95 transition-all shadow-[0_4px_14px_rgba(0,0,0,0.1)]"
                        >
                            {t("quickOrder.checkout")}
                        </button>
                    </div>
                </div>

                {/* Instant Search Bar */}
                <div className="relative mb-8 md:mb-14" ref={searchRef}>
                    <div className="relative group">
                        <input
                            type="text"
                            placeholder={t("m.search")}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-12 md:h-14 ltr:pl-4 ltr:md:pl-6 ltr:pr-12 ltr:md:pr-14 rtl:pr-4 rtl:md:pr-6 rtl:pl-12 rtl:md:pl-14 bg-white border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)] rounded-sm text-body md:text-body-lg font-medium focus:outline-none focus:border-primary focus:shadow-lg transition-all placeholder:text-black/40"
                        />
                        <div className="absolute ltr:right-6 rtl:left-6 top-1/2 -translate-y-1/2 text-black/50 group-focus-within:text-primary transition-colors">
                            <Search size={20} className={isSearching ? "opacity-40" : ""} />
                        </div>
                    </div>

                    {/* Search Results Dropdown */}
                    {searchResults.length > 0 && (
                        <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border border-gray-100 rounded-sm shadow-2xl z-[100] max-h-[480px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                            {searchResults.map((p) => (
                                <div
                                    key={p.sku}
                                    onClick={() => addItemToOrder(p)}
                                    className="flex items-center p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 group select-none"
                                >
                                    <div className="w-14 h-14 bg-white border border-gray-50 rounded flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                                        {p.image_url ? <img src={p.image_url} alt={p.sku} className="w-12 h-12 object-contain" /> : <div className="w-12 h-12 bg-gray-50 rounded" />}
                                    </div>
                                    <div className="ltr:ml-5 rtl:mr-5 flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-body font-bold text-black uppercase tracking-tight">{p.sku}</p>
                                            {p.item_code && p.item_code !== p.sku && (
                                                <span className="text-micro font-bold text-black/50 bg-gray-100 px-1.5 py-0.5 rounded">{p.item_code}</span>
                                            )}
                                            {p.is_in_stock === false && (
                                                <span className="text-[8px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded uppercase">{t("quickOrder.outOfStock")}</span>
                                            )}
                                        </div>
                                        <p className="text-label text-black/50 font-medium truncate">{p.name}</p>
                                    </div>
                                    <div className="ltr:ml-6 rtl:mr-6 flex-shrink-0">
                                        <span className="w-8 h-8 bg-primary text-black rounded flex items-center justify-center font-bold text-h3-sm hover:bg-black hover:text-white transition-all shadow-sm active:scale-90">+</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* No Results */}
                    {searchTerm.length >= 2 && !isSearching && searchResults.length === 0 && (
                        <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border border-gray-100 rounded-sm shadow-xl z-[100] py-8 text-center">
                            <p className="text-label font-bold text-black/40 uppercase tracking-widest">{t("quickOrder.noProducts")}</p>
                        </div>
                    )}
                </div>

                {/* Order Table */}
                <div className="bg-white border border-gray-100 rounded-sm shadow-[0_2px_15px_rgba(0,0,0,0.03)] overflow-hidden mb-20 flex flex-col">
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-y-auto max-h-[600px] custom-scrollbar border-b border-gray-50">
                        <table className="w-full border-collapse">
                            <thead className="sticky top-0 z-20 bg-white">
                                <tr className="border-b-2 border-gray-50 bg-white">
                                    <th className="px-6 lg:px-8 py-4 text-body-sm font-bold text-black uppercase tracking-[0.2em] w-[45%] ltr:text-left rtl:text-right">{t("quickOrder.items")}</th>
                                    <th className="px-4 lg:px-6 py-4 text-body-sm font-bold text-black uppercase tracking-[0.2em] text-center">{t("quickOrder.skus")}</th>
                                    <th className="px-4 lg:px-6 py-4 text-body-sm font-bold text-black uppercase tracking-[0.2em] text-center">{t("quickOrder.qty")}</th>
                                    <th className="px-6 lg:px-8 py-4 text-body-sm font-bold text-black uppercase tracking-[0.2em] ltr:text-right rtl:text-left">{t("quickOrder.itemsTotal")}</th>
                                    <th className="px-4 lg:px-6 py-4 text-body-sm font-bold text-black uppercase tracking-[0.2em] text-center">{t("quickOrder.action")}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {items.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-32 text-center">
                                            <div className="flex flex-col items-center">
                                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                                    <Plus size={24} className="text-black/40" />
                                                </div>
                                                <p className="text-caption font-bold text-black/50 uppercase tracking-widest max-w-[300px]">
                                                    {t("quickOrder.emptyList")}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    items.map((item) => (
                                        <tr key={item.sku} className="group hover:bg-primary/5 transition-colors">
                                            <td className="px-6 lg:px-8 py-4">
                                                <div className="flex items-center">
                                                    <div className="w-10 h-10 bg-white rounded border border-gray-50 flex items-center justify-center ltr:mr-4 rtl:ml-4 flex-shrink-0 group-hover:shadow-md transition-shadow">
                                                        {item.image ? <img src={item.image} alt={item.sku} className="w-8 h-8 object-contain" /> : <div className="w-8 h-8 bg-gray-100 rounded" />}
                                                    </div>
                                                    <span className="text-caption font-bold text-black/80 leading-snug line-clamp-2">{item.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 lg:px-6 py-4 text-center">
                                                <span className="text-caption font-bold text-black uppercase tracking-tight">{item.sku}</span>
                                            </td>
                                            <td className="px-4 lg:px-6 py-4">
                                                <div className="flex items-center justify-center">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={item.qty}
                                                        onChange={(e) => updateQty(item.sku, parseInt(e.target.value) || 1)}
                                                        className="w-14 h-10 border border-gray-100 text-center text-caption font-bold text-black focus:outline-none focus:border-primary focus:bg-white bg-gray-50/50 transition-all rounded-sm"
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-6 lg:px-8 py-4 ltr:text-right rtl:text-left">
                                                <span className="text-caption font-bold text-black">
                                                    <Price amount={item.price * item.qty} />
                                                </span>
                                            </td>
                                            <td className="px-4 lg:px-6 py-4 text-center">
                                                <button
                                                    onClick={() => removeOrderItem(item.sku)}
                                                    className="w-10 h-10 mx-auto rounded-full flex items-center justify-center text-black/50 hover:text-red-500 hover:bg-white hover:shadow-md hover:-translate-y-1 transition-all duration-300 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-100"
                                                    title={t("m.remove-item")}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card Layout */}
                    <div className="md:hidden overflow-y-auto max-h-[600px] custom-scrollbar">
                        {items.length === 0 ? (
                            <div className="px-4 py-20 text-center">
                                <div className="flex flex-col items-center">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                        <Plus size={24} className="text-black/40" />
                                    </div>
                                    <p className="text-caption font-bold text-black/50 uppercase tracking-widest max-w-[300px]">
                                        {t("quickOrder.emptyList")}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            items.map((item) => (
                                <div key={item.sku} className="border-b border-gray-50 p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-12 h-12 bg-white rounded border border-gray-50 flex items-center justify-center flex-shrink-0">
                                            {item.image ? <img src={item.image} alt={item.sku} className="w-10 h-10 object-contain" /> : <div className="w-10 h-10 bg-gray-100 rounded" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-label font-bold text-black uppercase tracking-tight">{item.sku}</p>
                                            <p className="text-caption font-bold text-black/60 leading-snug line-clamp-1 mt-0.5">{item.name}</p>
                                            <div className="flex items-center justify-between mt-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-micro font-bold text-black/50 uppercase">{t("quickOrder.qty")}:</span>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={item.qty}
                                                        onChange={(e) => updateQty(item.sku, parseInt(e.target.value) || 1)}
                                                        className="w-14 h-8 border border-gray-100 text-center text-label font-bold text-black focus:outline-none focus:border-primary bg-gray-50/50 rounded-sm"
                                                    />
                                                </div>
                                                <span className="text-body-sm font-bold text-black">
                                                    <Price amount={item.price * item.qty} />
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeOrderItem(item.sku)}
                                            className="w-10 h-10 rounded-full flex items-center justify-center text-black/50 hover:text-red-500 hover:bg-white hover:shadow-md hover:-translate-y-1 transition-all duration-300 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-100"
                                            title={t("m.remove-item")}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Fixed Summary Bar */}
                    <div className="px-4 md:px-8 py-4 md:py-6 bg-white border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6">
                        <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto justify-between md:justify-start">
                            <span className="text-label md:text-body-sm font-bold text-black/50 uppercase tracking-[0.2em]">{t("quickOrder.grandTotal")}</span>
                            <span className="text-h3 md:text-h2 font-bold text-black">
                                <Price amount={totalAmount} />
                            </span>
                        </div>
                        <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
                            <button
                                onClick={handleAddToCart}
                                className="flex-1 md:flex-none h-[44px] md:h-[48px] px-6 md:px-10 bg-white border-2 border-black text-black text-label md:text-body-sm font-bold uppercase tracking-[0.15em] rounded-sm hover:bg-black hover:text-white transition-all disabled:opacity-20 shadow-sm whitespace-nowrap"
                            >
                                {t("quickOrder.addToCart")}
                            </button>
                            <button
                                onClick={handleCheckout}
                                className="flex-1 md:flex-none h-[44px] md:h-[48px] px-6 md:px-12 bg-black text-white text-label md:text-body-sm font-bold uppercase tracking-[0.2em] rounded-sm hover:-translate-y-1 active:scale-95 transition-all shadow-xl whitespace-nowrap"
                            >
                                {t("quickOrder.checkout")}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Section: ADD MULTIPLE PRODUCTS */}
                <h2 className={`text-h3 md:text-h1-sm font-bold text-black uppercase tracking-tight mb-6 md:mb-10 ${isRtl ? 'border-r-[6px] border-primary pr-4 md:pr-6' : 'border-l-[6px] border-primary pl-4 md:pl-6'}`}>{t("quickOrder.addMultiple")}</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10 mb-12 md:mb-20">

                    {/* Box: Enter multiple SKUs */}
                    <div className="bg-white border border-gray-100 rounded-sm shadow-[0_4px_25px_rgba(0,0,0,0.03)] p-5 md:p-10 flex flex-col group hover:shadow-xl transition-all duration-300">
                        <div className="flex items-center gap-3 mb-6">
                            <Plus size={18} className="text-primary" strokeWidth={3} />
                            <h3 className="text-body-lg font-bold text-black uppercase tracking-widest">{t("quickOrder.enterSkus")}</h3>
                        </div>
                        <textarea
                            placeholder={t("m.enter-sku-or-product-name")}
                            value={skuText}
                            onChange={(e) => setSkuText(e.target.value)}
                            className="w-full h-48 bg-gray-50/30 border border-gray-100 rounded-sm p-6 text-body font-medium focus:outline-none focus:border-primary focus:bg-white transition-all mb-6 resize-none placeholder:text-black/30 ltr:text-left rtl:text-right"
                        />
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-6 mt-auto">
                            <p className="text-caption font-bold text-black/50 uppercase tracking-widest bg-gray-100 px-3 py-1.5 rounded-full">{t("quickOrder.formatHint")}</p>
                            <button
                                onClick={handleAddMultipleSkus}
                                disabled={loading}
                                className="w-full sm:w-auto h-[40px] px-10 bg-black text-white text-label font-bold uppercase tracking-[0.15em] rounded-sm hover:translate-x-1 transition-all disabled:opacity-50 flex items-center justify-center gap-2 group/btn"
                            >
                                <span className={loading ? "opacity-50" : ""}>{t("quickOrder.addToList")}</span>
                                {!loading && <ArrowIcon size={14} className="group-hover/btn:translate-x-1 transition-transform" />}
                            </button>
                        </div>
                    </div>

                    {/* Box: Add from file */}
                    <div className="bg-white border border-gray-100 rounded-sm shadow-[0_4px_25px_rgba(0,0,0,0.03)] p-5 md:p-10 flex flex-col group hover:shadow-xl transition-all duration-300">
                        <div className="flex items-center gap-3 mb-6">
                            <Upload size={18} className="text-primary" strokeWidth={3} />
                            <h3 className="text-body-lg font-bold text-black uppercase tracking-widest">{t("quickOrder.addFromFile")}</h3>
                        </div>
                        <div className="flex-1 mb-8">
                            <div
                                className={`border-2 border-dashed rounded-sm h-[132px] flex flex-col items-center justify-center p-6 transition-all cursor-pointer relative ${file ? 'border-green-400 bg-green-50/10' : 'border-gray-100 bg-gray-50/30 hover:border-primary hover:bg-primary/5'}`}
                                onClick={() => document.getElementById("fileInput")?.click()}
                            >
                                <input
                                    id="fileInput"
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                                {file ? (
                                    <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mb-3 shadow-lg">
                                            <Check size={18} className="text-white" strokeWidth={3} />
                                        </div>
                                        <p className="text-body font-bold text-black text-center max-w-[200px] truncate">{file.name}</p>
                                        <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-micro font-bold text-red-500 uppercase mt-2 hover:underline">{t("quickOrder.removeFile")}</button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center animate-in fade-in duration-300">
                                        <Upload size={32} className="text-black/30 mb-3 group-hover:text-primary transition-colors" />
                                        <p className="text-body-sm font-bold text-black/50 uppercase tracking-widest">{t("quickOrder.dropCsv")}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                            <button
                                onClick={handleDownloadSampleCsv}
                                disabled={loading}
                                className="text-label font-bold text-green-600 hover:text-green-700 flex items-center gap-2 transition-all group/dl disabled:opacity-50"
                            >
                                <FileDown size={18} className="group-hover/dl:translate-y-0.5 transition-transform" />
                                <span className="underline underline-offset-4 tracking-tight uppercase tracking-wider">{t("quickOrder.downloadSample")}</span>
                            </button>
                            <button
                                onClick={processFile}
                                disabled={loading}
                                className="w-full sm:w-auto h-[40px] px-10 bg-black text-white text-label font-bold uppercase tracking-[0.15em] rounded-sm hover:-translate-y-1 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <Upload size={14} className={loading ? "opacity-40" : ""} />
                                <span className={loading ? "opacity-50" : ""}>{t("quickOrder.uploadNow")}</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className={`flex justify-center ${isRtl ? 'md:justify-start' : 'md:justify-end'} mb-12 md:mb-20`}>
                    <button
                        onClick={handleClearAll}
                        disabled={loading}
                        className="flex items-center gap-4 text-label font-bold text-black uppercase tracking-[0.2em] hover:text-red-600 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50 group"
                    >
                        <div className="w-12 h-12 border-2 border-black rounded-full flex items-center justify-center group-hover:border-red-600 group-hover:shadow-lg transition-all duration-300">
                            <X size={20} className={loading ? "opacity-40" : ""} />
                        </div>
                        <span className={loading ? "opacity-50" : ""}>{t("quickOrder.clearAll")}</span>
                    </button>
                </div>

            </div>
        </div>
    );
}
