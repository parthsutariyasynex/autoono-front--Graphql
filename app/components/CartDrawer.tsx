"use client";

import { X, Trash2, Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "@/modules/cart/hooks/useCart";
import Link from "next/link";
import { formatPrice } from "@/utils/helpers";
import Price from "./Price";
import { useTranslation } from "@/hooks/useTranslation";
import { useLocalePath } from "@/hooks/useLocalePath";


import Drawer from "./Drawer";
import Popup from "./Popup";
import toast from "react-hot-toast";

interface CartDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
    const { cart, isLoading, updateCartItem, removeFromCart, refetchCart } = useCart();
    const { t } = useTranslation();
    const lp = useLocalePath();

    // Confirmation State
    const [confirmId, setConfirmId] = useState<number | null>(null);
    const [isRemoving, setIsRemoving] = useState(false);

    // Sync with cart-updated events
    useEffect(() => {
        const handleCartUpdate = () => refetchCart();
        window.addEventListener("cart-updated", handleCartUpdate);
        return () => window.removeEventListener("cart-updated", handleCartUpdate);
    }, [refetchCart]);

    const handleConfirmDelete = async () => {
        if (!confirmId) return;
        setIsRemoving(true);
        try {
            await removeFromCart(confirmId);
            toast.success(t("cart.itemRemoved"));
            setConfirmId(null);
        } catch (error) {
            toast.error(t("cart.error"));
        } finally {
            setIsRemoving(false);
        }
    };

    const itemToDelete = cart?.items.find(i => i.item_id === confirmId);

    return (
        <>
            <Drawer
                isOpen={isOpen}
                onClose={onClose}
                title={`${cart?.items_count || 0} ${t("cart.itemsInCart")}`}
            >
                <div className="flex flex-col flex-1 min-h-0 bg-white">
                    {/* Header Sub-info */}
                    <div className="px-4 py-2.5 bg-gray-50/50 border-b border-[#ddd]">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold text-black uppercase tracking-widest leading-none">
                                {t("cart.subtotal")}
                            </span>
                            <span className="text-sm font-semibold text-black price ">
                                <Price amount={cart?.subtotal || 0} />
                            </span>
                        </div>
                    </div>

                    {/* Cart Product List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                <div className="space-y-3 w-full animate-pulse px-4">
                                    {Array.from({ length: 3 }).map((_, i) => (
                                        <div key={i} className="flex gap-3">
                                            <div className="h-14 w-14 bg-gray-200 rounded-lg" />
                                            <div className="flex-1 space-y-2">
                                                <div className="h-4 bg-gray-200 rounded w-3/4" />
                                                <div className="h-3 bg-gray-200 rounded w-1/2" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-black/50 font-bold uppercase tracking-widest">{t("cart.updatingCart")}</p>
                            </div>
                        ) : (cart?.items?.length || 0) === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 px-10 text-center">
                                <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-inner">
                                    <ShoppingCartIcon />
                                </div>
                                <p className="text-h3-sm font-semibold text-black uppercase tracking-tight">{t("cart.yourCartIsEmpty")}</p>
                                <p className="text-xs text-black/50 mt-2 font-medium">{t("cart.addItems")}</p>
                                <button
                                    onClick={onClose}
                                    className="mt-8 text-label font-semibold text-primary uppercase tracking-[0.2em] hover:text-black transition-colors"
                                >
                                    {t("multi.continueShopping")}
                                </button>
                            </div>
                        ) : (
                            <div className="divide-y divide-[#ddd] pb-20">
                                {cart?.items.map((item) => (
                                    <div key={item.item_id} className="px-4 py-2 flex gap-3 hover:bg-gray-50/30 transition-all group items-center">
                                        {/* Left: Product Image */}
                                        <div className="w-16 h-16 bg-white border border-[#ddd] rounded-sm flex-shrink-0 p-1 flex items-center justify-center shadow-sm group-hover:shadow-md transition-all duration-300">
                                            <img
                                                src={item.image_url || "/images/tyre-sample.png"}
                                                alt={item.name}
                                                width={96}
                                                height={96}
                                                className="max-w-full max-h-full object-contain"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = "/images/tyre-sample.png";
                                                }}
                                            />
                                        </div>

                                        {/* Center: Info */}
                                        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                                            <div className="flex gap-1 justify-between items-start">
                                                <h3 className="text-sm font-medium text-black leading-snug line-clamp-2 uppercase tracking-tight">
                                                    {item.name}
                                                </h3>

                                                <button
                                                    onClick={() => setConfirmId(item.item_id)}
                                                    className="w-6 h-6 flex items-center justify-center text-black transition-all relative top-[-4px]"
                                                    aria-label="Remove item"
                                                >
                                                    <Trash2 size={16} strokeWidth={2.5} />
                                                </button>
                                             
                                            </div>

                                            {/* Quantity & Actions */}
                                            <div className="flex items-center justify-between mt-0">
                                                   <p className="text-h3-sm font-semibold text-black mt-0.5 price">
                                                    <Price amount={item.price} />
                                                </p>
                                                <div className="flex items-center border border-[#ddd] bg-white rounded-lg focus-within:ring-1 focus-within:ring-primary transition-all">
                                                    <button
                                                        onClick={() => updateCartItem(item.item_id, item.qty - 1)}
                                                        className="w-7 h-7 flex items-center justify-center transition-all text-black/70 disabled:opacity-30"
                                                        disabled={item.qty <= 1}
                                                    >
                                                        <Minus size={12} strokeWidth={3} />
                                                    </button>
                                                    <span className="w-10 text-center text-xs font-semibold text-black bg-transparent">
                                                        {item.qty}
                                                    </span>
                                                    <button
                                                        onClick={() => updateCartItem(item.item_id, item.qty + 1)}
                                                        className="w-7 h-7 flex items-center justify-center transition-all text-black/70"
                                                    >
                                                        <Plus size={12} strokeWidth={3} />
                                                    </button>
                                                </div>

                                                
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Bottom Section */}
                    <div className="p-4 bg-white border-t border-[#ddd] shadow-[0_-10px_40px_rgba(0,0,0,0.04)] z-10">
                        <Link
                            href={lp("/cart")}
                            onClick={onClose}
                            className="flex items-center justify-center shadow-lg w-full px-2 py-3 xl:py-4 bg-primary text-[12px] font-bold font-[700] uppercase tracking-normal xl:tracking-[0.2em] leading-tight hover:bg-black hover:text-white transition-all duration-300 shadow-md rounded text-center"
                        >
                            {t("cart.viewAndEditCart")}
                        </Link>
                    </div>
                </div>
            </Drawer>

            <Popup
                isOpen={!!confirmId}
                onClose={() => setConfirmId(null)}
                animation="fade-scale"
                maxWidth="max-w-[550px]"
                className="!rounded-[4px] shadow-2xl"
            >
                <div className="bg-white relative">
                    {/* Close Button */}
                    <button
                        onClick={() => setConfirmId(null)}
                        className="absolute top-4 right-4 w-7 h-7 bg-black rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform z-10"
                    >
                        <X size={14} strokeWidth={3} />
                    </button>

                    <div className="p-8 pb-6">
                        <p className="text-black text-[15px] font-medium leading-relaxed mt-2">
                            {t("cart.confirmRemove")}
                        </p>
                    </div>

                    <div className="border-t border-gray-100 p-6 pt-5 pb-5 flex justify-end gap-3 bg-white">
                        <button
                            onClick={() => setConfirmId(null)}
                            className="px-8 py-2.5 bg-black text-white font-semibold uppercase tracking-widest text-body-sm hover:bg-gray-900 transition-all rounded-sm min-w-[120px]"
                        >
                            {t("common.cancel")}
                        </button>
                        <button
                            onClick={handleConfirmDelete}
                            disabled={isRemoving}
                            className="px-10 py-2.5 bg-primary text-black font-semibold uppercase tracking-widest text-body-sm hover:bg-primaryHover transition-all rounded-sm min-w-[100px] flex items-center justify-center gap-2"
                        >
                            {t("common.ok")}
                        </button>
                    </div>
                </div>
            </Popup>
        </>
    );
}

function ShoppingCartIcon() {
    return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black/40">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
    );
}
