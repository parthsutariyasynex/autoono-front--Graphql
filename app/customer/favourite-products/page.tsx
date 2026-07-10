
"use client";


import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, X, Info, Star, Trash2 } from "lucide-react";
import { formatPrice, redirectToLogin } from "@/utils/helpers";
import { toast } from "react-hot-toast";
import ProductEnquiryModal from "../../components/ProductEnquiryModal";
import ProductDialog from "../../components/ProductDialog";
import Drawer from "../../components/Drawer";
import Modal from "../../components/Modal";
import Price from "../../components/Price";
import AddToCartPopup from "../../components/AddToCartPopup";
import StockBySourceModal from "../../components/StockBySourceModal";
import AddToCartOverlay from "@/components/AddToCartOverlay";

import { api } from "@/lib/api/api-client";
import { useTranslation } from "@/hooks/useTranslation";
import Pagination, { PageSizeSelect } from "@/components/Pagination";
import { useCart } from "@/modules/cart/context/CartContext";
import { useSession } from "next-auth/react";
import PortalDropdown from "@/components/PortalDropdown";
import { FavouriteProductsSkeleton } from "@/components/skeletons";
import { useCanOrder } from "@/hooks/useCanOrder";

interface Product {
    product_id: number;
    name: string;
    sku: string;
    tyre_size: string;
    pattern: string;
    year: string;
    origin: string;
    image_url: string;
    stock_qty: number;
    stock_status: string;
    price?: number;
    final_price: number;
    original_price?: number;
    offer?: string;
    brand?: string;
    favorite_id?: number | string;
    is_in_stock?: boolean;
    stock_label?: string;
    stock_color?: string;
}

const TABLE_HEADER_KEYS = ['m.brand', 'm.size', 'm.pattern', 'm.year', 'm.origin', 'm.image', 'm.offer', 'm.stock', 'm.price', 'm.action'] as const;
const COL_WIDTHS = ['8%', '13%', '13%', '6%', '7%', '7%', '9%', '9%', '10%', '115px'] as const;
const ROW_HEIGHT = 'h-auto md:h-[52px]';

function TableColGroup() {
    return (
        <colgroup>
            {COL_WIDTHS.map((w, i) => <col key={i} style={{ width: w }} />)}
        </colgroup>
    );
}

export default function FavouriteProducts({ title }: { title?: React.ReactNode }) {
    const router = useRouter();
    const { t } = useTranslation();
    const { data: session } = useSession();
    const { refetchCart } = useCart();
    const { canOrder } = useCanOrder();

    const [favProducts, setFavProducts] = useState<Product[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [addingToCart, setAddingToCart] = useState<string | null>(null);
    const [quantities, setQuantities] = useState<Record<number, number>>({});
    const [removing, setRemoving] = useState<number | null>(null);
    const [isAddedPopupOpen, setIsAddedPopupOpen] = useState(false);
    const [addedProduct, setAddedProduct] = useState<any | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
    const [inquiryProduct, setInquiryProduct] = useState<Product | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [previewProduct, setPreviewProduct] = useState<Product | null>(null);

    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [stockProductSku, setStockProductSku] = useState<string | null>(null);
    const [stockProductName, setStockProductName] = useState<string | null>(null);

    const handleStockClick = useCallback((sku: string, name?: string) => {
        setStockProductSku(sku);
        setStockProductName(name || null);
        setIsStockModalOpen(true);
    }, []);

    const loadFavourites = useCallback(async () => {
        setLoading(true);
        try {
            // Using centralized api client which handles tokens and sessions
            const data = await api.get(`/kleverapi/favorite-products?currentPage=${currentPage}&pageSize=${pageSize}`);

            // Handle different API response formats
            const rawItems = Array.isArray(data.products) ? data.products : (Array.isArray(data.items) ? data.items : []);

            // Map items with all fields needed for ProductDialog popup
            const items = rawItems.map((p: any) => {
                const finalPrice = Number(p.final_price || p.special_price || p.price || 0);
                // In Magento, 'price' is often the original/old price if 'final_price' is different
                const potentialOldPrice = Number(p.price || p.regular_price || p.original_price || p.old_price || 0);

                // Only show as old price if it's strictly greater than the final price
                const originalPrice = potentialOldPrice > finalPrice ? potentialOldPrice : 0;
                const hasDiscount = originalPrice > finalPrice;
                const offerLabel = p.offer || p.discount_label || "";

                return {
                    ...p,
                    product_id: p.product_id || p.id,
                    name: p.name || p.sku || "N/A",
                    image_url: p.image_url || p.image || "/placeholder-tyre.png",
                    final_price: finalPrice,
                    original_price: originalPrice,
                    offer: offerLabel,
                    stock_qty: Number(p.stock_qty || 0),
                    brand: p.brand || (p.name ? p.name.split(' ')[0] : "—"),
                    tyre_size: p.tyre_size || "—",
                    favorite_id: p.favorite_id || p.id,
                    item_code: p.item_code || p.sku,
                    product_group: p.product_group || "",
                    tyre_type: p.tyre_type || "",
                    oem_marking: p.oem_marking || "",
                };
            });

            const total = typeof data.total_count === "number" ? data.total_count : items.length;

            setFavProducts(items);
            setTotalCount(total);

            const initialQtys: Record<number, number> = {};
            items.forEach((p: Product) => {
                initialQtys[p.product_id] = 1;
            });
            setQuantities(prev => ({ ...prev, ...initialQtys }));
        } catch (err) {
            console.error("Failed to load favourites", err);
            // Don't show toast error if it's just empty or loading
            if (err !== "Unauthorized" && err !== "Something went wrong") {
                toast.error(t("favorites.errorLoading"));
            }
        } finally {
            setLoading(false);
        }
    }, [currentPage, pageSize]);

    useEffect(() => {
        // Trigger load even if session is loading/null (it will check localStorage fallback)
        loadFavourites();
    }, [loadFavourites]);

    // Scroll and Layout shift is now managed internally by the Modal/Drawer component

    const handleQtyChange = (productId: number, val: string) => {
        const num = parseInt(val) || 1;
        setQuantities(prev => ({ ...prev, [productId]: Math.max(1, num) }));
    };

    const handleRemove = async (product: Product) => {
        setRemoving(product.product_id);
        const toastId = toast.loading(t("favorites.remove"));
        try {
            // Updating local storage to maintain consistency with other components
            const stored = localStorage.getItem("favourites");
            const favIds: number[] = stored ? JSON.parse(stored) : [];
            const updated = favIds.filter(id => id !== product.product_id);
            localStorage.setItem("favourites", JSON.stringify(updated));

            // Proper API call to remove using the unique favorite item ID
            const deleteId = product.favorite_id || product.product_id;
            await api.delete(`/kleverapi/favorite-products/${deleteId}`);

            setFavProducts(prev => prev.filter(p => p.product_id !== product.product_id));
            setTotalCount(prev => Math.max(0, prev - 1));
            toast.success(t("favorites.removeSuccess"), { id: toastId });
        } catch (err) {
            toast.error(t("favorites.removeFailed"), { id: toastId });
        } finally {
            setRemoving(null);
        }
    };

    const onAddToCart = async (product: Product) => {
        const qty = quantities[product.product_id] || 1;
        setAddingToCart(product.sku);
        try {
            await api.post("/kleverapi/cart/add", { sku: product.sku, qty });
            await refetchCart();
            setAddedProduct(product);
            setIsAddedPopupOpen(true);
        } catch (err) {
            if (err === "Unauthorized") {
                redirectToLogin(router);
            }
            toast.error(t("cart.updateFailed"));
        } finally {
            setAddingToCart(null);
        }
    };

    // Fetch full product details for the popup (to get item_code, product_group, tyre_type, oem_marking)
    const handleShowProductDetail = async (product: Product) => {
        try {
            const token = typeof window !== "undefined"
                ? (localStorage.getItem("isSubAccount") === "true"
                    ? (localStorage.getItem("subAccountToken") || localStorage.getItem("token"))
                    : localStorage.getItem("token"))
                : null;
            const fetchLocale = typeof window !== "undefined" && window.location.pathname.startsWith("/ar") ? "ar" : "en";
            const headers: HeadersInit = { "Content-Type": "application/json", "x-locale": fetchLocale };
            if (token) headers["Authorization"] = `Bearer ${token}`;

            // Extract item code from SKU (remove year suffix e.g. "PSR02347-2025" → "PSR02347")
            const itemCode = product.sku?.replace(/-\d{4}$/, "") || product.sku;

            const res = await fetch(`/api/category-products?categoryId=5&page=1&pageSize=5&itemCode=${itemCode}`, { headers });
            if (res.ok) {
                const data = await res.json();
                const items = data.products || data.items || [];
                // Find exact match by SKU
                const match = items.find((p: any) => p.sku === product.sku) || items[0];
                if (match) {
                    setSelectedProduct({ ...product, ...match });
                } else {
                    setSelectedProduct(product);
                }
            } else {
                setSelectedProduct(product);
            }
        } catch (err) {
            console.error("Failed to fetch product details for popup:", err);
            setSelectedProduct(product);
        } finally {
        }
    };

    const startItem = totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0;
    const endItem = Math.min(currentPage * pageSize, totalCount);

    if (loading && favProducts.length === 0) {
        return <FavouriteProductsSkeleton count={6} />;
    }

    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <>
        <AddToCartOverlay isProcessing={addingToCart !== null || removing !== null} message={removing !== null ? "Removing from Favourites..." : "Processing Add to Cart..."} />
        <div className={`w-full font-rubik${(addingToCart !== null || removing !== null) ? " blur-sm pointer-events-none select-none" : ""}`}>

            <div className="flex items-center gap-4 mb-8">
                <div className="flex-1">
                    {typeof title === 'string' ? (
                        <h1 className="text-xl font-bold text-black uppercase tracking-tight">
                            {title}
                        </h1>
                    ) : title || (
                        <h1 className="text-xl font-bold text-black uppercase tracking-tight">
                            {t("nav.favouriteProducts")}
                        </h1>
                    )}
                </div>
                <div className="h-[2px] flex-1 ltr:bg-gradient-to-r rtl:bg-gradient-to-l from-primary to-transparent"></div>
            </div>

            {/* Mobile/Tablet Card List */}
            <div className="xl:hidden grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {favProducts.length === 0 ? (
                    <div className="py-16 text-center text-gray-400 italic text-[13px]">{t("favorites.empty")}</div>
                ) : favProducts.map((product) => {
                    const brandName = product.brand || product.name.split(' ')[0] || "—";
                    const isOutOfStock = product.is_in_stock === false || product.stock_label === "Not Available" || product.stock_status === "Out of Stock" || product.stock_status === "Not Available" || Number(product.stock_qty || 0) <= 0;
                    const isLimited = !isOutOfStock && product.stock_qty > 0 && product.stock_qty <= 10;
                    const dotColor = product.stock_color
                        ? (() => { const c = (product.stock_color || "").toLowerCase(); return c === "green" ? "bg-green-500" : c === "yellow" || c === "orange" ? "bg-yellow-400" : c === "red" ? "bg-red-500" : "bg-gray-400"; })()
                        : isOutOfStock ? "bg-red-500" : isLimited ? "bg-yellow-400" : "bg-green-500";
                    const stockLabel = product.stock_label || (isOutOfStock ? t("stock.not_available") : isLimited ? t("stock.limited") : t("stock.available"));

                    return (
                        <div key={product.product_id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 flex flex-col gap-2">
                            <div className="flex gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t(`data.${brandName}`) !== `data.${brandName}` ? t(`data.${brandName}`) : brandName}</p>
                                    <p className="text-[12px] font-bold text-gray-900 leading-tight mt-0.5 truncate">{product.pattern || product.name || "—"}</p>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <span dir="ltr" className="text-[12px] font-bold text-black">{product.tyre_size || "—"}</span>
                                        <div onClick={() => handleShowProductDetail(product)} className="w-4 h-4 bg-gray-900 rounded-full flex items-center justify-center text-[9px] font-bold text-white cursor-pointer active:scale-95 flex-shrink-0">i</div>
                                        {product.origin && <span className="text-[11px] text-gray-400">{t(`data.${product.origin}`) !== `data.${product.origin}` ? t(`data.${product.origin}`) : product.origin}</span>}
                                        {product.year && <span className="text-[11px] text-gray-400 font-mono">{product.year}</span>}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-1.5">
                                        <span
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleStockClick(product.sku, product.name);
                                            }}
                                            className={`w-2 h-2 rounded-full ${dotColor} cursor-pointer hover:scale-125 active:scale-95 transition-transform`}
                                            title={t("stockBySource.title")}
                                        />
                                        <span className="text-[10px] font-bold text-gray-600 uppercase">{stockLabel}</span>
                                    </div>
                                    {product.offer && <p className="text-[10px] font-bold text-red-600 uppercase mt-1">{product.offer}</p>}
                                </div>
                                <div className="w-14 h-14 flex-shrink-0 rounded-lg border border-gray-100 overflow-hidden bg-gray-50 flex items-center justify-center cursor-pointer" onClick={() => { setSelectedImage(product.image_url); setPreviewProduct(product); setIsImageModalOpen(true); }}>
                                    <img src={product.image_url} alt={product.name} className="w-full h-full object-contain" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between border-t border-gray-100 pt-2.5 mt-1 gap-2">
                                <div className="flex flex-col">
                                    {product.original_price && product.original_price > product.final_price ? (
                                        <>
                                            <span className="text-[10px] font-bold text-gray-400">
                                                <Price amount={product.original_price} className="font-bold line-through" />
                                            </span>
                                            <span className="text-[13px] font-bold text-black rubik-sans">
                                                <Price amount={product.final_price} />
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-[13px] font-bold text-black rubik-sans">
                                            <Price amount={product.final_price} />
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    {canOrder && (!isOutOfStock ? (
                                        <button onClick={() => onAddToCart(product)} disabled={addingToCart === product.sku} className={`h-9 px-2.5 rounded-lg flex items-center gap-1.5 text-[11px] font-bold uppercase shadow-sm active:scale-95 cursor-pointer flex-shrink-0 bg-primary text-black`}>
                                            {addingToCart === product.sku ? <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></div> : <><ShoppingCart size={14} strokeWidth={2.5} /></>}
                                        </button>
                                    ) : (
                                        <button onClick={() => { setInquiryProduct(product); setIsInquiryModalOpen(true); }} className="h-9 px-2.5 bg-primary text-black rounded-lg flex items-center gap-1.5 text-[11px] font-bold uppercase shadow-sm active:scale-95 cursor-pointer flex-shrink-0">
                                            <Info size={14} strokeWidth={2.5} />
                                        </button>
                                    ))}
                                    <button onClick={() => handleRemove(product)} disabled={removing === product.product_id} className={`w-9 h-9 rounded-lg flex items-center justify-center active:scale-95 cursor-pointer flex-shrink-0 ${removing === product.product_id ? "bg-gray-100 text-gray-400" : "bg-white text-gray-400 border border-gray-100 hover:text-red-500"}`}>
                                        {removing === product.product_id ? <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin"></div> : <Trash2 size={16} strokeWidth={2.5} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="hidden xl:flex flex-col bg-white rounded-xl shadow-sm border border-[#ebebeb] overflow-hidden transition-all duration-300 hover:shadow-md">
                <div className="flex-1 overflow-x-auto">
                    <table className="w-full border-collapse table-fixed min-w-[950px]">
                        <colgroup><col className="w-[10%]" /><col className="w-[12%]" /><col className="w-[15%]" /><col className="w-[6%]" /><col className="w-[10%]" /><col className="w-[6%]" /><col className="w-[4%]" /><col className="w-[11%]" /><col className="w-[13%]" /><col className="w-[13%]" /></colgroup>
                        <thead className="sticky top-0 z-20">
                            <tr className="bg-gray-50/80 text-black text-[11px] font-bold uppercase tracking-widest h-[60px] border-b border-[#ebebeb]">
                                {TABLE_HEADER_KEYS.map(key => (
                                    <th key={key} className="px-2 md:px-4 text-center">
                                        {key === 'm.size' ? (
                                            <div className="flex items-center justify-center whitespace-nowrap">
                                                {t(key)} <Info className="w-3.5 h-3.5 text-gray-300 ml-1.5 cursor-pointer hover:text-gray-500" />
                                            </div>
                                        ) : t(key)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {favProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-5 py-24 text-center">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">{t("favorites.empty")}</p>
                                    </td>
                                </tr>
                            ) : (
                                favProducts.map((product) => {
                                    const brandName = product.brand || product.name.split(' ')[0] || "—";
                                    const isOutOfStock = product.is_in_stock === false || product.stock_label === "Not Available" || product.stock_status === "Out of Stock" || product.stock_status === "Not Available" || Number(product.stock_qty || 0) <= 0;
                                    const isLimited = !isOutOfStock && product.stock_qty > 0 && product.stock_qty <= 10;
                                    const stockColor = product.stock_color
                                        ? (() => { const c = (product.stock_color || "").toLowerCase(); return c === "green" ? "bg-green-500" : c === "yellow" || c === "orange" ? "bg-yellow-400" : c === "red" ? "bg-red-500" : "bg-gray-400"; })()
                                        : isOutOfStock ? "bg-red-500" : isLimited ? "bg-yellow-400" : "bg-green-500";
                                    const stockLabel = product.stock_label || (isOutOfStock ? t("stock.not_available") : isLimited ? t("stock.limited") : t("stock.available"));

                                    return (
                                        <tr key={product.product_id} className={`hover:bg-yellow-50/20 transition-colors group ${ROW_HEIGHT}`}>
                                            <td className="px-2 md:px-4 text-[12px] font-bold text-gray-900 text-center">{t(`data.${brandName}`) !== `data.${brandName}` ? t(`data.${brandName}`) : brandName}</td>
                                            <td className="px-2 md:px-4 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <span dir="ltr" className="text-[12px] font-bold text-gray-900 tracking-tight">{product.tyre_size}</span>
                                                    <div
                                                        onClick={() => handleShowProductDetail(product)}
                                                        className={`w-3.5 h-3.5 bg-gray-900 rounded-full flex items-center justify-center text-[8px] font-bold text-white cursor-pointer hover:bg-primary hover:text-black transition-all shadow-sm flex-shrink-0`}
                                                    >
                                                        i
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-2 md:px-4 text-[12px] font-medium text-gray-700 text-center">{product.pattern || "—"}</td>
                                            <td className="px-2 md:px-4 text-[12px] font-medium text-gray-500 text-center font-mono">{product.year || "—"}</td>
                                            <td className="px-2 md:px-4 text-[12px] font-medium text-gray-600 text-center">{product.origin ? (t(`data.${product.origin}`) !== `data.${product.origin}` ? t(`data.${product.origin}`) : product.origin) : "—"}</td>
                                            <td className="px-2 md:px-4 text-center">
                                                <div className="w-10 h-10 mx-auto">
                                                    {product.image_url ? (
                                                        <div
                                                            className="relative w-10 h-10 group/img cursor-pointer"
                                                            onClick={() => {
                                                                setSelectedImage(product.image_url);
                                                                setPreviewProduct(product);
                                                                setIsImageModalOpen(true);
                                                            }}
                                                        >
                                                            <img
                                                                src={product.image_url}
                                                                alt={product.name}
                                                                className="w-10 h-10 object-contain rounded border border-gray-100 shadow-sm"
                                                            />
                                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-all duration-300 flex items-center justify-center rounded">
                                                                <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center text-black font-bold text-[10px] shadow-lg transform scale-50 group-hover/img:scale-100 transition-transform duration-300">+</div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] text-gray-300 font-bold uppercase leading-[40px]">{t("m.no-image")}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-2 md:px-4 text-center">
                                                {product.offer ? (
                                                    <span className="text-red-600 font-bold text-[10px] uppercase tracking-tight block max-w-[120px] mx-auto">
                                                        {product.offer}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-200">—</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-4 text-center">
                                                <div className="flex flex-col items-center justify-center text-center gap-1.5">
                                                    <span
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleStockClick(product.sku, product.name);
                                                        }}
                                                        className={`w-3.5 h-3.5 rounded-full border border-white shadow-sm ${stockColor} cursor-pointer hover:scale-110 active:scale-95 transition-transform`}
                                                        title={t("stockBySource.title")}
                                                    />
                                                    <span className="text-[10px] font-extrabold text-gray-700 uppercase leading-none tracking-tighter">{stockLabel}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-4 text-center whitespace-nowrap">
                                                <div className="flex flex-col items-center justify-center">
                                                    {product.original_price && product.original_price > product.final_price ? (
                                                        <>
                                                            <span className="text-[10px] font-bold text-gray-400 mb-0.5">
                                                                <Price amount={product.original_price} className="font-bold line-through" />
                                                            </span>
                                                            <span className="text-[13px] font-extrabold text-black tracking-tight leading-none">
                                                                <Price amount={product.final_price} />
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <span className="text-[13px] font-extrabold text-black tracking-tight leading-none">
                                                            <Price amount={product.final_price} />
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-2 text-center align-middle">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {/* Col 1: Qty */}
                                                    {canOrder && (!isOutOfStock ? (
                                                        <div className="w-9 h-8 border border-gray-200 rounded-md flex items-center justify-center text-[11px] font-bold text-gray-900 bg-white shadow-sm overflow-hidden">
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={quantities[product.product_id] || 1}
                                                                onChange={(e) => handleQtyChange(product.product_id, e.target.value)}
                                                                className="w-full bg-transparent text-center text-[12px] font-bold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none p-0"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="w-9 h-8" />
                                                    ))}

                                                    {/* Col 2: Cart or Enquiry */}
                                                    {canOrder && (!isOutOfStock ? (
                                                        <button
                                                            onClick={() => onAddToCart(product)}
                                                            disabled={addingToCart === product.sku}
                                                            className="w-8 h-8 bg-primary hover:bg-primaryHover text-black rounded-md flex items-center justify-center shadow-sm active:scale-95 transition-all disabled:opacity-50"
                                                            title={t("m.add-to-cart")}
                                                        >
                                                            {addingToCart === product.sku ? (
                                                                <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                                                            ) : (
                                                                <ShoppingCart size={15} strokeWidth={2.5} />
                                                            )}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => { setInquiryProduct(product); setIsInquiryModalOpen(true); }}
                                                            className="w-8 h-8 bg-primary hover:bg-primaryHover text-black rounded-md flex items-center justify-center shadow-sm active:scale-95 transition-all"
                                                        >
                                                            <Info size={15} strokeWidth={2.5} />
                                                        </button>
                                                    ))}

                                                    {/* Col 3: Delete */}
                                                    <button
                                                        onClick={() => handleRemove(product)}
                                                        disabled={removing === product.product_id}
                                                        className={`w-8 h-8 rounded-md flex items-center justify-center active:scale-95 cursor-pointer border transition-colors ${removing === product.product_id ? "bg-gray-100 text-gray-400 border-gray-100" : "bg-white text-gray-400 border-gray-200 hover:text-red-500 hover:border-red-100"}`}
                                                        title={t("m.remove-from-wishlist")}
                                                    >
                                                        {removing === product.product_id ? (
                                                            <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin"></div>
                                                        ) : (
                                                            <Trash2 size={16} strokeWidth={2.5} />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Bottom Pagination */}
            {
                totalCount > pageSize && (
                    <div className="mt-0 w-full">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={Math.ceil(totalCount / pageSize)}
                            totalItems={totalCount}
                            pageSize={pageSize}
                            onPageChange={setCurrentPage}
                            onPageSizeChange={(val: number) => { setPageSize(val); setCurrentPage(1); }}
                        />
                    </div>
                )
            }
            {/* Inquiry Modal */}
            {
                inquiryProduct && (
                    <ProductEnquiryModal
                        isOpen={isInquiryModalOpen}
                        onClose={() => {
                            setIsInquiryModalOpen(false);
                            setInquiryProduct(null);
                        }}
                        productSku={inquiryProduct?.sku || ""}
                        productName={inquiryProduct?.name || ""}
                        productPrice={inquiryProduct?.final_price || 0}
                    />
                )
            }

            {/* Product Details Modal */}
            <ProductDialog
                product={selectedProduct}
                isOpen={!!selectedProduct}
                onClose={() => setSelectedProduct(null)}
            />

            <AddToCartPopup
                isOpen={isAddedPopupOpen}
                product={addedProduct}
                onClose={() => {
                    setIsAddedPopupOpen(false);
                    setAddedProduct(null);
                }}
            />

            <StockBySourceModal
                isOpen={isStockModalOpen}
                sku={stockProductSku}
                productName={stockProductName}
                onClose={() => {
                    setIsStockModalOpen(false);
                    setStockProductSku(null);
                    setStockProductName(null);
                }}
            />

            {/* Image Preview - Side Drawer */}
            <Drawer
                isOpen={isImageModalOpen && !!selectedImage}
                onClose={() => setIsImageModalOpen(false)}
            >
                <div className="flex flex-col h-full bg-white">
                    <div className="bg-[#FFB82B] px-4 md:px-8 py-4 md:py-6 flex items-center justify-center relative flex-shrink-0">
                        <h2 className="text-[14px] md:text-[17px] font-bold text-black text-center uppercase tracking-tight">
                            {previewProduct ? <span dir="ltr">{previewProduct.pattern || '-'} - {previewProduct.tyre_size || '-'}</span> : t("m.preview")}
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center justify-center">
                        <div className="p-2 md:p-4 bg-white flex items-center justify-center min-h-[200px] md:min-h-[400px] w-full">
                            <img src={selectedImage || ''} alt={previewProduct ? `${previewProduct.pattern} - ${previewProduct.tyre_size}` : t("m.preview")} className="max-w-full max-h-[60vh] md:max-h-[75vh] object-contain rounded-lg" />
                        </div>
                        <div className="mt-6 md:mt-10 w-full">
                            <button onClick={() => setIsImageModalOpen(false)} className="w-full py-3 md:py-4 bg-black text-white text-[12px] md:text-sm font-bold uppercase tracking-widest rounded shadow-xl hover:bg-gray-800 transition-all cursor-pointer active:scale-95">Close Preview</button>
                        </div>
                    </div>
                </div>
            </Drawer>
        </div>
        </>
    );
}
