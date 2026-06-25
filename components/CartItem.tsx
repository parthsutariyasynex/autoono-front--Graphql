"use client";

import React, { useState } from "react";
import { X, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { CartItem as CartItemType } from "@/modules/cart/hooks/useCart";
import Price from "@/app/components/Price";
import toast from "react-hot-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { useAction } from "@/lib/hooks/useAction";
import { ButtonSpinner } from "@/components/GlobalLoadingOverlay";

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
    const { loading: isRemoving, run: runRemove } = useAction(`remove-item-${item.item_id}`);

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
        <div className="relative bg-white border border-[#ddd] rounded-sm hover:shadow-xl hover:shadow-gray-100/50 transition-all duration-500 group/item">
            {/* Remove Button */}
            <button
                onClick={() => runRemove(async () => { onRemove(item.item_id); })}
                disabled={isRemoving}
                className="absolute top-0 ltr:right-0 rtl:left-0 w-6 h-6 flex items-center justify-center bg-gray-50 text-black/60 rounded-full transition-all z-10 cursor-pointer hover:bg-dangerBright hover:text-black hover:scale-110 active:scale-95 opacity-100 lg:opacity-0 lg:group-hover/item:opacity-100 shadow-sm border border-gray-100 disabled:opacity-50"
                title={t("m.remove-item")}
            >
                {isRemoving ? (
                    <ButtonSpinner size={10} />
                ) : (
                    <>
                        <X size={12} strokeWidth={3.5} className="lg:hidden" />
                        <X size={10} strokeWidth={4} className="hidden lg:block" />
                    </>
                )}
            </button>

            {/* Mobile + tablet card layout — below lg (matches CartPage's lg grid switch) */}
            <div className="lg:hidden p-1">
                <div className="flex gap-4 items-center">
                    <div className="w-15 h-15 bg-white  flex items-center justify-center rounded-sm ">
                        <img src={item.image_url || "/images/tyre-sample.png"} alt={item.name} className="max-w-full max-h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-xs font-bold text-black leading-tight uppercase line-clamp-2 mb-1 rtl:pl-5 trl:md:pl-0  ltr:pr-5 ltr:md:pr-0">{item.name}</h3>
                        <div className="flex flex-wrap gap-1">
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
                            <div className="flex flex-wrap items-center gap-0 md:gap-2">
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
                                    className="w-8 h-8 flex items-center justify-center transition-all disabled:opacity-20"
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
                                    className="w-8 h-8 flex items-center justify-center transition-all"
                                >
                                    <Plus size={12} strokeWidth={3} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Desktop Layout — lg+ */}
            <div className="hidden lg:flex items-center p-1">
                <div className="w-[45%] flex items-center gap-4">
                    <div className="w-12 h-12 bg-white flex items-center justify-center transition-all flex-shrink-0">
                        <img src={item.image_url || "/images/tyre-sample.png"} alt={item.name} className="max-w-full max-h-full object-contain" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-xs xl:text-sm font-semibold text-black leading-tight uppercase line-clamp-1">{item.name}</h3>
                        <div className="flex flex-wrap gap-1.5">
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
                    <div className="flex items-center border border-[#ddd] bg-white rounded-lg focus-within:ring-1 focus-within:ring-primary transition-all">
                        <button
                            onClick={() => handleQtyChange(localQty - 1)}
                            disabled={localQty <= 1}
                            className="w-8 h-8 flex items-center justify-center transition-all disabled:opacity-20"
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
                            className="w-8 h-8 flex items-center justify-center transition-all"
                        >
                            <Plus size={12} strokeWidth={3} />
                        </button>
                    </div>
                </div>

                <div className="w-[20%] ltr:text-right rtl:text-left rtl:pl-4 ltr:pr-4">
                    <span className="text-sm xl:text-base font-bold text-black">
                        <Price amount={item.row_total} />
                    </span>
                </div>
            </div>
        </div>
    );
};

export default CartItem;
