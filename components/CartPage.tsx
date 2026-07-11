"use client";

import React from "react";
import CartItem from "./CartItem";
import CartSummary from "./CartSummary";
import CartActions from "./CartActions";
import Navbar from "@/components/Navbar";
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
import { useAction } from "@/hooks/useAction";
import { useCanOrder } from "@/hooks/useCanOrder";
import AddToCartOverlay from "@/components/AddToCartOverlay";

const CartPage: React.FC = () => {
    const router = useRouter();
    const { t } = useTranslation();
    const lp = useLocalePath();
    const { openGiftModal, availableGifts, hasGifts, isAllGiftsSelected, fetchDiscountPopup } = useGift();
    const { cart, isLoading, isCartSyncing, error, removeFromCart, updateCartItem, clearCart, refetchCart } = useCart();
    const [pendingQtys, setPendingQtys] = React.useState<Record<number, number>>({});
    const [overlayMsg, setOverlayMsg] = React.useState<string | null>(null);
    const { loading: isClearingCart, run: runClearCart } = useAction("clear-cart");
    const { loading: isUpdatingCart, run: runUpdateCart } = useAction("update-cart");
    const { canOrder, orderPermLoading } = useCanOrder();

    // Redirect users without ordering permission to the home page
    React.useEffect(() => {
        if (!orderPermLoading && !canOrder) {
            router.replace(lp("/"));
        }
    }, [canOrder, orderPermLoading, router, lp]);

    // Always fetch fresh cart data when the cart page mounts
    React.useEffect(() => {
        refetchCart();
    }, []);


    const handleUpdateQty = (id: number, qty: number) => {
        setPendingQtys(prev => ({ ...prev, [id]: qty }));
    };

    const handleRemove = async (id: number) => {
        setOverlayMsg("Removing Item...");
        try {
            await removeFromCart(id);
            if (pendingQtys[id]) {
                const newPending = { ...pendingQtys };
                delete newPending[id];
                setPendingQtys(newPending);
            }
            fetchDiscountPopup();
            toast.success(t("cart.itemRemoved"));
        } catch (err) {
            toast.error(t("cart.itemRemovalFailed"));
        } finally {
            setOverlayMsg(null);
        }
    };

    const handleUpdateCart = async () => {
        setOverlayMsg("Updating Cart...");
        const updateIds = Object.keys(pendingQtys);
        if (updateIds.length === 0) {
            await refetchCart();
            fetchDiscountPopup();
            toast.success(t("cart.updated") || "Cart updated");
            setOverlayMsg(null);
            return;
        }

        await runUpdateCart(async () => {
            const toastId = toast.loading(t("cart.updating"));
            try {
                for (const id of updateIds) {
                    await updateCartItem(Number(id), pendingQtys[Number(id)]);
                }
                setPendingQtys({});
                await refetchCart();
                await fetchDiscountPopup();
                toast.success(t("cart.updated") || "Cart updated", { id: toastId });
            } catch (err: any) {
                const msg = err instanceof Error ? err.message : t("cart.updateFailed");
                toast.error(msg, { id: toastId });
                refetchCart();
            }
        });
        setOverlayMsg(null);
    };


    const handleClearCart = async () => {
        setOverlayMsg("Clearing Cart...");
        const toastId = toast.loading(t("cart.clearing") || "Clearing cart...");
        await runClearCart(async () => {
            try {
                await clearCart();
                toast.success(t("cart.cartCleared") || "Cart cleared", { id: toastId });
            } catch (err: any) {
                const msg = err instanceof Error ? err.message : t("cart.clearFailed");
                toast.error(msg, { id: toastId });
            }
        });
        setOverlayMsg(null);
    };

    // Show skeleton while loading, syncing (warehouse switch in progress), or before
    // the first fetch resolves. Without the isCartSyncing guard, switching warehouses
    // can cause a brief "empty cart" flash because refetchCart() runs concurrently
    // with the sync and may fetch the cart before items are restored to the backend.
    if (isLoading || isCartSyncing || cart === null) {
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
        <>
        <AddToCartOverlay isProcessing={overlayMsg !== null} message={overlayMsg || ""} />
        <div className={`min-auto bg-surfaceOverlay pb-4 lg:pb-10${overlayMsg ? " blur-sm pointer-events-none select-none" : ""}`}>
            {/* Main Content Container */}
            <div className="w-full px-3 lg:px-12 pt-4 md:pt-8">

                {/* Breadcrumbs & Title Section */}
                <div className="mb-4 md:mb-8 text-center">
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
                            className={`rounded-sm w-full mb-3 w-max transition-all duration-200 py-3 px-6 flex items-center justify-center gap-3 cursor-pointer ${hasGifts
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

                {/* Items + Summary side-by-side from lg+ only. Below lg (mobile +
                    tablet) they stack so the item rows get full width and use the
                    roomy card layout instead of a cramped desktop table row. */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 xl:gap-8 items-start">

                    {/* Left Column (Items & Actions) */}
                    <div className="lg:col-span-8 xl:col-span-9 flex flex-col min-w-0">

                        <div className="flex flex-col h-full">
                            {/* Table Header (Sticky Top) — lg+ only; it aligns with the
                                desktop row layout, which also kicks in at lg+. */}
                            <div className="hidden lg:flex sticky top-0 z-20 bg-white border border-[#ddd] rounded-sm items-center py-4 px-5 mb-4">
                                <div className="w-[45%] text-label font-bold text-black uppercase tracking-widest">{t("cart.itemDescription")}</div>
                                <div className="w-[15%] text-label font-bold text-black uppercase tracking-widest text-center">{t("cart.price")}</div>
                                <div className="w-[20%] text-label font-bold text-black uppercase tracking-widest text-center">{t("cart.qty")}</div>
                                <div className="w-[20%] text-label font-bold text-black uppercase tracking-widest ltr:text-right rtl:text-left">{t("cart.total")}</div>
                            </div>

                            {/* Scrollable Items Container */}
                            <div className="flex-1 custom-scrollbar space-y-2 pb-4">
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
                            <div className="mt-0">
                                <div className="space-y-4">
                                    <CartActions
                                        itemsCount={cart.items_count}
                                        onClearCart={handleClearCart}
                                        onUpdateCart={handleUpdateCart}
                                        isClearingCart={isClearingCart}
                                        isUpdatingCart={isUpdatingCart}
                                    />

                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column (Summary): col-span-4 from md+, narrower at xl */}
                    <div className="lg:col-span-4 xl:col-span-3 z-10 w-full">
                        <CartSummary
                            subtotal={cart.subtotal}
                            taxAmount={cart.tax_amount}
                            taxLabel={cart.tax_label}
                            shippingAmount={cart.shipping_amount ?? 0}
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
        </>
    );
};

export default CartPage;
