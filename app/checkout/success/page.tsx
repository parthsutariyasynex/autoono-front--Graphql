"use client";
import { useTranslation } from "@/hooks/useTranslation";
import { useLocalePath } from "@/hooks/useLocalePath";

import React, { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCheckout } from "@/modules/checkout/hooks/useCheckout";
import { CheckoutSuccessSkeleton } from "@/components/skeletons";
import Price from "@/components/Price";

const CheckoutSuccessPage = () => {
    return (
        <Suspense fallback={<CheckoutSuccessSkeleton />}>
            <CheckoutSuccessContent />
        </Suspense>
    );
};

const CheckoutSuccessContent = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { t } = useTranslation();
    const lp = useLocalePath();
    const orderId = searchParams.get("order_id");
    const { fetchCheckoutSuccess } = useCheckout({ skipInitialFetch: true });
    // Initialize state lazily from localStorage to avoid calling setters inside useEffect
    // Don't read localStorage in the useState initializer — that runs on the
    // server with `typeof window === undefined` (so null) but the client picks
    // up the saved data, causing a hydration mismatch. Read it post-mount in
    // a useEffect instead so both server + client render the same initial UI
    // (the CheckoutSuccessSkeleton).
    const [orderData, setOrderData] = useState<any>(null);
    const [isPending, setIsPending] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!orderId || typeof window === "undefined") return;
        try {
            const savedData = localStorage.getItem('last_order_summary');
            if (!savedData) return;
            const parsed = JSON.parse(savedData);
            if (String(parsed.order_id) === String(orderId)) {
                setOrderData(parsed);
                setIsPending(parsed.status === "pending");
            }
        } catch (e) {
            console.error("Error parsing saved order data", e);
        }
    }, [orderId]);

    // 1. Redirect if orderId is missing
    useEffect(() => {
        if (!orderId) {
            router.push(lp("/"));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderId]);

    // 2. Live Polling: Poll the backend API directly to retrieve the actual confirmed order details
    useEffect(() => {
        if (!orderId) return;

        let pollCount = 0;
        const maxPolls = 15; // Poll up to 15 times (30 seconds total)
        let pollIntervalId: any = null;

        const checkOrderDetails = async () => {
            try {
                const data = await fetchCheckoutSuccess(orderId);
                const itemsList = data?.items || data?.order_items || data?.order?.items || data?.order?.order_items || [];

                if (itemsList.length > 0) {
                    setOrderData(data);
                    setIsPending(false);
                    setIsLoading(false);
                    localStorage.removeItem('last_order_summary');
                    if (pollIntervalId) clearInterval(pollIntervalId);
                    return true;
                } else if (data?.status && data.status !== "pending") {
                    setOrderData(data);
                    setIsPending(false);
                    setIsLoading(false);
                    localStorage.removeItem('last_order_summary');
                    if (pollIntervalId) clearInterval(pollIntervalId);
                    return true;
                }
            } catch (error) {
                console.error("Error checking order details:", error);
            }
            return false;
        };

        // Run the first check immediately
        checkOrderDetails().then((success) => {
            if (success) return;

            // If still pending or items are not loaded, show pending card state and start polling backend
            setIsPending(true);
            setIsLoading(false);

            pollIntervalId = setInterval(async () => {
                pollCount++;
                const success = await checkOrderDetails();
                if (success || pollCount >= maxPolls) {
                    clearInterval(pollIntervalId);
                    setIsLoading(false);
                    setIsPending(false);
                }
            }, 2000);
        });

        return () => {
            if (pollIntervalId) clearInterval(pollIntervalId);
        };
    }, [orderId, fetchCheckoutSuccess]);

    if (isLoading && !orderData) {
        return <CheckoutSuccessSkeleton />;
    }

    const items = orderData?.items || orderData?.order_items || orderData?.order?.items || orderData?.order?.order_items || [];
    const subtotal = orderData?.subtotal || orderData?.order?.subtotal || 0;
    const taxAmount = orderData?.tax_amount || orderData?.order?.tax_amount || 0;
    const grandTotal = orderData?.grand_total || orderData?.order?.grand_total || 0;
    const totalQty = orderData?.total_item_count || orderData?.order?.total_item_count || items.reduce((acc: number, item: any) => acc + Math.round(item.qty_ordered || item.qty || 0), 0);

    return (
        <div className="bg-surfacePage min-h-screen font-sans py-8 sm:py-12 md:py-16">
            <main className="max-w-4xl mx-auto px-4">
                {/* Confirmation Box */}
                <div className="bg-white rounded-md border border-gray-200 shadow-sm p-6 sm:p-8 md:p-10 mb-8 text-center space-y-4 sm:space-y-6">
                    <h5 className="text-xl sm:text-xl md:text-3xl lg:text-xl font-bold text-black uppercase tracking-tight leading-tight">
                        {t("checkoutSuccess.thankYou")}
                    </h5>

                    <div className="space-y-2">
                        <p className="text-body-lg sm:text-h3-sm md:text-[18px] text-black">
                            {t("checkoutSuccess.orderNumber")}{" "}
                            <span className="font-bold">{orderData?.order_increment_id || orderData?.increment_id || "..."}</span>.
                        </p>
                        <p className="text-body sm:text-body-lg md:text-h3-sm text-black/80 font-medium max-w-lg mx-auto leading-relaxed">
                            {t("checkoutSuccess.orderConfirmation")}
                        </p>
                    </div>
                </div>


                <div className="text-center pt-2">
                    <Link
                        href={lp("/products")}
                        className="inline-block w-full sm:w-auto px-12 py-3.5 bg-primary text-black text-body font-bold uppercase tracking-wider hover:bg-black hover:text-white transition-all shadow-sm rounded-sm"
                    >
                        {t("checkoutSuccess.continueShopping")}
                    </Link>
                </div>
            </main>
        </div>
    );
};

export default CheckoutSuccessPage;
