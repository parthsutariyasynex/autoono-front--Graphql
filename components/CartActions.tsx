"use client";
import { useLocalePath } from "@/hooks/useLocalePath";
import { useTranslation } from "@/hooks/useTranslation";

import React from "react";
import Link from "next/link";


interface CartActionsProps {
    itemsCount: number;
    onClearCart: () => void;
    onUpdateCart: () => void;
    isClearingCart?: boolean;
}

const CartActions: React.FC<CartActionsProps> = ({ itemsCount, onClearCart, onUpdateCart, isClearingCart }) => {
    const lp = useLocalePath();
    const { t } = useTranslation();
    return (
        <div className="flex flex-col md:flex-row justify-between items-center bg-gray-50/50 border border-[#ddd] p-3 rounded-sm gap-5">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <Link
                    href={lp("/products")}
                    className="flex-1 md:flex-none whitespace-pre px-4 py-2 bg-black text-white text-[12px] font-bold uppercase tracking-[0.2em] hover:bg-gray-800 transition-all cursor-pointer rounded-sm text-center shadow-sm"
                >
                    {t("common.continueShopping")}
                </Link>
                <button
                    onClick={onClearCart}
                    disabled={isClearingCart}
                    className="flex-1 md:flex-none whitespace-pre px-4 py-2 bg-white text-black text-[12px] font-bold uppercase tracking-[0.2em] hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all border border-gray-100 cursor-pointer rounded-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >

                    {t("cart.clearCart")}
                </button>
                <button
                    onClick={onUpdateCart}
                    className="flex-1 md:flex-none whitespace-pre px-4 py-2 bg-primary text-[12px] font-bold uppercase tracking-[0.2em] hover:bg-black transition-all cursor-pointer rounded-sm shadow-md shadow-black/5"
                >
                    {t("cart.updateCart")}
                </button>
            </div>

            <div className="flex items-center gap-4">
                <div className="text-right">
                    <span className="text-[12px] whitespace-nowrap font-bold text-black uppercase tracking-widest block mb-0.5">
                        {t("cart.itemsInCart")}
                    </span>
                    <span className="text-[12px] whitespace-nowrap font-bold text-black/50 uppercase tracking-widest block leading-none">

                    </span>
                </div>
                <div className="w-8 h-8 bg-white border border-gray-100 rounded-sm flex items-center justify-center shadow-sm">
                    <span className="text-sm font-bold text-black">
                        {itemsCount}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default CartActions;
