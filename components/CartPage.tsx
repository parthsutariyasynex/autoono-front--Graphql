"use client";

import React from "react";
import CartItem from "./CartItem";
import CartSummary from "./CartSummary";
import CartActions from "./CartActions";
import Navbar from "@/app/components/Navbar";
import Link from "next/link";
import { ArrowRight, ShoppingBag, Gift, Pencil, CheckCircle2 } from "lucide-react";
import { useCart } from "@/modules/cart/hooks/useCart";
import { useCheckout } from "@/modules/checkout/hooks/useCheckout";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { useLocalePath } from "@/hooks/useLocalePath";
import { useGift } from "@/modules/cart/context/GiftContext";
import { CartPageSkeleton } from "@/components/skeletons";

const CartPage: React.FC = () => {
    const router = useRouter();
    const { t } = useTranslation();
    const lp = useLocalePath();
    const { openGiftModal, availableGifts, hasGifts, isAllGiftsSelected } = useGift();
    const { cart, isLoading, error, removeFromCart, updateCartItem, clearCart, refetchCart } = useCart();
    const [pendingQtys, setPendingQtys] = React.useState<Record<number, number>>({});
    const [isClearingCart, setIsClearingCart] = React.useState(false);

    // Always fetch fresh cart data when the cart page mounts
    React.useEffect(() => {
        refetchCart();
    }, []);


    const handleUpdateQty = (id: number, qty: number) => {
        setPendingQtys(prev => ({ ...prev, [id]: qty }));
    };

    const handleRemove = async (id: number) => {
        try {
            await removeFromCart(id);
            // Clear pending update for this item if any
            if (pendingQtys[id]) {
                const newPending = { ...pendingQtys };
                delete newPending[id];
                setPendingQtys(newPending);
            }
            toast.success(t("cart.itemRemoved"));
        } catch (err) {
            toast.error(t("cart.itemRemovalFailed"));
        }
    };

    const handleUpdateCart = async () => {
        const updateIds = Object.keys(pendingQtys);
        if (updateIds.length === 0) {
            await refetchCart();
            toast.success(t("cart.updated") || "Cart updated");
            return;
        }

        const toastId = toast.loading(t("cart.updating"));
        try {
            // Process all qty changes sequentially to avoid cart lock issues
            for (const id of updateIds) {
                await updateCartItem(Number(id), pendingQtys[Number(id)]);
            }
            setPendingQtys({});
            // Single refetch at the end to get accurate totals from server
            await refetchCart();
            toast.success(t("cart.updated") || "Cart updated", { id: toastId });
        } catch (err: any) {
            const msg = err instanceof Error ? err.message : t("cart.updateFailed");
            toast.error(msg, { id: toastId });
            // Refetch even on error so UI shows the real server state
            refetchCart();
        }
    };


    const handleClearCart = async () => {
        // if (!window.confirm(t("cart.confirmClear") || "Clear all items from your cart?")) return;
        const toastId = toast.loading(t("cart.clearing") || "Clearing cart...");
        setIsClearingCart(true);
        try {
            await clearCart();
            toast.success(t("cart.cartCleared") || "Cart cleared", { id: toastId });
        } catch (err: any) {
            const msg = err instanceof Error ? err.message : t("cart.clearFailed");
            toast.error(msg, { id: toastId });
        } finally {
            setIsClearingCart(false);
        }
    };

    // Show skeleton while loading OR before the first fetch resolves (cart === null).
    // Without the `cart === null` guard, the initial mount falls through to the
    // `!hasItems` branch and flashes the "empty cart" UI for one frame before
    // useEffect triggers the fetch and flips isLoading to true.
    if (isLoading || cart === null) {
        return <CartPageSkeleton items={3} />;
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
                <h2 className="text-xl font-bold text-red-600 mb-2">{t("checkout.error")}</h2>
                <p className="text-black/60 mb-6">{error}</p>
                <button onClick={refetchCart} className="bg-black text-white px-6 py-2 rounded font-bold">{t("common.tryAgain")}</button>
            </div>
        );
    }

    const hasItems = cart && cart.items && cart.items.length > 0;

    if (!hasItems) {
        return (
            <div className="bg-white min-h-screen">
                <div className="w-full py-12 md:py-24 px-4 md:px-6 text-center">
                    <ShoppingBag size={64} className="mx-auto text-black/30 mb-6" />
                    <h1 className="text-xl md:text-2xl font-bold text-black uppercase tracking-widest mb-4">
                        {t("cart.noItems")}
                    </h1>
                    <Link href={lp("/products")} className="inline-flex items-center gap-2 text-primary font-bold hover:underline">
                        {t("cart.goToProducts")}
                        <ArrowRight size={16} />
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surfaceOverlay pb-4 lg:pb-10">
            {/* Main Content Container */}
            <div className="w-full px-4 md:px-12 pt-8 md:pt-14">

                {/* Breadcrumbs & Title Section */}
                <div className="mb-10 md:mb-14 text-center">
                    <h1 className="text-xl md:text-2xl font-bold text-black uppercase tracking-tight mb-2">
                        {t("cart.title")}
                    </h1>
                    <div className="h-1 w-12 bg-primary mx-auto"></div>
                </div>

                {/* Free Gift Banner — always visible when gifts are available */}
                {availableGifts.length > 0 && (() => {
                    const selectedGiftNames = cart?.items
                        ?.filter(item => availableGifts.some(g => g.sku === item.sku))
                        .map(item => availableGifts.find(g => g.sku === item.sku)?.name)
                        .filter(Boolean) || [];

                    const messagePrefix = selectedGiftNames.length > 0
                        ? (selectedGiftNames.length > 1
                            ? t("cart.freeGiftAddedMany").replace("{0}", selectedGiftNames.join(", "))
                            : t("cart.freeGiftAddedOne").replace("{0}", selectedGiftNames[0] || ""))
                        : t("cart.freeGiftAdded");

                    return (
                        <button
                            onClick={openGiftModal}
                            className={`w-full mb-8 active:scale-[0.99] transition-all duration-200 py-3.5 px-6 flex items-center justify-center gap-3 cursor-pointer ${hasGifts
                                ? "bg-white border-2 border-[#008a00] hover:bg-green-50"
                                : "bg-[#008a00] hover:bg-[#006e00]"
                                }`}
                        >
                            {hasGifts ? (
                                <>
                                    <Gift size={18} className="text-[#008a00]" />
                                    <span className="text-[#008a00] font-bold text-[15px] tracking-wide">
                                        {messagePrefix} {" "}
                                        {/* <span className="underline decoration-dashed underline-offset-4 font-bold">
                                            <span className="hidden sm:inline">Free Gifts</span>
                                        </span> */}
                                    </span>
                                    {/* <Pencil size={14} className="text-[#008a00]" /> */}
                                </>
                            ) : (
                                <>
                                    <Gift size={18} className="text-white" />
                                    <span className="text-white font-bold text-[15px] tracking-wide">
                                        {t("cart.selectYourFreeGift")}
                                    </span>
                                </>
                            )}
                        </button>
                    );
                })()}

                {/* Items + Summary side-by-side from md+ (tablet portrait) so the
                    summary doesn't stretch full-width below the items list at
                    800px and similar tablet sizes. */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 xl:gap-16 items-start">

                    {/* Left Column (Items & Actions) */}
                    <div className="md:col-span-8 xl:col-span-9 flex flex-col min-w-0">

                        <div className="flex flex-col h-full">
                            {/* Table Header (Sticky Top) — md+ so tablet-portrait users
                                also see the column labels. */}
                            <div className="hidden md:flex sticky top-0 z-20 bg-white border border-gray-100 rounded-xl items-center py-4 px-10 mb-4 shadow-sm">
                                <div className="w-[45%] text-caption font-bold text-black uppercase tracking-widest">{t("cart.itemDescription")}</div>
                                <div className="w-[15%] text-caption font-bold text-black uppercase tracking-widest text-center">{t("cart.price")}</div>
                                <div className="w-[20%] text-caption font-bold text-black uppercase tracking-widest text-center">{t("cart.qty")}</div>
                                <div className="w-[20%] text-caption font-bold text-black uppercase tracking-widest text-right">{t("cart.total")}</div>
                            </div>

                            {/* Scrollable Items Container */}
                            <div className="flex-1 custom-scrollbar pr-2 space-y-4 pb-4">
                                {cart.items.map((item) => (
                                    <CartItem
                                        key={item.item_id}
                                        item={item}
                                        currencyCode={cart.currency_code}
                                        onUpdateQty={handleUpdateQty}
                                        onRemove={handleRemove}
                                    />
                                ))}
                            </div>

                            {/* Actions Bar */}
                            <div className="mt-6">
                                <div className="space-y-4">
                                    <CartActions
                                        itemsCount={cart.items_count}
                                        onClearCart={handleClearCart}
                                        onUpdateCart={handleUpdateCart}
                                        isClearingCart={isClearingCart}
                                    />

                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column (Summary): col-span-4 from md+, narrower at xl */}
                    <div className="md:col-span-4 xl:col-span-3 z-10 w-full">
                        <CartSummary
                            subtotal={cart.subtotal}
                            taxAmount={cart.tax_amount}
                            taxLabel={cart.tax_label}
                            grandTotal={cart.grand_total}
                            currencyCode={cart.currency_code}
                            discountAmount={cart.discount_amount}
                            appliedCoupons={cart.applied_coupons}
                        />
                    </div>
                </div>
            </div>


            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f9fafb;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e5e7eb;
                    border-radius: 10px;
                    border: 2px solid #f9fafb;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #d1d5db;
                }
            `}</style>
        </div>
    );
};

export default CartPage;
