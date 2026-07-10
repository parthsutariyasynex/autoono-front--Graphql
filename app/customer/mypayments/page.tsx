"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { redirectToLogin } from "@/utils/helpers";
import { useTranslation } from "@/hooks/useTranslation";
import { PaymentsSkeleton, PaymentsTableSkeleton } from "@/components/skeletons";
import { getClientStoreCode } from "@/lib/api/api-client";
import Price from "@/app/components/Price";
import AccountPaymentModal from "@/components/AccountPaymentModal";
import PaymentDetailModal from "@/components/PaymentDetailModal";
import Pagination from "@/components/Pagination";
import { Search, Download, CreditCard, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import { fetchCustomerInfo } from "@/store/actions/customerActions";
const LocalPaymentsTableSkeleton = ({ rows = 8, safeTranslate, customerCompany, customerCode }: any) => {
    return (
        <>
            {/* Desktop Table Skeleton */}
            <div className="hidden md:block bg-white border border-[#ddd] overflow-hidden shadow-sm rounded-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse table-fixed min-w-[1000px]">
                        <colgroup>
                            <col style={{ width: "10%" }} />
                            <col style={{ width: "10%" }} />
                            <col style={{ width: "9%" }} />
                            <col style={{ width: "10%" }} />
                            <col style={{ width: "10%" }} />
                            <col style={{ width: "16%" }} />
                            <col style={{ width: "10%" }} />
                            <col style={{ width: "10%" }} />
                            <col style={{ width: "15%" }} />
                        </colgroup>
                        <thead>
                            <tr className="bg-primary">
                                <th className="px-4 py-3 font-bold text-black text-center tracking-widest uppercase whitespace-nowrap">{safeTranslate("orderDetails.paymentDate", "Payment Date")}</th>
                                <th className="px-4 py-3 font-bold text-black text-center tracking-widest uppercase whitespace-nowrap">{safeTranslate("orderDetails.paidPayment", "Payment Amount")}</th>
                                <th className="px-4 py-3 font-bold text-black text-center tracking-widest uppercase whitespace-nowrap">{safeTranslate("orderDetails.paymentFor", "Payment For")}</th>
                                <th className="px-4 py-3 font-bold text-black text-center tracking-widest uppercase whitespace-nowrap">{safeTranslate("orderDetails.orderNo", "Order No")}</th>
                                <th className="px-4 py-3 font-bold text-black text-center tracking-widest uppercase whitespace-nowrap">{safeTranslate("orderDetails.sapOrderNo", "SAP Order No")}</th>
                                <th className="px-4 py-3 font-bold text-black text-center tracking-widest uppercase whitespace-nowrap">{safeTranslate("orderDetails.companyName", "Company Name")}</th>
                                <th className="px-4 py-3 font-bold text-black text-center tracking-widest uppercase whitespace-nowrap">{safeTranslate("orderDetails.customerCode", "Customer Code")}</th>
                                <th className="px-4 py-3 font-bold text-black text-center tracking-widest uppercase whitespace-nowrap">{safeTranslate("orderDetails.paymentStatus", "Payment Status")}</th>
                                <th className="px-4 py-3 font-bold text-black text-center tracking-widest uppercase whitespace-nowrap">{safeTranslate("orderDetails.action", "Action")}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#ddd] text-center">
                            {Array.from({ length: rows }).map((_, i) => (
                                <tr key={i} className="hover:bg-primary/5 bg-white transition-colors">
                                    <td className="px-4 py-3 text-black/80 font-medium">
                                        <div className="h-4 bg-gray-200 rounded animate-pulse w-20 mx-auto" />
                                    </td>
                                    <td className="px-4 py-3 text-black/80 font-bold">
                                        <div className="h-4 bg-gray-200 rounded animate-pulse w-16 mx-auto" />
                                    </td>
                                    <td className="px-4 py-3 text-black/80 font-medium">
                                        <div className="h-4 bg-gray-200 rounded animate-pulse w-12 mx-auto" />
                                    </td>
                                    <td className="px-4 py-3 text-black/80 font-medium">
                                        <div className="h-4 bg-gray-200 rounded animate-pulse w-20 mx-auto" />
                                    </td>
                                    <td className="px-4 py-3 text-black/80 font-medium">
                                        <div className="h-4 bg-gray-200 rounded animate-pulse w-20 mx-auto" />
                                    </td>
                                    <td className="px-4 py-3 text-black/80 font-medium text-left">
                                        <div className="h-4 bg-gray-200 rounded animate-pulse w-28" />
                                    </td>
                                    <td className="px-4 py-3 text-black/80 font-medium">
                                        <div className="h-4 bg-gray-200 rounded animate-pulse w-16 mx-auto" />
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="h-5 bg-gray-200 rounded animate-pulse w-20 mx-auto rounded-sm" />
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-12 h-[26px] bg-gray-200 rounded-sm animate-pulse" />
                                            <div className="w-20 h-[26px] bg-gray-200 rounded-sm animate-pulse" />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Card Skeleton */}
            <div className="md:hidden space-y-3">
                {Array.from({ length: Math.min(rows, 3) }).map((_, i) => (
                    <div key={i} className="border border-[#ddd] rounded-sm bg-white p-4 space-y-3 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-black flex items-center gap-1">
                                {safeTranslate("orderDetails.paymentFor", "Payment For")}: <div className="h-3.5 bg-gray-200 rounded animate-pulse w-12" />
                            </span>
                            <div className="h-5 bg-gray-200 rounded animate-pulse w-16 rounded-sm" />
                        </div>
                        <div className="text-xs text-black/80 font-medium space-y-2">
                            <div className="flex items-center gap-1">{safeTranslate("orderDetails.paymentDate", "Payment Date")}: <div className="h-3 bg-gray-200 rounded animate-pulse w-20" /></div>
                            <div className="flex items-center gap-1">{safeTranslate("orderDetails.paidPayment", "Payment Amount")}: <div className="h-3 bg-gray-200 rounded animate-pulse w-16" /></div>
                            <div className="flex items-center gap-1">{safeTranslate("orderDetails.orderNo", "Order No")}: <div className="h-3 bg-gray-200 rounded animate-pulse w-20" /></div>
                            <div className="flex items-center gap-1">{safeTranslate("orderDetails.sapOrderNo", "SAP Order No")}: <div className="h-3 bg-gray-200 rounded animate-pulse w-20" /></div>
                            <div className="flex items-center gap-1">{safeTranslate("orderDetails.companyName", "Company Name")}: <div className="h-3 bg-gray-200 rounded animate-pulse w-32" /></div>
                            <div className="flex items-center gap-1">{safeTranslate("orderDetails.customerCode", "Customer Code")}: <div className="h-3 bg-gray-200 rounded animate-pulse w-16" /></div>
                        </div>
                        <div className="flex gap-2 pt-2 border-t border-gray-100">
                            <div className="h-8 bg-gray-200 rounded-sm flex-1 animate-pulse" />
                            <div className="h-8 bg-gray-200 rounded-sm flex-1 animate-pulse" />
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
};

const LocalPaymentsSkeleton = ({ safeTranslate, customerCompany, customerCode }: any) => {
    return (
        <div className="flex-1 w-full px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-5 bg-surfacePage">
            {/* Header Row */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-5 border-b border-[#ddd] pb-3">
                <h1 className="text-h3 sm:text-h3 md:text-[26px] font-bold text-black uppercase tracking-wide">
                    {safeTranslate("sidebar.myPayment", "MY PAYMENTS")}
                </h1>
                <div className="flex gap-2">
                    <div className="h-10 w-32 bg-gray-200 rounded-sm animate-pulse" />
                    <div className="h-10 w-32 bg-gray-200 rounded-sm animate-pulse" />
                </div>
            </div>

            {/* Filters Bar — matches 6-col grid: Status | Search×2 | DateFrom | DateTo | Buttons */}
            <div className="bg-white border border-[#ddd] p-4 mb-4 rounded-sm shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
                    {/* Status */}
                    <div className="space-y-2">
                        <div className="h-3.5 w-20 bg-gray-200 rounded animate-pulse" />
                        <div className="h-10 w-full bg-gray-200 rounded-sm animate-pulse" />
                    </div>
                    {/* Search (2 cols) */}
                    <div className="space-y-2 lg:col-span-2">
                        <div className="h-3.5 w-32 bg-gray-200 rounded animate-pulse" />
                        <div className="h-10 w-full bg-gray-200 rounded-sm animate-pulse" />
                    </div>
                    {/* Date From */}
                    <div className="space-y-2">
                        <div className="h-3.5 w-16 bg-gray-200 rounded animate-pulse" />
                        <div className="h-10 w-full bg-gray-200 rounded-sm animate-pulse" />
                    </div>
                    {/* Date To */}
                    <div className="space-y-2">
                        <div className="h-3.5 w-16 bg-gray-200 rounded animate-pulse" />
                        <div className="h-10 w-full bg-gray-200 rounded-sm animate-pulse" />
                    </div>
                    {/* Buttons */}
                    <div className="flex gap-2">
                        <div className="h-10 flex-1 bg-gray-300 rounded-sm animate-pulse" />
                        <div className="h-10 flex-1 bg-gray-300 rounded-sm animate-pulse" />
                    </div>
                </div>
            </div>

            {/* Table */}
            <LocalPaymentsTableSkeleton rows={5} safeTranslate={safeTranslate} customerCompany={customerCompany} customerCode={customerCode} />
        </div>
    );
};

export default function MyPaymentsPage() {
    const { data: session, status: authStatus } = useSession();
    const router = useRouter();
    const { t, locale, isRtl } = useTranslation();

    const dispatch = useDispatch<AppDispatch>();
    const token = useSelector((state: RootState) => state.auth.token);
    const { data: customer } = useSelector((state: RootState) => state.customer);

    const getAttr = useCallback((code: string, fallback: string = "N/A") => {
        if (!customer) return fallback;
        if ((customer as any)[code] !== undefined) return (customer as any)[code];
        if ((customer as any).extension_attributes && (customer as any).extension_attributes[code] !== undefined) {
            return (customer as any).extension_attributes[code];
        }
        const attr = (customer as any).custom_attributes?.find(
            (a: any) => a.attribute_code === code
        )?.value;
        return attr ? attr : fallback;
    }, [customer]);

    // Data states
    const [payments, setPayments] = useState<any[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [orders, setOrders] = useState<any[]>([]);

    const ordersMap = useMemo(() => {
        const map: { [key: string]: any } = {};
        orders.forEach((order) => {
            if (order.increment_id) {
                map[order.increment_id] = order;
            }
        });
        return map;
    }, [orders]);

    const customerCompany = useMemo(() => {
        const comp = getAttr("company_name");
        return comp !== "N/A" ? comp : "Klever Tech Solutions - FZE";
    }, [getAttr]);

    const customerCode = useMemo(() => {
        const code = getAttr("customer_code");
        return code !== "N/A" ? code : "KLV765";
    }, [getAttr]);

    const customerFullName = useMemo(() => {
        if (customer && customer.firstname) {
            return `${customer.firstname} ${customer.lastname || ""}`.trim();
        }
        return session?.user?.name || "Customer";
    }, [customer, session]);

    // Loading states
    const [isLoading, setIsLoading] = useState(true);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Filters
    const [filterSearch, setFilterSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("All");
    const [filterDateFrom, setFilterDateFrom] = useState("");
    const [filterDateTo, setFilterDateTo] = useState("");

    // Applied Filters
    const [appliedSearch, setAppliedSearch] = useState("");
    const [appliedStatus, setAppliedStatus] = useState("All");
    const [appliedDateFrom, setAppliedDateFrom] = useState("");
    const [appliedDateTo, setAppliedDateTo] = useState("");

    // Overlay/Modal States
    const [isAccountPaymentOpen, setIsAccountPaymentOpen] = useState(false);
    const [isEditPaymentOpen, setIsEditPaymentOpen] = useState(false);

    // Selected Item States
    const [selectedPayment, setSelectedPayment] = useState<any>(null);

    const safeTranslate = useCallback((key: string, fallback: string) => {
        const translated = t(key);
        return translated !== key ? translated : fallback;
    }, [t]);

    const getStatusTranslation = useCallback((status: string) => {
        if (!status) return "";
        const s = status.toLowerCase();
        if (s === "pending") return t("data.Pending") || "Pending";
        if (s === "hold") return t("data.On Hold") || "Hold";
        if (s === "success") return t("common.success") || "Success";
        if (s === "fail") return t("common.failed") || "Fail";
        if (s === "full paid") return t("data.Full Paid") || "Full Paid";
        if (s === "partial paid") return t("data.Partial Paid") || "Partial Paid";
        
        // fallback
        const capitalized = status.charAt(0).toUpperCase() + status.slice(1);
        const key = `data.${capitalized}`;
        const translated = t(key);
        return translated !== key ? translated : status;
    }, [t]);

    const getStatusBadgeClasses = useCallback((status: string) => {
        const s = (status || "").toLowerCase();
        if (s === "full paid" || s === "success") {
            return "bg-green-50 text-green-700 border-green-200";
        }
        if (s === "fail") {
            return "bg-red-50 text-red-700 border-red-200";
        }
        // pending, hold, partial paid
        return "bg-amber-50 text-amber-700 border-amber-200";
    }, []);

    // Fetch Payments History
    const fetchPayments = useCallback(async () => {
        const token = (session as any)?.accessToken;
        if (!token) return;

        setIsLoading(true);
        try {
            const isDateFilterApplied = !!(appliedDateFrom || appliedDateTo);
            const queryParams = new URLSearchParams({
                pageSize: isDateFilterApplied ? "1000" : String(pageSize),
                currentPage: isDateFilterApplied ? "1" : String(currentPage),
            });

            // If appliedSearch is a numeric string (like an order ID), query it directly from the backend database index.
            const orderIdInt = parseInt(appliedSearch, 10);
            if (appliedSearch && !isNaN(orderIdInt) && /^\d+$/.test(appliedSearch.trim())) {
                queryParams.append("orderId", String(orderIdInt));
            }
            if (appliedStatus && appliedStatus !== "All") {
                queryParams.append("paymentStatus", appliedStatus);
            }
            if (appliedDateFrom) {
                queryParams.append("fromDate", appliedDateFrom);
            }
            if (appliedDateTo) {
                queryParams.append("toDate", appliedDateTo);
            }

            const storeCode = getClientStoreCode();
            const res = await fetch(`/api/kleverapi/payment-history?${queryParams.toString()}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    ...(storeCode ? { "x-store-code": storeCode } : {}),
                },
            });

            if (res.ok) {
                const data = await res.json();
                setPayments(data.items || []);
                setTotalCount(data.total_count || 0);
            } else {
                toast.error(t("orders.fetchFailed") || "Failed to fetch payment history");
            }
        } catch (err) {
            console.error("Error fetching payment history:", err);
        } finally {
            setIsLoading(false);
        }
    }, [session, currentPage, pageSize, appliedSearch, appliedStatus, appliedDateFrom, appliedDateTo, t]);

    // Fetch Recent Orders (to select for new payment)
    const fetchOrders = useCallback(async () => {
        const token = (session as any)?.accessToken;
        if (!token) return;

        try {
            const storeCode = getClientStoreCode();
            const res = await fetch(`/api/kleverapi/my-orders?pageSize=100&currentPage=1`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    ...(storeCode ? { "x-store-code": storeCode } : {}),
                },
            });

            if (res.ok) {
                const data = await res.json();
                setOrders(data.items || []);
            }
        } catch (err) {
            console.error("Error fetching orders:", err);
        }
    }, [session]);

    useEffect(() => {
        if (authStatus === "unauthenticated") {
            redirectToLogin(router);
            return;
        }
        if (authStatus === "authenticated" && token && !customer) {
            dispatch(fetchCustomerInfo());
        }
    }, [authStatus, token, dispatch, router, customer]);

    useEffect(() => {
        if (authStatus === "authenticated") {
            fetchPayments();
            fetchOrders();
        }
    }, [authStatus, fetchPayments, fetchOrders]);

    // Prevent layout shift caused by the scrollbar disappearing when a modal overlay is open.
    // Only active while this page is mounted — cleaned up on unmount.
    useEffect(() => {
        const open = isAccountPaymentOpen || isEditPaymentOpen;
        if (open) {
            const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
            document.body.style.overflow = "hidden";
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        } else {
            document.body.style.overflow = "";
            document.body.style.paddingRight = "";
        }
        return () => {
            document.body.style.overflow = "";
            document.body.style.paddingRight = "";
        };
    }, [isAccountPaymentOpen, isEditPaymentOpen]);

    // Client-side filtering logic for text matching and date ranges
    const filteredPayments = useMemo(() => {
        return payments.filter((payment) => {
            // 1. Text Search Filter
            if (appliedSearch) {
                const searchLower = appliedSearch.toLowerCase().trim();
                const orderDetail = ordersMap[payment.order_increment_id];
                
                const receiptMatch = (payment.receipt_no || "").toLowerCase().includes(searchLower);
                const orderMatch = (payment.order_increment_id || "").toLowerCase().includes(searchLower);
                const methodMatch = (payment.payment_method || "").toLowerCase().includes(searchLower);
                const sapOrderMatch = (payment.sap_invoice_no || orderDetail?.sap_order_number || "").toLowerCase().includes(searchLower);

                const compName = payment.company_name || orderDetail?.company_name || customerCompany;
                const companyMatch = (compName || "").toLowerCase().includes(searchLower);

                if (!receiptMatch && !orderMatch && !methodMatch && !sapOrderMatch && !companyMatch) {
                    return false;
                }
            }

            // Date From filter (client-side — backend does not support fromDate/toDate)
            if (appliedDateFrom) {
                if (!payment.payment_date) return false;
                const pDate = new Date(payment.payment_date);
                const fromDate = new Date(appliedDateFrom);
                pDate.setHours(0, 0, 0, 0);
                fromDate.setHours(0, 0, 0, 0);
                if (pDate < fromDate) return false;
            }

            // Date To filter (client-side)
            if (appliedDateTo) {
                if (!payment.payment_date) return false;
                const pDate = new Date(payment.payment_date);
                const toDate = new Date(appliedDateTo);
                pDate.setHours(0, 0, 0, 0);
                toDate.setHours(0, 0, 0, 0);
                if (pDate > toDate) return false;
            }

            return true;
        });
    }, [payments, appliedSearch, appliedDateFrom, appliedDateTo, ordersMap, customerCompany]);

    const handleEditPayment = async (paymentId: number | string) => {
        const token = (session as any)?.accessToken;
        if (!token) return;

        const toastId = toast.loading(safeTranslate("common.loading", "Fetching details..."));
        try {
            const storeCode = getClientStoreCode();
            const res = await fetch(`/api/kleverapi/payment-history/${paymentId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    ...(storeCode ? { "x-store-code": storeCode } : {}),
                },
            });

            if (res.ok) {
                const data = await res.json();
                setSelectedPayment(data);

                // Dynamically fetch matching order if it's not present in ordersMap
                if (data.order_increment_id && !ordersMap[data.order_increment_id]) {
                    try {
                        const orderRes = await fetch(`/api/kleverapi/my-orders?orderNumber=${data.order_increment_id}`, {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        });
                        if (orderRes.ok) {
                            const orderData = await orderRes.json();
                            if (orderData.items && orderData.items.length > 0) {
                                const foundOrder = orderData.items[0];
                                setOrders((prevOrders) => {
                                    // Avoid duplicates
                                    if (prevOrders.some(o => o.increment_id === foundOrder.increment_id)) {
                                        return prevOrders;
                                    }
                                    return [...prevOrders, foundOrder];
                                });
                            }
                        }
                    } catch (orderErr) {
                        console.error("Error fetching order details for modal:", orderErr);
                    }
                }

                setIsEditPaymentOpen(true);
            } else {
                toast.error(safeTranslate("orderDetails.fetchPaymentFailed", "Failed to fetch payment details"));
            }
        } catch (err) {
            console.error("Error fetching single payment:", err);
        } finally {
            toast.dismiss(toastId);
        }
    };

    const handleDownloadReceipt = async (payment: any) => {
        const token = (session as any)?.accessToken;
        if (!token) {
            toast.error(safeTranslate("orderDetails.loginToDownload", "Please login to download"));
            return;
        }

        const paymentId = payment?.id ?? payment?.payment_id ?? payment?.history_id;
        if (!paymentId) {
            toast.error(safeTranslate("orderDetails.missingPaymentId", "Missing payment ID"));
            return;
        }

        const toastId = toast.loading(safeTranslate("orderDetails.downloadingReceipt", "Downloading receipt..."));

        try {
            const dlStoreCode = getClientStoreCode();
            const res = await fetch(`/api/kleverapi/payment-history/${paymentId}/download`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "x-locale": locale,
                    ...(dlStoreCode ? { "x-store-code": dlStoreCode } : {}),
                },
            });

            if (!res.ok) {
                let errMsg = `Failed to download receipt (${res.status})`;
                try {
                    const errBody = await res.json();
                    if (errBody?.message) errMsg = errBody.message;
                } catch { /* ignored */ }
                throw new Error(errMsg);
            }

            const contentType = res.headers.get("content-type") || "";
            if (!contentType.includes("pdf") && !contentType.includes("octet-stream")) {
                throw new Error("Backend did not return a PDF");
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;

            const disposition = res.headers.get("Content-Disposition");
            let filename = `receipt_${payment.receipt_no || paymentId}.pdf`;
            if (disposition && disposition.includes("filename=")) {
                const match = disposition.match(/filename="?([^";\n]+)"?/);
                if (match && match[1]) {
                    filename = match[1];
                }
            }
            a.download = filename;
            document.body.appendChild(a);
            a.click();

            setTimeout(() => {
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }, 100);

            toast.success(safeTranslate("orderDetails.receiptDownloaded", "Receipt downloaded"), { id: toastId });
        } catch (err: any) {
            toast.error(err.message || "Failed to download receipt", { id: toastId });
        }
    };

    const handleSavePayment = () => {
        // Refresh the list. The Account Payment popup stays open and recomputes its
        // own balance (it closes via its own X button); the edit/detail modal closes.
        setIsEditPaymentOpen(false);
        fetchPayments();
    };

    const handleApplyFilters = () => {
        setAppliedSearch(filterSearch);
        setAppliedStatus(filterStatus);
        setAppliedDateFrom(filterDateFrom);
        setAppliedDateTo(filterDateTo);
        setCurrentPage(1);
    };

    const handleResetFilters = () => {
        setFilterSearch("");
        setFilterStatus("All");
        setFilterDateFrom("");
        setFilterDateTo("");
        setAppliedSearch("");
        setAppliedStatus("All");
        setAppliedDateFrom("");
        setAppliedDateTo("");
        setCurrentPage(1);
    };

    // Server-side CSV export (kleverPaymentHistoryExportCsv)
    const handleExportPayments = async () => {
        const token = (session as any)?.accessToken;
        if (!token) {
            toast.error(safeTranslate("orderDetails.loginToDownload", "Please login to download"));
            return;
        }

        const toastId = toast.loading(safeTranslate("orderDetails.downloadingReceipt", "Exporting..."));
        try {
            const storeCode = getClientStoreCode();
            const exportParams = new URLSearchParams();
            if (appliedStatus && appliedStatus !== "All") exportParams.append("paymentStatus", appliedStatus);
            if (appliedDateFrom) exportParams.append("fromDate", appliedDateFrom);
            if (appliedDateTo) exportParams.append("toDate", appliedDateTo);
            const exportQuery = exportParams.toString();
            const res = await fetch(`/api/kleverapi/payment-history/export${exportQuery ? `?${exportQuery}` : ""}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "x-locale": locale,
                    ...(storeCode ? { "x-store-code": storeCode } : {}),
                },
            });

            if (!res.ok) {
                let errMsg = t("common.noDataFound") || "No data to export";
                try {
                    const errBody = await res.json();
                    if (errBody?.message) errMsg = errBody.message;
                } catch { /* ignored */ }
                throw new Error(errMsg);
            }

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;

            const disposition = res.headers.get("Content-Disposition");
            let filename = `Payment_History_${new Date().getTime()}.csv`;
            if (disposition && disposition.includes("filename=")) {
                const match = disposition.match(/filename="?([^";\n]+)"?/);
                if (match && match[1]) filename = match[1];
            }
            link.setAttribute("download", filename);
            document.body.appendChild(link);
            link.click();

            setTimeout(() => {
                URL.revokeObjectURL(url);
                document.body.removeChild(link);
            }, 100);

            toast.success(safeTranslate("orderDetails.receiptDownloaded", "Exported"), { id: toastId });
        } catch (err: any) {
            toast.error(err.message || "Failed to export payment history", { id: toastId });
        }
    };




    const isDateFilterApplied = !!(appliedDateFrom || appliedDateTo);

    const totalPaymentsCount = useMemo(() => {
        if (isDateFilterApplied) {
            return filteredPayments.length;
        }
        return totalCount;
    }, [filteredPayments.length, totalCount, isDateFilterApplied]);

    const totalPages = useMemo(() => {
        return Math.ceil(totalPaymentsCount / pageSize);
    }, [totalPaymentsCount, pageSize]);

    const displayedPayments = useMemo(() => {
        if (isDateFilterApplied) {
            const start = (currentPage - 1) * pageSize;
            return filteredPayments.slice(start, start + pageSize);
        }
        return filteredPayments;
    }, [filteredPayments, currentPage, pageSize, isDateFilterApplied]);

    // Auth Guard check
    if (authStatus === "unauthenticated") {
        redirectToLogin(router);
        return null;
    }

    if (authStatus === "loading") {
        return (
            <div className="flex flex-col lg:flex-row flex-1 min-h-0 w-full bg-surfacePage">
                <Sidebar />
                <LocalPaymentsSkeleton safeTranslate={safeTranslate} customerCompany={customerCompany} customerCode={customerCode} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white" dir={isRtl ? "rtl" : "ltr"}>
            <div className="flex flex-col lg:flex-row flex-1 min-h-0 w-full">
                {/* Left Sidebar */}
                <Sidebar />

                {/* Right Content */}
                <main className="flex-1 w-full px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-5 bg-surfacePage min-w-0">
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-5 border-b border-[#ddd] pb-3">
                        <h1 className="text-h3 sm:text-h3 md:text-[26px] font-bold text-black uppercase tracking-wide">
                            {t("sidebar.myPayment")}
                        </h1>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsAccountPaymentOpen(true)}
                                className="bg-[#1e73be] hover:bg-[#155a96] text-white px-5 py-2.5 rounded-sm font-bold text-body-sm transition-all active:scale-95 shadow-sm flex items-center gap-2 cursor-pointer"
                            >
                                <CreditCard size={16} />
                                {t("orders.makePayment")}
                            </button>
                            <button
                                onClick={handleExportPayments}
                                className="bg-[#24a148] hover:bg-[#1a7434] text-white px-5 py-2.5 rounded-sm font-bold text-body-sm transition-all active:scale-95 shadow-sm flex items-center gap-2 cursor-pointer"
                            >
                                <Download size={16} />
                                {safeTranslate("exportPaymentHistory", "Export Payment History")}
                            </button>
                        </div>
                    </div>

                    {/* Filters block */}
                    <div className="bg-white p-4 rounded-sm border border-gray-200 mb-6 shadow-sm">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
                            {/* Status */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-black uppercase tracking-wider block">
                                    {safeTranslate("filterByStatus", "Filter By Status")}
                                </label>
                                <div className="relative">
                                    <select
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                        className="w-full h-[40px] px-3 bg-white border border-gray-300 text-xs text-black focus:outline-none focus:border-black rounded-sm transition-colors cursor-pointer appearance-none pr-8"
                                        style={{
                                            backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                                            backgroundPosition: isRtl ? 'left 10px center' : 'right 10px center',
                                            backgroundRepeat: 'no-repeat',
                                            backgroundSize: '14px',
                                        }}
                                    >
                                        <option value="All" className="bg-white text-black font-semibold">{t("m.all") || "All"}</option>
                                        <option value="pending" className="bg-white text-black font-semibold">{getStatusTranslation("pending")}</option>
                                        <option value="hold" className="bg-white text-black font-semibold">{getStatusTranslation("hold")}</option>
                                        <option value="success" className="bg-white text-black font-semibold">{getStatusTranslation("success")}</option>
                                        <option value="fail" className="bg-white text-black font-semibold">{getStatusTranslation("fail")}</option>
                                        <option value="Full Paid" className="bg-white text-black font-semibold">{getStatusTranslation("Full Paid")}</option>
                                        <option value="Partial Paid" className="bg-white text-black font-semibold">{getStatusTranslation("Partial Paid")}</option>
                                    </select>
                                </div>
                            </div>

                            {/* Search/Payment History */}
                            <div className="space-y-1 lg:col-span-2">
                                <label className="text-xs font-bold text-black uppercase tracking-wider block">
                                    {safeTranslate("filterByPaymentHistory", "Filter By Payment History")}
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={filterSearch}
                                        onChange={(e) => setFilterSearch(e.target.value)}
                                        placeholder={safeTranslate("filterByPaymentHistoryPlaceholder", "Order no, company name, SAP order no...")}
                                        className="w-full h-[40px] px-3 bg-white border border-gray-300 text-xs text-black focus:outline-none focus:border-black rounded-sm transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Date From */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-black uppercase tracking-wider block">
                                    {safeTranslate("m.date-from", "Date From")}
                                </label>
                                <input
                                    type="date"
                                    value={filterDateFrom}
                                    onChange={(e) => setFilterDateFrom(e.target.value)}
                                    className="w-full h-[40px] px-3 bg-white border border-gray-300 text-xs text-black focus:outline-none focus:border-black rounded-sm transition-colors cursor-pointer"
                                />
                            </div>

                            {/* Date To */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-black uppercase tracking-wider block">
                                    {safeTranslate("m.date-to", "Date To")}
                                </label>
                                <input
                                    type="date"
                                    value={filterDateTo}
                                    onChange={(e) => setFilterDateTo(e.target.value)}
                                    className="w-full h-[40px] px-3 bg-white border border-gray-300 text-xs text-black focus:outline-none focus:border-black rounded-sm transition-colors cursor-pointer"
                                />
                            </div>

                            {/* Search & Reset Buttons */}
                            <div className="flex gap-2">
                                <button
                                    onClick={handleApplyFilters}
                                    className="h-[40px] flex-1 bg-black hover:bg-gray-800 text-white text-xs font-bold uppercase tracking-widest transition-colors rounded-sm shadow-sm cursor-pointer"
                                >
                                    {safeTranslate("m.search", "SEARCH")}
                                </button>
                                <button
                                    onClick={handleResetFilters}
                                    className="h-[40px] flex-1 bg-black hover:bg-gray-800 text-white text-xs font-bold uppercase tracking-widest transition-colors rounded-sm shadow-sm border border-black cursor-pointer"
                                >
                                    {safeTranslate("m.reset", "RESET")}
                                </button>
                            </div>
                        </div>
                    </div>

                    {isLoading ? (
                        <LocalPaymentsTableSkeleton rows={pageSize} safeTranslate={safeTranslate} customerCompany={customerCompany} customerCode={customerCode} />
                    ) : filteredPayments.length === 0 ? (
                        <div className="bg-white border border-[#ddd] p-10 text-center rounded-sm shadow-sm">
                            <FileText size={48} className="mx-auto text-black/20 mb-4" />
                            <p className="text-body font-bold text-black/60">{safeTranslate("orders.noRecords", "No payment records found.")}</p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block bg-white border border-[#ddd] overflow-hidden shadow-sm rounded-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs border-collapse table-fixed min-w-[1000px]">
                                        <colgroup>
                                            <col style={{ width: "10%" }} />
                                            <col style={{ width: "10%" }} />
                                            <col style={{ width: "9%" }} />
                                            <col style={{ width: "10%" }} />
                                            <col style={{ width: "10%" }} />
                                            <col style={{ width: "16%" }} />
                                            <col style={{ width: "10%" }} />
                                            <col style={{ width: "10%" }} />
                                            <col style={{ width: "15%" }} />
                                        </colgroup>
                                        <thead>
                                            <tr className="bg-primary">
                                                <th className="px-4 py-3 font-bold text-black text-center tracking-widest uppercase whitespace-nowrap">{safeTranslate("orderDetails.paymentDate", "Payment Date")}</th>
                                                <th className="px-4 py-3 font-bold text-black text-center tracking-widest uppercase whitespace-nowrap">{safeTranslate("orderDetails.paidPayment", "Payment Amount")}</th>
                                                <th className="px-4 py-3 font-bold text-black text-center tracking-widest uppercase whitespace-nowrap">{safeTranslate("orderDetails.paymentFor", "Payment For")}</th>
                                                <th className="px-4 py-3 font-bold text-black text-center tracking-widest uppercase whitespace-nowrap">{safeTranslate("orderDetails.orderNo", "Order No")}</th>
                                                <th className="px-4 py-3 font-bold text-black text-center tracking-widest uppercase whitespace-nowrap">{safeTranslate("orderDetails.sapOrderNo", "SAP Order No")}</th>
                                                <th className="px-4 py-3 font-bold text-black text-center tracking-widest uppercase whitespace-nowrap">{safeTranslate("orderDetails.companyName", "Company Name")}</th>
                                                <th className="px-4 py-3 font-bold text-black text-center tracking-widest uppercase whitespace-nowrap">{safeTranslate("orderDetails.customerCode", "Customer Code")}</th>
                                                <th className="px-4 py-3 font-bold text-black text-center tracking-widest uppercase whitespace-nowrap">{safeTranslate("orderDetails.paymentStatus", "Payment Status")}</th>
                                                <th className="px-4 py-3 font-bold text-black text-center tracking-widest uppercase whitespace-nowrap">{safeTranslate("orderDetails.action", "Action")}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#ddd] text-center">
                                            {displayedPayments.map((payment: any, index: number) => {
                                                const orderDetail = ordersMap[payment.order_increment_id];
                                                return (
                                                    <tr key={payment.id || index} className="hover:bg-primary/5 bg-white transition-colors">
                                                        <td className="px-4 py-3 text-black/80 font-medium">
                                                            {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString("en-GB").replace(/\//g, "-") : "-"}
                                                        </td>
                                                        <td className="px-4 py-3 text-black/80 font-bold">
                                                            <Price amount={payment.paid_payment} />
                                                        </td>
                                                        <td className="px-4 py-3 text-black/80 font-medium">
                                                            {(payment.payment_for ? payment.payment_for === "account" : !payment.order_increment_id) ? (t("account") !== "account" ? t("account") : "Account") : (t("order") !== "order" ? t("order") : "Order")}
                                                        </td>
                                                        <td className="px-4 py-3 text-black/80 font-medium">{payment.order_increment_id || "-"}</td>
                                                        <td className="px-4 py-3 text-black/80 font-medium">{payment.sap_invoice_no || orderDetail?.sap_order_number || "-"}</td>
                                                        <td className="px-4 py-3 text-black/80 font-medium text-left" title={payment.company_name || orderDetail?.company_name || customerCompany}>
                                                            {payment.company_name || orderDetail?.company_name || customerCompany}
                                                        </td>
                                                        <td className="px-4 py-3 text-black/80 font-medium">{payment.customer_code || orderDetail?.company_code || customerCode}</td>
                                                        <td className="px-4 py-3">
                                                            <span className={`inline-flex px-3 py-1 rounded-sm text-[10px] font-bold uppercase tracking-tight border ${getStatusBadgeClasses(payment.payment_status)}`}>
                                                                {getStatusTranslation(payment.payment_status)}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button
                                                                    onClick={() => handleEditPayment(payment.id)}
                                                                    className="px-3 py-1.5 rounded-sm font-bold text-[10px] uppercase tracking-wide transition-colors shadow-sm bg-[#1e73be] hover:bg-[#155a96] text-white cursor-pointer"
                                                                >
                                                                    {safeTranslate("common.view", "View")}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDownloadReceipt(payment)}
                                                                    className="bg-[#24a148] hover:bg-[#1a7434] text-white px-3 py-1.5 rounded-sm font-bold text-[10px] uppercase tracking-wide transition-colors shadow-sm cursor-pointer"
                                                                >
                                                                    {safeTranslate("orderDetails.download", "Download")}
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Mobile Cards View */}
                            <div className="md:hidden space-y-3">
                                {displayedPayments.map((payment: any, index: number) => {
                                    const orderDetail = ordersMap[payment.order_increment_id];
                                    return (
                                        <div key={payment.id || index} className="border border-[#ddd] rounded-sm bg-white p-4 space-y-3 shadow-sm">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-black">
                                                    {safeTranslate("orderDetails.paymentFor", "Payment For")}: {(payment.payment_for ? payment.payment_for === "account" : !payment.order_increment_id) ? (t("account") !== "account" ? t("account") : "Account") : (t("order") !== "order" ? t("order") : "Order")}
                                                </span>
                                                <span className={`inline-flex px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-tight border ${getStatusBadgeClasses(payment.payment_status)}`}>
                                                    {getStatusTranslation(payment.payment_status)}
                                                </span>
                                            </div>
                                            <div className="text-xs text-black/80 font-medium space-y-1">
                                                <div>{safeTranslate("orderDetails.paymentDate", "Payment Date")}: {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString("en-GB").replace(/\//g, "-") : "-"}</div>
                                                <div>{safeTranslate("orderDetails.paidPayment", "Payment Amount")}: <Price amount={payment.paid_payment} /></div>
                                                <div>{safeTranslate("orderDetails.orderNo", "Order No")}: {payment.order_increment_id || "-"}</div>
                                                <div>{safeTranslate("orderDetails.sapOrderNo", "SAP Order No")}: {payment.sap_invoice_no || orderDetail?.sap_order_number || "-"}</div>
                                                <div>{safeTranslate("orderDetails.companyName", "Company Name")}: {payment.company_name || orderDetail?.company_name || customerCompany}</div>
                                                <div>{safeTranslate("orderDetails.customerCode", "Customer Code")}: {payment.customer_code || orderDetail?.company_code || customerCode}</div>
                                            </div>
                                            <div className="flex gap-2 pt-2 border-t border-gray-100">
                                                <button
                                                    onClick={() => handleEditPayment(payment.id)}
                                                    className="flex-1 py-2 rounded-sm font-bold text-center text-[10px] uppercase tracking-wide transition-colors shadow-sm bg-[#1e73be] hover:bg-[#155a96] text-white cursor-pointer"
                                                >
                                                    {safeTranslate("common.view", "View")}
                                                </button>
                                                <button
                                                    onClick={() => handleDownloadReceipt(payment)}
                                                    className="flex-1 bg-[#24a148] hover:bg-[#1a7434] text-white py-2 rounded-sm font-bold text-center text-[10px] uppercase tracking-wide transition-colors shadow-sm cursor-pointer"
                                                >
                                                    {safeTranslate("orderDetails.download", "Download")}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Pagination */}
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={totalPaymentsCount}
                                pageSize={pageSize}
                                onPageChange={setCurrentPage}
                                onPageSizeChange={setPageSize}
                            />
                        </>
                    )}
                </main>
            </div>

            {/* Account Payment Modal (header "Make Payment" — account-level payment) */}
            <AccountPaymentModal
                isOpen={isAccountPaymentOpen}
                onClose={() => setIsAccountPaymentOpen(false)}
                customerName={`${session?.user?.name || "Customer"}`}
                onSave={handleSavePayment}
            />

            {/* Payment Detail Modal Overlay */}
            {selectedPayment && (
                <PaymentDetailModal
                    isOpen={isEditPaymentOpen}
                    onClose={() => setIsEditPaymentOpen(false)}
                    payment={selectedPayment}
                    order={ordersMap[selectedPayment.order_increment_id] || {
                        id: selectedPayment.order_id,
                        entity_id: selectedPayment.order_id,
                        increment_id: selectedPayment.order_increment_id,
                        grand_total: selectedPayment.invoice_amount || 0,
                        grandTotal: selectedPayment.invoice_amount || 0,
                        customerCode: selectedPayment.customer_code || customerCode || "N/A",
                        receivable_payment: selectedPayment.due_payment || 0
                    }}
                    customerName={customerFullName}
                    customerCode={customerCode}
                    customerCompany={customerCompany}
                />
            )}
        </div>
    );
}
