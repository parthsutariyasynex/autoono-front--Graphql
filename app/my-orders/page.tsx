"use client";
import { useTranslation } from "@/hooks/useTranslation";
import { useLocalePath } from "@/hooks/useLocalePath";

import React, { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { redirectToLogin } from "@/utils/helpers";
import Price from "@/app/components/Price";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Filters from "@/components/Filters";
import OrdersTable, { Order } from "@/components/OrdersTable";
import Pagination from "@/components/Pagination";
import { useCart } from "@/modules/cart/context/CartContext";
import { toast } from "react-hot-toast";
import MakePaymentModal from "@/components/MakePaymentModal";
import { MyOrdersSkeleton, OrdersTableSkeleton, SidebarSkeleton } from "@/components/skeletons";
import { getClientStoreCode } from "@/lib/api/api-client";

function formatOrderDate(dateStr: string): string {
    if (!dateStr) return "";
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return new Intl.DateTimeFormat("en-US", {
            year: "2-digit", month: "numeric", day: "numeric"
        }).format(d);
    } catch {
        return dateStr;
    }
}

function formatOrderStatus(status: string): string {
    if (!status) return "";
    if (status === "approval_pending") return "Check Pending";
    return status.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
}

function mapOrder(item: any, paidByOrderId?: Map<string, number>): Order {
    const id = item.increment_id || "";
    const sapOrderNumber = item.sap_order_number || "";
    const date = formatOrderDate(item.created_at);
    const grandTotal = item.grand_total;

    let orderedBy = item.ordered_by || "";
    if (!orderedBy && item.billing_address) {
        orderedBy = `${item.billing_address.firstname || ""} ${item.billing_address.lastname || ""}`.trim();
    }
    if (!orderedBy && (item.customer_firstname || item.customer_lastname)) {
        orderedBy = `${item.customer_firstname || ""} ${item.customer_lastname || ""}`.trim();
    }

    const status = formatOrderStatus(item.status || "");
    const status_lower = (item.status || "").toLowerCase();
    const payment_status_lower = String(item.payment_status || "").toLowerCase().trim();

    const grandTotalNum = Number(item.grand_total ?? 0);

    // Look up the sum of payments recorded against this order from the payment-history map.
    // The orders list endpoint doesn't expose payment progress, so we cross-reference here.
    const orderIdKey = String(item.order_id ?? item.entity_id ?? item.increment_id ?? "");
    const paidFromHistory = paidByOrderId?.get(orderIdKey) ?? 0;

    const is_paid =
        // Explicit boolean flags from the order record
        item.is_paid === true ||
        item.is_paid === 1 ||
        item.is_paid === "1" ||
        // Status-based (works for stores where status flips to complete/closed when paid)
        status_lower === "complete" ||
        status_lower === "closed" ||
        // payment_status text variations
        ["paid", "full paid", "fully paid", "complete", "completed"].includes(payment_status_lower) ||
        // Derived from payment-history: total recorded payments cover the grand total
        (grandTotalNum > 0 && paidFromHistory >= grandTotalNum);

    return {
        id,
        sapOrderNumber,
        date,
        grandTotal,
        orderedBy,
        status,
        increment_id: item.increment_id || "",
        entity_id: (item.entity_id || item.order_id || item.increment_id || "").toString(),
        is_paid,
    };
}

export default function MyOrdersPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col w-full bg-surfacePage">
                <div className="flex flex-col lg:flex-row flex-1 w-full">
                    <SidebarSkeleton />
                    <MyOrdersSkeleton rows={8} />
                </div>
            </div>
        }>
            <MyOrdersPageContent />
        </Suspense>
    );
}

function getActiveToken(session: any): string | null {
    if (typeof window !== "undefined" && localStorage.getItem("isSubAccount") === "true") {
        const sub = localStorage.getItem("subAccountToken");
        if (sub) return sub;
    }
    return session?.accessToken ?? null;
}

function MyOrdersPageContent() {
    const { data: session, status: authStatus } = useSession();
    const router = useRouter();
    const { t } = useTranslation();
    const lp = useLocalePath();
    const searchParams = useSearchParams();
    const { refetchCart } = useCart();

    const [orders, setOrders] = useState<Order[]>([]);
    const [allOrdersForCounts, setAllOrdersForCounts] = useState<any[]>([]);
    const [totalItems, setTotalItems] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);

    // Filter states - derived from URL
    const searchInput = searchParams.get("orderNumber") || "All";
    const statusInput = searchParams.get("status") || "All";
    const companyInput = searchParams.get("companyCode") || "All";
    const currentPage = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);

    // Local states for inputs to handle debounce
    const [localSearch, setLocalSearch] = useState(searchInput);
    const [localStatus, setLocalStatus] = useState(statusInput);

    // Sync local state when URL changes
    useEffect(() => {
        setLocalSearch(searchInput);
        setLocalStatus(statusInput);
    }, [searchInput, statusInput]);

    useEffect(() => {
        if (authStatus === "unauthenticated") {
            redirectToLogin(router);
        }
    }, [authStatus, router]);

    // Calculate counts dynamically from all orders
    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = { "All": allOrdersForCounts.length };
        allOrdersForCounts.forEach(order => {
            const rawStatus = order.status || "";
            // Normalize status to match what's in the filter options (usually lowercase or specific code)
            const s = rawStatus.toLowerCase();
            counts[s] = (counts[s] || 0) + 1;

            // Also handle human-readable status codes if they differ
            if (rawStatus === "approval_pending") counts["approval_pending"] = (counts["approval_pending"] || 0) + 1;
        });
        return counts;
    }, [allOrdersForCounts]);

    const fetchAllOrdersForCounts = useCallback(async () => {
        const token = getActiveToken(session);
        if (!token) return;
        try {
            // Fetch a large enough page size to get all orders for counts
            const storeCode = getClientStoreCode();
            const res = await fetch(`/api/kleverapi/my-orders?pageSize=1000&currentPage=1`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "x-locale": typeof window !== "undefined" && window.location.pathname.startsWith("/ar") ? "ar" : "en",
                    ...(storeCode ? { "x-store-code": storeCode } : {}),
                },
            });
            const data = await res.json();
            if (res.ok) {
                setAllOrdersForCounts(data.items || []);
            }
        } catch (err) {
            console.error("Failed to fetch all orders for counts", err);
        }
    }, [session]);

    const fetchOrders = useCallback(async (search: string, status: string, page: number, size: number, company: string) => {
        const token = getActiveToken(session);
        if (!token) return;

        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                pageSize: size.toString(),
                currentPage: page.toString(),
            });
            if (status !== "All") {
                params.append("status", status);
            }
            if (search && search !== "All") {
                params.append("orderNumber", search);
            }
            if (company && company !== "All") params.append("companyCode", company);

            const storeCode = getClientStoreCode();
            const headers = {
                Authorization: `Bearer ${token}`,
                "x-locale": window.location.pathname.startsWith("/ar") ? "ar" : "en",
                ...(storeCode ? { "x-store-code": storeCode } : {}),
            };

            // Fetch orders + payment history in parallel.
            // The orders list doesn't include payment progress, so we cross-reference
            // with /payment-history to determine which orders are fully paid.
            const [ordersRes, historyRes] = await Promise.all([
                fetch(`/api/kleverapi/my-orders?${params.toString()}`, { headers, cache: "no-store" }),
                fetch(`/api/kleverapi/payment-history`, { headers, cache: "no-store" }),
            ]);

            const data = await ordersRes.json();
            if (!ordersRes.ok) throw new Error(data.message || t("orders.fetchFailed"));

            // Build a map of order_id (or increment_id) → total paid amount.
            // Defensive against unknown response shape and field names.
            const paidByOrderId = new Map<string, number>();
            if (historyRes.ok) {
                const historyData = await historyRes.json();
                const records: any[] = Array.isArray(historyData)
                    ? historyData
                    : (Array.isArray(historyData?.items) ? historyData.items
                        : Array.isArray(historyData?.payments) ? historyData.payments
                            : Array.isArray(historyData?.data) ? historyData.data : []);
                for (const rec of records) {
                    const oid = String(
                        rec.order_id ?? rec.orderId ?? rec.entity_id ?? rec.increment_id ?? ""
                    );
                    if (!oid) continue;
                    const amt = Number(
                        rec.paid_payment ?? rec.paid_amount ?? rec.amount ?? rec.payment_amount ?? 0
                    );
                    if (!Number.isFinite(amt)) continue;
                    paidByOrderId.set(oid, (paidByOrderId.get(oid) ?? 0) + amt);
                }
                if (typeof window !== "undefined") {
                    console.log("[payment-history] aggregated paid by order:", Object.fromEntries(paidByOrderId));
                }
            } else if (typeof window !== "undefined") {
                console.warn("[payment-history] fetch failed, status:", historyRes.status);
            }

            const items: any[] = data.items || [];
            setOrders(items.map((it) => mapOrder(it, paidByOrderId)));
            setTotalItems(data.total_count || items.length);
        } catch (err: any) {
            setError(err.message || t("orders.exportFailed"));
        } finally {
            setIsLoading(false);
            setHasFetched(true);
        }
    }, [session]);

    // Initial fetch
    useEffect(() => {
        if (authStatus === "authenticated") {
            fetchOrders(searchInput, statusInput, currentPage, pageSize, companyInput);
            fetchAllOrdersForCounts();
        }
    }, [authStatus, fetchOrders, fetchAllOrdersForCounts, searchInput, statusInput, currentPage, pageSize, companyInput]);

    // Update URL helper
    const updateURLParams = useCallback((newSearch: string, newStatus: string, newPage: number, newSize: number = pageSize, newCompany: string = companyInput) => {
        const params = new URLSearchParams(searchParams.toString());

        // Handle Toast if no data for selected status
        if (newStatus !== "All" && (statusCounts[newStatus.toLowerCase()] === 0 || statusCounts[newStatus] === 0)) {
            toast.error(t("orders.noOrdersForStatus"));
        }

        if (newSearch && newSearch !== "All") params.set("orderNumber", newSearch);
        else params.delete("orderNumber");

        if (newStatus && newStatus !== "All") params.set("status", newStatus);
        else params.delete("status");

        if (newCompany && newCompany !== "All") params.set("companyCode", newCompany);
        else params.delete("companyCode");

        if (newPage > 1) params.set("page", newPage.toString());
        else params.delete("page");

        if (newSize !== 10) params.set("pageSize", newSize.toString());
        else params.delete("pageSize");

        router.push(lp(`/my-orders?${params.toString()}`));
    }, [router, searchParams, statusCounts, pageSize, companyInput]);

    // Auto search with debounce
    useEffect(() => {
        if (localSearch === searchInput && localStatus === statusInput) return;

        const timer = setTimeout(() => {
            updateURLParams(localSearch, localStatus, 1, pageSize, companyInput);
        }, 500);

        return () => clearTimeout(timer);
    }, [localSearch, localStatus, updateURLParams, searchInput, statusInput, pageSize, companyInput]);

    const handleSearchClick = () => {
        updateURLParams(localSearch, localStatus, 1, pageSize, companyInput);
    };

    const handleResetClick = () => {
        toast.dismiss();
        setLocalSearch("All");
        setLocalStatus("All");
        router.push(lp("/my-orders"));
    };

    const handlePageChange = (page: number) => {
        updateURLParams(localSearch, localStatus, page, pageSize, companyInput);
    };

    const handlePageSizeChange = (size: number) => {
        updateURLParams(localSearch, localStatus, 1, size, companyInput);
    };

    const handleViewOrder = (entityId: string) => {
        router.push(lp(`/my-orders/${entityId}`));
    };

    const handleMakePayment = (order: Order) => {
        setSelectedOrderForPayment(order);
        setIsPaymentModalOpen(true);
    };

    const handleReorder = async (order: Order) => {
        const token = getActiveToken(session);
        if (!token) {
            toast.error(t("orders.mustLoggedIn"));
            return;
        }

        const toastId = toast.loading(t("m.add-to-cart"));
        try {
            const res = await fetch(`/api/kleverapi/order/${order.entity_id}/reorder`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || t("orders.reorderFailed"));

            await refetchCart();
            toast.success(t("orders.addedToCart"), { id: toastId });
            router.push(lp("/cart"));
        } catch (err: any) {
            toast.error(err.message || t("orders.exportFailed"), { id: toastId });
        }
    };

    const handleExportOrders = async () => {
        const token = getActiveToken(session);
        if (!token) {
            toast.error(t("orders.mustLoggedInExport"));
            return;
        }

        setIsExporting(true);
        const toastId = toast.loading(t("orders.exporting"));

        try {
            const response = await fetch("/api/kleverapi/orders/export", {
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || t("orders.exportFailed"));

            const base64Content = data.pdf_base64 || data.content || data.base64 || data.csv_base64;
            if (!base64Content) throw new Error("No file content received from server");

            const byteCharacters = atob(base64Content);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: "text/csv" });

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = url;
            a.download = data.filename || `Orders_Export_${new Date().getTime()}.csv`;
            document.body.appendChild(a);
            a.click();

            setTimeout(() => {
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }, 100);

            toast.success(t("orders.exportSuccess"), { id: toastId });
        } catch (err: any) {
            console.error("Export Error:", err);
            toast.error(err.message || t("orders.exportFailed"), { id: toastId });
        } finally {
            setIsExporting(false);
        }
    };

    const totalPages = Math.ceil(totalItems / pageSize);
    const isFiltered = !!(localSearch !== "All" || localStatus !== "All" || searchParams.get("orderNumber") || searchParams.get("status"));
    const isInitializing = !hasFetched;
    const isEmpty = hasFetched && !isLoading && orders.length === 0;

    if (authStatus === "loading") return (
        <div className="flex flex-col w-full bg-surfacePage">
            <div className="flex flex-col lg:flex-row flex-1 w-full">
                <Sidebar />
                <MyOrdersSkeleton rows={8} />
            </div>
        </div>
    );

    return (
        <div className="flex flex-col w-full bg-surfacePage">
            <div className="flex flex-col lg:flex-row flex-1 w-full">
                <Sidebar />

                <main className="flex-1 w-full px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-5">
                    {/* Page header — title + decorative gradient line + Export button.
                          Mobile  : stacks (title with gradient line beneath, then full-width button)
                          sm/md/+ : title and button on same row, gradient line fills the gap */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-5">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            <h1 className="text-h3 md:text-[26px] font-bold text-black uppercase tracking-wide whitespace-nowrap">
                                {t("orders.title")}
                            </h1>
                        </div>
                        {!isInitializing && !isEmpty && (
                            <button
                                onClick={handleExportOrders}
                                disabled={isExporting}
                                className={`w-full sm:w-auto flex-shrink-0 justify-center flex items-center gap-2 border-2 border-primary text-black text-body-sm font-bold px-5 py-2 uppercase tracking-wide hover:text-white rounded-sm hover:bg-primary transition-colors ${isExporting ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {isExporting ? (
                                    <span className="animate-pulse opacity-60">{t("orders.exporting")}</span>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        {t("orders.exportOrders")}
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    {!isInitializing && !isEmpty && (
                        <Filters
                            status={localStatus}
                            search={localSearch}
                            onStatusChange={setLocalStatus}
                            onSearchChange={setLocalSearch}
                            onApplySearch={handleSearchClick}
                            onReset={handleResetClick}
                            isFiltered={isFiltered}
                            statusCounts={statusCounts}
                        />
                    )}

                    {/* Standard Magento Check: If totalCount=0 and searched, show nothing or reset.
                        But here we just show no orders.
                    */}
                    {/* {!isLoading && !hasFetched && orders.length === 0 && (
                        <div className="text-black/60 py-10 md:py-20 text-center animate-pulse">
                            {t("orders.initializingDashboard")}
                        </div>
                    )} */}

                    {isInitializing ? (
                        <OrdersTableSkeleton rows={8} />
                    ) : isEmpty ? (
                        <div className="p-3 md:p-5 bg-white border border-[#ddd] rounded-sm shadow-sm">
                            <div className="mb-4">
                                <button
                                    onClick={handleResetClick}
                                    className="px-4 py-1.5 bg-surfaceSoft border border-gray-300 text-body text-black hover:bg-gray-200 transition-colors rounded-[2px]"
                                >
                                    {t("orders.reset")}
                                </button>
                            </div>
                            <div className="flex items-center gap-3 bg-warningBgPale border border-warningBgSoft p-4 rounded-md text-warningBadge">
                                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <span className="text-body-lg font-medium">{t("orders.noOrders")}</span>
                            </div>
                        </div>
                    ) : (
                        <div className={`transition-opacity duration-200 ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                            <OrdersTable
                                orders={orders}
                                onViewOrder={handleViewOrder}
                                onReorder={handleReorder}
                                onMakePayment={handleMakePayment}
                            />
                            {totalItems > 0 && (
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    totalItems={totalItems}
                                    pageSize={pageSize}
                                    onPageChange={handlePageChange}
                                    onPageSizeChange={handlePageSizeChange}
                                />
                            )}
                        </div>
                    )}

                    <MakePaymentModal
                        isOpen={isPaymentModalOpen}
                        onClose={() => setIsPaymentModalOpen(false)}
                        order={selectedOrderForPayment}
                        customerName={session?.user?.name || "Nikhil Patel"}
                        onSave={() => {
                            // Optimistic update: flip the just-paid order to is_paid=true
                            // so "Make Payment" hides immediately. Then refetch to get
                            // the canonical state from the backend.
                            const justPaidId = selectedOrderForPayment?.entity_id;
                            if (justPaidId) {
                                setOrders((prev) =>
                                    prev.map((o) =>
                                        o.entity_id === justPaidId ? { ...o, is_paid: true } : o
                                    )
                                );
                            }
                            fetchOrders(searchInput, statusInput, currentPage, pageSize, companyInput);
                            fetchAllOrdersForCounts();
                        }}
                    />
                </main>
            </div>
        </div>
    );
}
