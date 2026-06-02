"use client";

import React, { useState } from "react";
import { X, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { CartItem as CartItemType } from "@/modules/cart/hooks/useCart";
import Price from "@/app/components/Price";


import toast from "react-hot-toast";
import { useTranslation } from "@/hooks/useTranslation";

interface CartItemProps {
    item: CartItemType;
    currencyCode: string;
    onUpdateQty: (id: number, qty: number) => void;
    onRemove: (id: number) => void;
    onEnter?: () => void;
}

const CartItem: React.FC<CartItemProps> = ({ item, currencyCode, onUpdateQty, onRemove, onEnter }) => {
    const { t } = useTranslation();
    const [localQty, setLocalQty] = useState(item.qty);

    const handleQtyChange = (newQty: number) => {
        if (newQty < 1) return;
        setLocalQty(newQty);
        onUpdateQty(item.item_id, newQty);
    };

    // Update local state if the prop changes
    React.useEffect(() => {
        setLocalQty(item.qty);
    }, [item.qty]);

    return (
        <div className="relative bg-white border border-gray-100 rounded-3xl p-4 lg:p-6 hover:shadow-xl hover:shadow-gray-100/50 transition-all duration-500 group/item">
            {/* Remove Button */}
            <button
                onClick={() => {
                    onRemove(item.item_id);
                }}
                className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-gray-50 text-black/50 rounded-full transition-all z-10 cursor-pointer hover:bg-dangerBright hover:text-black hover:scale-110 active:scale-95 opacity-0 group-hover/item:opacity-100 shadow-sm border border-gray-100"
                title={t("m.remove-item")}
            >
                <X size={10} strokeWidth={4} />
            </button>

            {/* Mobile Layout — below md (matches CartPage's md grid switch) */}
            <div className="md:hidden">
                <div className="flex gap-4">
                    <div className="w-20 h-20 bg-white border border-gray-100 p-2 flex items-center justify-center rounded-2xl shadow-sm">
                        <img src={item.image_url || "/images/tyre-sample.png"} alt={item.name} className="max-w-full max-h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-xs font-bold text-black leading-tight uppercase line-clamp-2 mb-1">{item.name}</h3>
                        <div className="flex flex-wrap gap-1 mb-2">
                            {item.size_display && (
                                <span className="text-[8px] font-bold text-black/50 bg-gray-50 px-1 py-0.5 rounded uppercase">
                                    {item.size_display}
                                </span>
                            )}
                            {item.pattern_display && (
                                <span className="text-[8px] font-bold text-black/50 bg-gray-50 px-1 py-0.5 rounded uppercase">
                                    {item.pattern_display}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-black/40 font-bold uppercase">{t("m.unit-price") || "Unit"}</span>
                                <span className="text-xs font-bold text-black/60">
                                    <Price amount={item.price} />
                                </span>
                                <span className="text-sm font-bold text-black mt-0.5">
                                    <Price amount={item.row_total} />
                                </span>
                            </div>
                            <div className="flex items-center border border-gray-100 bg-white rounded-lg shadow-sm">
                                <button
                                    onClick={() => handleQtyChange(localQty - 1)}
                                    disabled={localQty <= 1}
                                    className="w-8 h-8 flex items-center justify-center hover:bg-primary transition-all disabled:opacity-20"
                                >
                                    <Minus size={12} strokeWidth={3} />
                                </button>
                                <input
                                    type="text"
                                    value={localQty}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        const num = parseInt(val) || 0;
                                        setLocalQty(num);
                                        onUpdateQty(item.item_id, num);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') onEnter?.();
                                    }}
                                    onFocus={(e) => e.target.select()}
                                    className="w-10 h-8 text-center text-xs font-bold text-black border-x border-gray-50 focus:outline-none"
                                />
                                <button
                                    onClick={() => handleQtyChange(localQty + 1)}
                                    className="w-8 h-8 flex items-center justify-center hover:bg-primary transition-all"
                                >
                                    <Plus size={12} strokeWidth={3} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Desktop Layout — md+ */}
            <div className="hidden md:flex items-center">
                <div className="w-[45%] flex items-center gap-4">
                    <div className="w-16 xl:w-20 h-16 xl:h-20 bg-white border border-gray-100 p-1.5 flex items-center justify-center rounded-xl shadow-sm group-hover/item:shadow-md transition-all flex-shrink-0">
                        <img src={item.image_url || "/images/tyre-sample.png"} alt={item.name} className="max-w-full max-h-full object-contain" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-xs xl:text-sm font-bold text-black leading-tight uppercase line-clamp-1">{item.name}</h3>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {item.size_display && (
                                <span className="text-micro font-bold text-black/50 bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded-md uppercase">
                                    {item.size_display}
                                </span>
                            )}
                            {item.pattern_display && (
                                <span className="text-micro font-bold text-black/50 bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded-md uppercase">
                                    {item.pattern_display}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="w-[15%] text-center">
                    <span className="text-xs xl:text-sm font-bold text-black">
                        <Price amount={item.price} />
                    </span>
                </div>

                <div className="w-[20%] flex justify-center items-center">
                    <div className="flex items-center border border-gray-100 bg-white rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-primary transition-all">
                        <button
                            onClick={() => handleQtyChange(localQty - 1)}
                            disabled={localQty <= 1}
                            className="w-8 h-8 flex items-center justify-center hover:bg-primary transition-all disabled:opacity-20"
                        >
                            <Minus size={12} strokeWidth={3} />
                        </button>
                        <input
                            type="text"
                            value={localQty}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                const num = parseInt(val) || 0;
                                setLocalQty(num);
                                onUpdateQty(item.item_id, num);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') onEnter?.();
                            }}
                            onFocus={(e) => e.target.select()}
                            className="w-10 h-8 text-center text-xs font-bold text-black border-x border-gray-50 focus:outline-none"
                        />
                        <button
                            onClick={() => handleQtyChange(localQty + 1)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-primary transition-all"
                        >
                            <Plus size={12} strokeWidth={3} />
                        </button>
                    </div>
                </div>

                <div className="w-[20%] text-right pr-4">
                    <span className="text-sm xl:text-base font-bold text-black">
                        <Price amount={item.row_total} />
                    </span>
                </div>
            </div>
        </div>
    );
};

export default CartItem;
