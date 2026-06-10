"use client";
import { useLocalePath } from "@/hooks/useLocalePath";
import { useTranslation } from "@/hooks/useTranslation";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { X } from "lucide-react";
import Price from "@/app/components/Price";
import { useGift } from "@/modules/cart/context/GiftContext";
import { useCart } from "@/modules/cart/hooks/useCart";

interface CartSummaryProps {
    subtotal: number;
    taxAmount: number;
    taxLabel: string;
    shippingAmount?: number;
    grandTotal: number;
    currencyCode: string;
    discountAmount?: number;
    appliedCoupons?: Array<{ code: string }>;
}

const CartSummary: React.FC<CartSummaryProps> = ({ subtotal, taxAmount, taxLabel, shippingAmount = 0, grandTotal, currencyCode, discountAmount, appliedCoupons }) => {
    const router = useRouter();
    const lp = useLocalePath();
    const { t, isRtl } = useTranslation();
    const { availableGifts, openGiftModal, hasGifts } = useGift();
    const { refetchCart } = useCart();

    const hasDiscount = !!discountAmount && discountAmount > 0;
    const activeCoupons = appliedCoupons ?? [];

    const [couponInput, setCouponInput] = useState("");
    const [couponBusy, setCouponBusy] = useState(false);

    const applyCoupon = async () => {
        const code = couponInput.trim();
        if (!code) return;
        setCouponBusy(true);
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            const res = await fetch("/api/kleverapi/cart/apply-coupon", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ couponCode: code }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast.error(data.message || t("m.coupon-apply-failed") || "Coupon could not be applied");
                return;
            }
            toast.success(t("m.coupon-applied") || "Coupon applied");
            setCouponInput("");
            await refetchCart();
        } catch {
            toast.error(t("m.coupon-apply-failed") || "Coupon could not be applied");
        } finally {
            setCouponBusy(false);
        }
    };

    const removeCoupon = async () => {
        setCouponBusy(true);
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            const res = await fetch("/api/kleverapi/cart/remove-coupon", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({}),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast.error(data.message || t("m.coupon-remove-failed") || "Could not remove coupon");
                return;
            }
            toast.success(t("m.coupon-removed") || "Coupon removed");
            await refetchCart();
        } catch {
            toast.error(t("m.coupon-remove-failed") || "Could not remove coupon");
        } finally {
            setCouponBusy(false);
        }
    };

    return (
        <div className="md:sticky md:top-28 self-start bg-white border border-gray-100 rounded-sm shadow-[0_10px_40px_rgba(0,0,0,0.05)] overflow-hidden">
            {/* Header */}
            <div className="bg-gray-200 px-6 py-4 border-b border-gray-200 flex items-center justify-center">
                <h2 className="text-[18px] font-[900] text-black uppercase tracking-tight">
                    {t("orderDetails.orderSummary") === "ORDER SUMMARY" ? "SUMMARY" : (t("orderDetails.orderSummary") || "SUMMARY")}
                </h2>
            </div>

            <div className="px-6 py-5 space-y-0">
                {/* Price Breakdown */}
                <div className="space-y-3 pb-4 border-b border-gray-100">
                    {/* Subtotal */}
                    <div className="flex justify-between items-center">
                        <span className="text-[13px] font-[900] text-black uppercase tracking-tight">
                            {t("cart.subtotal") || "SUBTOTAL"}
                        </span>
                        <span className="text-[13px] font-[900] text-black">
                            <Price amount={subtotal} />
                        </span>
                    </div>

                    {/* Discount — only shown when items have a discount applied */}
                    {!!discountAmount && discountAmount > 0 && (
                        <div className="flex justify-between items-center">
                            <span className="text-[#008a00] font-[900] text-caption uppercase tracking-tight">
                                {t("m.discount") || "DISCOUNT"}
                            </span>
                            <span className="font-[900] text-[#008a00] text-body-sm">
                                - <Price amount={discountAmount} />
                            </span>
                        </div>
                    )}

                    {/* VAT (15%) */}
                    <div className="flex justify-between items-center">
                        <span className="text-[13px] font-[900] text-black uppercase tracking-tight">
                            {isRtl ? t("m.tax") : "VAT (15%)"}
                        </span>
                        <span className="text-[13px] font-[900] text-black">
                            <Price amount={taxAmount} />
                        </span>
                    </div>

                    {/* Shipping */}
                    <div className="flex justify-between items-center">
                        <span className="text-[13px] font-[900] text-black uppercase tracking-tight">
                            {t("m.shipping") || "SHIPPING"}
                        </span>
                        <span className="text-[13px] font-[900] text-black">
                            <Price amount={shippingAmount} />
                        </span>
                    </div>
                </div>

                {/* Grand Total */}
                <div className="flex justify-between items-center pt-4">
                    <span className="text-[14px] font-[900] text-black uppercase tracking-tight">
                        {t("common.grandTotal") || "GRAND TOTAL"}
                    </span>
                    <span className="text-[14px] font-[900] text-black">
                        <Price amount={grandTotal} />
                    </span>
                </div>

                {/* Coupon Code */}
                <div className="pt-5 border-t border-gray-100 flex flex-col gap-2 mt-4">
                    <label className="text-[11px] font-[900] text-black uppercase tracking-widest">
                        {t("m.coupon-code") || "Coupon Code"}
                    </label>
                    {activeCoupons.length > 0 ? (
                        <div className="flex flex-col gap-2">
                            {activeCoupons.map((c) => (
                                <div
                                    key={c.code}
                                    className="flex items-center justify-between bg-[#008a00]/5 border border-[#008a00]/40 rounded px-3 py-2"
                                >
                                    <span className="text-xs font-[900] text-[#008a00] uppercase tracking-wider">
                                        {c.code}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={removeCoupon}
                                        disabled={couponBusy}
                                        className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-[#008a00]/10 text-[#008a00] disabled:opacity-50 cursor-pointer"
                                        aria-label={t("m.remove") || "Remove"}
                                    >
                                        <X size={12} strokeWidth={3} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <form
                            onSubmit={(e) => { e.preventDefault(); applyCoupon(); }}
                            className="flex gap-2 items-stretch h-[44px]"
                        >
                            <input
                                type="text"
                                value={couponInput}
                                onChange={(e) => setCouponInput(e.target.value)}
                                disabled={couponBusy}
                                placeholder={t("m.enter-discount-code") || "Enter discount code"}
                                className="flex-1 min-w-0 px-4 text-sm font-medium text-black bg-white border border-gray-200 rounded focus:border-black focus:outline-none transition-all placeholder:text-black/40 placeholder:font-normal disabled:opacity-60"
                            />
                            <button
                                type="submit"
                                disabled={couponBusy || !couponInput.trim()}
                                className="px-5 bg-black text-white text-xs font-[900] uppercase tracking-wider hover:bg-gray-800 transition-all cursor-pointer rounded flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {couponBusy ? "..." : (t("m.apply") || "Apply")}
                            </button>
                        </form>
                    )}
                </div>

                {/* Checkout Button — text-tracking-padding scaled to summary
                    column width. Allowed to wrap to 2 lines if it still doesn't
                    fit on one line so text is never clipped. */}
                <div className="pt-4">
                    <button
                        onClick={() => router.push(lp("/checkout"))}
                        className="w-full px-2 py-3 xl:py-4 bg-primary text-[11px] xl:text-[10px] font-[900] uppercase tracking-normal xl:tracking-[0.2em] leading-tight hover:bg-black hover:text-white active:scale-[0.98] transition-all duration-300 shadow-md rounded text-center"
                    >
                        {t("cart.proceedCheckout") || "PROCEED TO CHECKOUT"}
                        <span className="hidden xl:inline"> »</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CartSummary;
