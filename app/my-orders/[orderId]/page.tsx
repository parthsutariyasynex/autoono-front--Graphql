"use client";
import { useTranslation } from "@/hooks/useTranslation";
import { useLocalePath } from "@/hooks/useLocalePath";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { redirectToLogin } from "@/utils/helpers";
import Price from "@/components/Price";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { toast } from "react-hot-toast";
import { useCart } from "@/modules/cart/context/CartContext";
import MakePaymentModal from "@/components/MakePaymentModal";
import { OrderDetailSkeleton } from "@/components/skeletons";
import EditPaymentModal from "@/components/EditPaymentModal";
import { useCanOrder } from "@/hooks/useCanOrder";

export default function OrderDetailsPage() {
    const { data: session, status: authStatus } = useSession();
    const router = useRouter();
    const { t, locale } = useTranslation("orderDetails");
    const { canOrder } = useCanOrder();

    const safeTranslate = (key: string, fallback: string) => {
        // Translation files store flat keys like "orderDetails.productName".
        // Try the prefixed form first, then a bare key, then fall back to English.
        const prefixed = `orderDetails.${key}`;
        const prefixedVal = t(prefixed);
        if (prefixedVal && prefixedVal !== prefixed) return prefixedVal;
        const val = t(key);
        if (val && val !== key) return val;
        return fallback;
    };

    const lp = useLocalePath();
    const { orderId } = useParams();
    const { refetchCart } = useCart();

    const [order, setOrder] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [attachments, setAttachments] = useState<any[]>([]);
    const [isAttachmentsLoading, setIsAttachmentsLoading] = useState(false);
    const [attachmentsError, setAttachmentsError] = useState<string | null>(null);
    const [isPrinting, setIsPrinting] = useState(false);
    const [openingAttachmentId, setOpeningAttachmentId] = useState<string | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<any>(null);

    const [paymentHistory, setPaymentHistory] = useState<any[]>([]);

    const totalPaid = useMemo(() => {
        return paymentHistory.reduce((sum: number, p: any) => {
            const amount = parseFloat(p.paid_payment || p.paidAmount || "0");
            return sum + (isNaN(amount) ? 0 : amount);
        }, 0);
    }, [paymentHistory]);

    const dueAmount = useMemo(() => {
        const total = order?.grand_total || order?.grandTotal || 0;
        if (!total) return 0;
        return Math.max(0, total - totalPaid);
    }, [order, totalPaid]);

    const isPaid = useMemo(() => {
        if (!order) return false;
        // Check API flags
        const statusStr = (order.status || "").toLowerCase();
        const payStatusStr = (order.payment_status || "").toLowerCase();
        const isPaidFlag = order.is_paid === true || order.is_paid === 1 || order.is_paid === "1" || order.is_paid === "true";

        return statusStr === 'complete' ||
            isPaidFlag ||
            payStatusStr === 'paid' ||
            payStatusStr === 'full paid' ||
            dueAmount <= 0.05; // Precision threshold
    }, [order, dueAmount]);

    const handleSavePayment = () => {
        fetchPaymentHistory();
        // Also refresh order details to update status/paid flags
        fetchOrderDetails();
    };

    const handleDownloadReceipt = async (payment: any) => {
        const token = (session as any)?.accessToken;
        if (!token) {
            toast.error(t("loginToDownload"));
            return;
        }

        const paymentId = payment?.id ?? payment?.payment_id ?? payment?.history_id;
        if (!paymentId) {
            toast.error(t("missingPaymentId"));
            return;
        }

        const toastId = toast.loading(safeTranslate("downloadingReceipt", "Downloading receipt..."));

        try {
            // Hits the Next.js proxy at /api/kleverapi/payment-history/[id]/download
            // which forwards to: https://<magento>/rest/{locale}/V1/kleverapi/payment-history/{id}/download
            // x-locale is sent so the PDF comes back in the user's current language.
            const response = await fetch(`/api/kleverapi/payment-history/${paymentId}/download`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "x-locale": locale,
                },
            });

            if (!response.ok) {
                // Backend returned JSON error instead of PDF — surface its message
                let errMsg = `Failed to download receipt (${response.status})`;
                try {
                    const errBody = await response.json();
                    if (errBody?.message) errMsg = errBody.message;
                } catch { /* response wasn't JSON */ }
                throw new Error(errMsg);
            }

            const contentType = response.headers.get("content-type") || "";
            if (!contentType.includes("pdf") && !contentType.includes("octet-stream")) {
                // Got something other than a PDF — likely a JSON error masquerading as 200
                const text = await response.text();
                throw new Error(text.slice(0, 200) || "Backend did not return a PDF");
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;

            // Try to extract filename from Content-Disposition header
            const disposition = response.headers.get("Content-Disposition");
            let filename = `receipt_${payment.receipt_no || payment.invoice_no || paymentId}.pdf`;
            if (disposition && disposition.includes("filename=")) {
                const filenameMatch = disposition.match(/filename="?([^";\n]+)"?/);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1];
                }
            }

            link.setAttribute("download", filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success(safeTranslate("receiptDownloaded", "Receipt downloaded"), { id: toastId });
        } catch (error: any) {
            toast.error(error.message || t("orderDetails.downloadFailed"), { id: toastId });
        }
    };

    // Auth Guard
    useEffect(() => {
        if (authStatus === "unauthenticated") {
            redirectToLogin(router);
        }
    }, [authStatus, router]);

    // API Call
    const fetchOrderDetails = useCallback(async () => {
        const token = (session as any)?.accessToken;
        if (!token || !orderId) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/kleverapi/order/${orderId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "x-locale": locale,
                },
            });


            if (!response.ok) {
                throw new Error("Failed to fetch order details");
            }

            const data = await response.json();
            setOrder(data);
            // Fetch history after order details are loaded to ensure we have context
            fetchPaymentHistory();
        } catch (err: any) {
            setError(err.message || "Something went wrong while fetching order details");
        } finally {
            setIsLoading(false);
        }
    }, [session, orderId, locale]);

    const fetchPaymentHistory = useCallback(async () => {
        const token = (session as any)?.accessToken;
        if (!token || !orderId) return;

        try {
            const response = await fetch(`/api/kleverapi/payment-history?orderId=${orderId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "x-locale": locale,
                },
            });

            if (response.ok) {
                const data = await response.json();
                // Map the API data to our table structure if needed
                // Assuming data is an array of payment objects
                if (Array.isArray(data) && data.length > 0) {
                    setPaymentHistory(data);
                } else if (data && typeof data === 'object') {
                    const items = data.items || data.data || [];
                    if (items.length > 0) {
                        setPaymentHistory(items);
                    }
                }
            }
        } catch (err) {
            console.error("Failed to fetch payment history:", err);
        }
    }, [session, orderId, locale]);

    const fetchSinglePayment = useCallback(async (paymentId: number | string) => {
        const token = (session as any)?.accessToken;
        if (!token) return;

        try {
            const response = await fetch(`/api/kleverapi/payment-history/${paymentId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "x-locale": locale,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setSelectedPayment(data);
                setIsEditModalOpen(true);
            } else {
                toast.error(t("fetchPaymentFailed"));
            }
        } catch (err) {
            console.error("Error fetching single payment:", err);
        }
    }, [session, locale]);

    const fetchAttachments = useCallback(async () => {
        const token = (session as any)?.accessToken;
        if (!token || !orderId) return;

        setIsAttachmentsLoading(true);
        setAttachmentsError(null);

        try {
            const response = await fetch(`/api/kleverapi/order/${orderId}/attachments`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "x-locale": locale,
                },
            });


            const data = await response.json();

            if (!response.ok) {
                // If it's 404, we might just want to show "No attachments available" instead of an error message
                if (response.status === 404) {
                    setAttachments([]);
                    return;
                }
                throw new Error(data.message || "Failed to fetch order attachments");
            }

            const attachmentsList = Array.isArray(data)
                ? data
                : (data?.attachments || data?.items || []);

            setAttachments(attachmentsList);
        } catch (err: any) {
            console.error("Attachment Fetch Error:", err);
            setAttachmentsError(err.message || "Something went wrong while fetching order attachments");
        } finally {
            setIsAttachmentsLoading(false);
        }
    }, [session, orderId]);

    useEffect(() => {
        if (authStatus === "authenticated") {
            fetchOrderDetails();
        }
    }, [authStatus, fetchOrderDetails]);

    useEffect(() => {
        if (order) {
            fetchAttachments();
        }
    }, [order, fetchAttachments]);

    const handlePrintOrder = async () => {
        const token = (session as any)?.accessToken;
        if (!token || !orderId) {
            toast.error(t("sessionNotFound"));
            return;
        }

        setIsPrinting(true);
        const toastId = toast.loading(t("preparingPdf"));

        try {
            const response = await fetch(`/api/kleverapi/order/${orderId}/pdf`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "x-locale": locale,
                },
            });


            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || "Failed to fetch order PDF");
            }

            const data = await response.json();

            // Handle base64 from response - checking common field names
            const base64Content = data.pdf_base64 || data.content || data.base64;
            const fileName = data.filename || `Order_${order?.increment_id || orderId}.pdf`;

            if (!base64Content) {
                throw new Error("No PDF content received from server.");
            }

            // Convert base64 → Blob
            const byteCharacters = atob(base64Content);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: "application/pdf" });

            // Use URL.createObjectURL
            const url = window.URL.createObjectURL(blob);

            // Trigger download with <a> tag
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", fileName);
            document.body.appendChild(link);
            link.click();

            // Cleanup
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            toast.success(t("pdfDownloaded"), { id: toastId });
        } catch (err: any) {
            console.error("Print Error:", err);
            toast.error(err.message || t("printError"), { id: toastId });
        } finally {
            setIsPrinting(false);
        }
    };

    const [isCancelling, setIsCancelling] = useState(false);

    const handleCancelOrder = async () => {
        const token = (session as any)?.accessToken;
        if (!token) {
            toast.error(t("loginToCancel"));
            return;
        }
        if (!confirm(t("orderDetails.confirmCancel") !== "orderDetails.confirmCancel"
            ? t("orderDetails.confirmCancel")
            : "Are you sure you want to cancel this order?")) {
            return;
        }

        setIsCancelling(true);
        const toastId = toast.loading(t("cancelling"));
        try {
            const targetOrderId = order?.entity_id || orderId;
            const res = await fetch(`/api/kleverapi/order/${targetOrderId}/cancel`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "x-locale": locale,
                },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to cancel order");

            toast.success(t("orderCancelled"), { id: toastId });
            // Reflect the new status locally so the UI updates immediately
            setOrder((prev: any) => prev ? { ...prev, status: "canceled" } : prev);
        } catch (err: any) {
            toast.error(err.message || t("somethingWrong"), { id: toastId });
        } finally {
            setIsCancelling(false);
        }
    };

    const handleReorder = async () => {
        const token = (session as any)?.accessToken;
        if (!token) {
            toast.error(t("loginToReorder"));
            return;
        }

        const toastId = toast.loading(t("addingToCart"));
        try {
            // Use entity_id for reorder if available, otherwise orderId from params
            const targetOrderId = order?.entity_id || orderId;
            const res = await fetch(`/api/kleverapi/order/${targetOrderId}/reorder`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "x-locale": locale
                },
            });


            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to reorder");

            await refetchCart();
            toast.success(t("itemsAddedToCart"), { id: toastId });
            router.push(lp("/cart"));
        } catch (err: any) {
            toast.error(err.message || t("somethingWrong"), { id: toastId });
        }
    };

    const handleOpenAttachment = async (attachment: any) => {
        const token = (session as any)?.accessToken;
        if (!token) {
            toast.error(t("attachmentFailed"));
            return;
        }

        const attachmentId = attachment.attachment_id || attachment.id;
        setOpeningAttachmentId(attachmentId);

        try {
            const fileUrl = attachment.file_url || "";
            const proxyUrl = `/api/kleverapi/order-attachments/file/${attachmentId}?url=${encodeURIComponent(fileUrl)}`;

            const response = await fetch(proxyUrl, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "x-locale": locale
                },
            });


            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || `Failed to fetch file (${response.status})`);
            }

            const contentType = response.headers.get("content-type") || "application/octet-stream";
            const blob = await response.blob();

            if (blob.size === 0) {
                throw new Error("File is empty");
            }

            const blobUrl = URL.createObjectURL(new Blob([blob], { type: contentType }));
            const link = document.createElement("a");
            link.href = blobUrl;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err: any) {
            console.error("Attachment open error:", err);
            toast.error(err.message || t("attachmentFailed"));
        } finally {
            setOpeningAttachmentId(null);
        }
    };

    // Helpers
    const formatStatus = (status: string) => {
        if (!status) return "";
        const key = `data.${status}`;
        const translated = t(key);
        return translated !== key ? translated : status;
    };


    const formatDate = (dateString: string) => {
        if (!dateString) return ;
        const dateObj = new Date(dateString);
        return dateObj.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const translateDynamic = (val: string) => {
        if (!val) return "";
        // Try direct key first
        let translated = t(val);
        if (translated !== val) return translated;

        // Try with data. prefix
        const dataKey = `data.${val}`;
        translated = t(dataKey);
        if (translated !== dataKey) return translated;

        return val;
    };




    const formatCurrency = (amount: number | string | undefined | null) => {
        return <Price amount={amount} />;
    };

    if (authStatus === "loading" || (isLoading && !order)) {
        return (
            <div className="min-h-screen flex flex-col w-full bg-surfacePage">
                <div className="flex flex-col lg:flex-row flex-1 w-full">
                    <Sidebar />
                    <main className="px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-5 w-full">
                        <OrderDetailSkeleton />
                    </main>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col w-full bg-surfacePage">
                <div className="flex flex-col lg:flex-row flex-1 w-full">
                    <Sidebar />
                    <main className="flex-1 w-full px-4 md:px-6 lg:px-8 py-10">
                        <div className="bg-red-50 border border-red-100 text-red-600 p-4 md:p-8 rounded-lg text-center shadow-sm">
                            <p className="font-bold text-body-lg uppercase tracking-widest mb-2">{t("orderDetails.errorLoading")}</p>

                            <p className="text-xs">{error}</p>
                            <button
                                onClick={fetchOrderDetails}
                                className="mt-6 px-6 md:px-8 py-2.5 bg-red-600 text-white rounded-md font-bold text-caption uppercase tracking-widest hover:bg-red-700 transition-all active:scale-95 w-full sm:w-auto"
                            >
                                {t("orderDetails.tryAgain")}

                            </button>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    if (!order) return null;

    const shippingAddress = order.extension_attributes?.shipping_assignments?.[0]?.shipping?.address || order.shipping_address;
    const billingAddress = order.billing_address;
    const paymentMethod = order.payment?.additional_information?.[0] || order.payment?.method || "N/A";

    return (
        <div className="min-h-screen flex flex-col w-full bg-surfacePage">
            <div className="flex flex-col lg:flex-row flex-1 w-full">
                {/* Left Sidebar */}
                <Sidebar />

                {/* Right Content */}
                <main className="flex-1 w-full px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-5 min-w-0 text-xs">
                    {/* Header Section */}
                    <div className="flex flex-col mb-3.5 no-print">
                        <div className="flex flex-col border-b border-[#ddd] pb-3">
                            
                            <div className="flex items-center gap-3 md:gap-5 mb-1.5 flex-wrap">
                                <h1 className="text-h3 md:text-h1-sm font-[700] text-black uppercase tracking-tight leading-none">
                                    {safeTranslate("orderHash", "ORDER #")} {order.increment_id}
                                </h1>

                                <span className={`inline-flex px-4 py-1.5 border rounded-sm text-caption md:text-label font-bold uppercase tracking-widest bg-white ${order.status?.toLowerCase().includes('pending') ? 'border-borderSoft text-black' :
                                    order.status?.toLowerCase().includes('complete') ? 'border-green-300 text-green-700 bg-green-50' :
                                        order.status?.toLowerCase().includes('cancel') ? 'border-red-300 text-red-700 bg-red-50' :
                                            'border-gray-300 text-black/80 bg-white'
                                    }`}>
                                    {formatStatus(order.status)}
                                </span>
                            </div>

                            <div className="text-black text-[15px] md:text-[17px] font-normal leading-none">
                                {formatDate(order.created_at)}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-start items-stretch sm:items-center gap-3 w-full mt-3">
                            {canOrder && (
                            <button
                                onClick={handleReorder}
                                className="bg-primary hover:bg-primary text-black font-bold py-2.5 px-6 rounded-sm text-body-sm uppercase tracking-widest transition-all shadow-sm border border-primary w-full sm:w-auto"
                            >
                                {safeTranslate("reorder", "REORDER")}

                            </button>
                            )}

                            {/* Make Payment — only when the order is not yet paid */}
                            {/* {!isPaid && (
                                <button
                                    onClick={() => setIsPaymentModalOpen(true)}
                                    className="bg-primary hover:bg-primaryHover text-white font-bold py-2.5 px-6 rounded-sm text-label uppercase tracking-widest transition-all shadow-sm border border-primary w-full sm:w-auto"
                                >
                                    {t("orders.makePayment")}
                                </button>
                            )} */}

                            {/* Cancel Order — replaces the old "View Payment" slot.
                                Only visible while the order is in a cancellable status. */}
                            {(() => {
                                const s = String(order?.status || "").toLowerCase();
                                const cancellable = ["pending", "processing", "approval_pending", "holded"].includes(s);
                                if (!cancellable) return null;
                                return (
                                    <button
                                        onClick={handleCancelOrder}
                                        disabled={isCancelling}
                                        className={`bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-6 rounded-sm text-body-sm uppercase tracking-widest transition-all shadow-sm border border-red-600 flex items-center justify-center gap-2 no-print w-full sm:w-auto ${isCancelling ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={isCancelling ? "opacity-40" : ""}>
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                        {safeTranslate("cancelOrder", "Cancel Order")}
                                    </button>
                                );
                            })()}
                            <button
                                onClick={handlePrintOrder}
                                disabled={isPrinting}
                                className={`bg-white hover:bg-gray-50 text-black font-bold py-2.5 px-6 rounded-sm text-body-sm uppercase tracking-widest transition-all border border-[#ddd] shadow-sm flex items-center justify-center gap-2 no-print w-full sm:w-auto ${isPrinting ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={isPrinting ? "opacity-40" : ""}>
                                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                                    <rect x="6" y="14" width="12" height="8"></rect>
                                </svg>
                                {isPrinting ? safeTranslate("printing", "PRINTING...") : safeTranslate("printOrder", "PRINT ORDER")}

                            </button>
                        </div>
                    </div>

                    {/* Items Ordered Table */}

                       <div className="table-title">
                            <h2 className="text-body-lg md:text-h3-sm font-bold text-black uppercase mb-2">
                                {safeTranslate("itemsOrdered", "Items Ordered")}
                            </h2>
                            <hr className="border-[#ddd] mb-3" />
                        </div>

                    <div className="bg-white border border-[#ddd] overflow-hidden mb-10 shadow-sm">
                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-start min-w-[500px]">
                                <thead className="bg-gray-50/50 text-label font-semibold text-black uppercase border-b border-[#ddd]">
                                    <tr className="bg-primary">
                                        <th className="px-3 md:px-6 py-3 tracking-widest text-start">{safeTranslate("productName", "Product Name")}</th>
                                        <th className="px-3 md:px-6 py-3 tracking-widest text-center">{safeTranslate("sku", "SKU")}</th>
                                        <th className="px-3 md:px-6 py-3 tracking-widest text-center">{safeTranslate("price", "Price")}</th>
                                        <th className="px-3 md:px-6 py-3 tracking-widest text-center">{safeTranslate("qty", "Qty")}</th>
                                        <th className="px-3 md:px-6 py-3 tracking-widest text-end">{safeTranslate("subtotal", "Subtotal")}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#ddd]">
                                    {order.items?.map((item: any, idx: number) => (
                                        <tr key={item.item_id || item.id || idx} className={`text-xs hover:bg-primary/5 transition-colors ${idx % 2 !== 0 ? 'bg-gray-50' : 'bg-white'}`}>
                                            <td className="px-3 md:px-6 py-3 text-black font-semibold text-start">
                                                {item.name}
                                            </td>
                                            <td className="px-3 md:px-6 py-3 text-black/50 font-semibold text-center">
                                                {item.sku}
                                            </td>
                                            <td className="px-3 md:px-6 py-3 text-black font-semibold text-center">
                                                {formatCurrency(item.price)}
                                            </td>
                                            <td className="px-3 md:px-6 py-3 text-center text-black/60 font-semibold uppercase">
                                                {Math.round(item.qty_ordered)}
                                            </td>
                                            <td className="px-3 md:px-6 py-3 text-end font-semibold text-black">

                                                {formatCurrency(item.row_total)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden divide-y divide-border">
                            {order.items?.map((item: any, idx: number) => (
                                <div key={item.item_id || item.id || idx} className={`p-4 text-xs ${idx % 2 !== 0 ? 'bg-gray-50' : 'bg-white'}`}>
                                    <p className="text-black font-semibold text-sm mb-2">{item.name}</p>
                                    <p className="text-black/50 font-semibold uppercase tracking-widest text-caption mb-3">{safeTranslate("sku", "SKU")}: {item.sku}</p>

                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-black/60 font-semibold uppercase tracking-widest">{safeTranslate("price", "Price")}</span>

                                        <span className="text-black font-semibold">{formatCurrency(item.price)}</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-black/60 font-semibold uppercase tracking-widest">{safeTranslate("qty", "Qty")}</span>

                                        <span className="text-black/60 font-semibold">{Math.round(item.qty_ordered)}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                        <span className="text-black font-semibold uppercase tracking-widest">{safeTranslate("subtotal", "Subtotal")}</span>

                                        <span className="text-black font-semibold">{formatCurrency(item.row_total)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Order Summary */}
                        <div className="flex ltr:justify-end rtl:justify-start p-4">
                            <div className="w-full max-w-[340px] space-y-1.5">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-black font-normal uppercase tracking-widest flex-1 text-end me-10">{safeTranslate("itemsTotal", "Items Total")}</span>

                                    <span className="font-normal text-black w-[110px] text-end">
                                        {formatCurrency(order.subtotal)}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-black font-normal uppercase tracking-widest flex-1 text-end me-10">{safeTranslate("vat", "VAT (15%)")}</span>

                                    <span className="font-normal text-black w-[110px] text-end">
                                        {formatCurrency(order.tax_amount)}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center text-black">
                                    <span className="font-bold uppercase tracking-tighter flex-1 text-end me-10 text-sm">{safeTranslate("grandTotal", "Grand Total")}</span>
                                    <span className="font-bold w-[110px] text-end text-sm">
                                        {formatCurrency(order.grand_total)}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-black font-bold uppercase tracking-widest flex-1 text-end me-10">{safeTranslate("totalQty", "Total Qty")}</span>

                                    <span className="font-bold text-black w-[110px] text-end">
                                        {Math.round(order.total_item_count || order.items?.reduce((acc: number, item: any) => acc + (item.qty_ordered || 0), 0))}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Order Information Section */}
                    <div className="mb-10">
                        <div className="table-title">
                            <h2 className="text-body-lg md:text-h3-sm font-bold text-black uppercase mb-2">
                                 {safeTranslate("orderInfo", "Order Information")}
                            </h2>
                            <hr className="border-[#ddd] mb-3" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                            {/* Shipping Address */}
                            <div className="border border-[#ddd] bg-white shadow-sm rounded-none">
                                <div className="bg-surfaceHover px-4 py-3 border-b border-[#ddd] text-black font-bold uppercase text-body">
                                    <h3 className="box-title">{safeTranslate("shippingAddress", "Shipping Address")}</h3>
                                </div>
                                <div className="p-3 md:p-5 text-body text-black/80 space-y-2.5 font-medium leading-relaxed min-h-[140px]">
                                    {shippingAddress ? (
                                        <div className="space-y-1">
                                            <p className="font-bold text-black uppercase mb-2">{shippingAddress.firstname} {shippingAddress.lastname}</p>
                                            {shippingAddress.company && <p className="font-medium">{shippingAddress.company}</p>}
                                            <p className="font-medium">{shippingAddress.street?.join(", ")}</p>
                                            <p className="font-medium"><bdi dir="ltr">{shippingAddress.city}, {shippingAddress.postcode}</bdi></p>
                                            <p className="font-medium">{shippingAddress.country_id === "SA" ? t("data.Saudi Arabia") : shippingAddress.country_id}</p>

                                            <p className="pt-2 text-black font-bold">T: <span className="text-black/70 font-medium">{shippingAddress.telephone}</span></p>
                                        </div>
                                    ) : (
                                        <p className="text-black/50 italic">{safeTranslate("noShippingAddress", "No shipping address available")}</p>

                                    )}
                                </div>
                            </div>

                            {/* Shipping Method */}
                            <div className="border border-[#ddd] bg-white shadow-sm rounded-none">
                                <div className="bg-surfaceHover px-4 py-3 border-b border-[#ddd] text-black font-bold uppercase text-body">
                                    <h3 className="box-title">{safeTranslate("shippingMethod", "Shipping Method")}</h3>

                                </div>
                                <div className="p-3 md:p-5 text-body text-black/80 space-y-2.5 font-medium leading-relaxed min-h-[140px]">
                                    <p className="font-bold text-black uppercase mb-2">{translateDynamic(order.shipping_description || t("pickupFromWarehouse"))}</p>

                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <p className="text-caption font-bold text-black/50 uppercase tracking-widest mb-1">{safeTranslate("expectedDelivery", "Expected Delivery")}</p>

                                        <p className="font-bold text-black">N/A</p>
                                    </div>
                                </div>
                            </div>

                            {/* Billing Address */}
                            <div className="border border-[#ddd] bg-white shadow-sm rounded-none">
                                <div className="bg-surfaceHover px-4 py-3 border-b border-[#ddd] text-black font-bold uppercase text-body">
                                    <h3 className="box-title">{safeTranslate("billingAddress", "Billing Address")}</h3>

                                </div>
                                <div className="p-3 md:p-5 text-body text-black/80 space-y-2.5 font-medium leading-relaxed min-h-[140px]">
                                    {billingAddress ? (
                                        <div className="space-y-1">
                                            <p className="font-bold text-black uppercase mb-2">{billingAddress.firstname} {billingAddress.lastname}</p>
                                            {billingAddress.company && <p className="font-medium">{billingAddress.company}</p>}
                                            <p className="font-medium">{billingAddress.street?.join(", ")}</p>
                                            <p className="font-medium"><bdi dir="ltr">{billingAddress.city}, {billingAddress.postcode}</bdi></p>
                                            <p className="font-medium">{billingAddress.country_id === "SA" ? t("data.Saudi Arabia") : billingAddress.country_id}</p>

                                            <p className="pt-2 text-black font-bold">T: <span className="text-black/70 font-medium">{billingAddress.telephone}</span></p>
                                        </div>
                                    ) : (
                                        <p className="text-black/50 italic">{safeTranslate("noBillingAddress", "No billing address available")}</p>

                                    )}
                                </div>
                            </div>

                            {/* Payment Method */}
                            <div className="border border-[#ddd] bg-white shadow-sm rounded-none">
                                <div className="bg-surfaceHover px-4 py-3 border-b border-[#ddd] text-black font-bold uppercase text-body">
                                    <h3 className="box-title">{safeTranslate("paymentMethod", "Payment Method")}</h3>

                                </div>
                                <div className="p-3 md:p-5 text-body text-black/80 space-y-2.5 font-medium leading-relaxed min-h-[140px]">
                                    <p className="font-bold text-black uppercase mb-1">{translateDynamic(order.payment?.method_title || paymentMethod)}</p>

                                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                        <span className="text-caption font-bold text-black/50 uppercase tracking-widest">{safeTranslate("paymentConfirmed", "Payment Confirmed")}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Order Attachments Section */}
                    <div className="mb-12">
  

                        <div className="table-title">
                            <h2 className="text-body-lg md:text-h3-sm font-bold text-black uppercase mb-2">
                                  {safeTranslate("orderAttachments", "Order Attachments")}
                            </h2>
                            <hr className="border-[#ddd] mb-3" />
                        </div>

                        {attachmentsError ? (
                            <div className="bg-red-50 border border-red-100 text-red-600 p-4 md:p-8 rounded-md text-center shadow-sm">
                                <p className="text-xs font-bold uppercase tracking-widest mb-2">Error Loading Attachments</p>
                                <p className="text-xs">{attachmentsError}</p>
                            </div>
                        ) : isAttachmentsLoading ? (
                            <div className="bg-white rounded-md border border-border p-20 flex justify-center items-center shadow-sm">
                                <div className="max-w-5xl mx-auto px-4 py-6 animate-pulse space-y-4"><div className="h-7 bg-gray-200 rounded w-48"/>{Array.from({length:4}).map((_,i)=><div key={i} className="h-16 bg-gray-200 rounded-xl"/>)}</div>
                            </div>
                        ) : attachments.length > 0 ? (
                            <div className="bg-white border border-[#ddd] overflow-hidden mb-10 shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs border-collapse">
                                        <thead className="bg-gray-50 border-b border-border">
                                            <tr className="bg-primary">
                                                <th className="jsx-ce6aae4edec06621 px-3 md:px-6 py-3 whitespace-nowrap text-black text-left tracking-widest uppercase">{safeTranslate("fileName", "File Name")}</th>
                                                <th className="jsx-ce6aae4edec06621 px-3 md:px-6 py-3 whitespace-nowrap text-black text-center tracking-widest uppercase">{safeTranslate("type", "Type")}</th>
                                                <th className="jsx-ce6aae4edec06621 px-3 md:px-6 py-3 whitespace-nowrap text-black text-center tracking-widest uppercase">{safeTranslate("createdOn", "Created On")}</th>
                                                <th className="jsx-ce6aae4edec06621 px-3 md:px-6 py-3 whitespace-nowrap text-black text-center tracking-widest uppercase">{safeTranslate("dueDate", "Due Date")}</th>
                                                <th className="jsx-ce6aae4edec06621 px-3 md:px-6 py-3 whitespace-nowrap text-black text-center tracking-widest uppercase">{safeTranslate("payment", "Payment")}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {attachments.map((attachment: any, idx: number) => {
                                                const formatDateDDMMYYYY = (dateStr: string | undefined | null) => {
                                                    if (!dateStr) return "-";
                                                    try {
                                                        const d = new Date(dateStr);
                                                        if (isNaN(d.getTime())) return dateStr;
                                                        const day = String(d.getDate()).padStart(2, '0');
                                                        const month = String(d.getMonth() + 1).padStart(2, '0');
                                                        const year = d.getFullYear();
                                                        return `${day}-${month}-${year}`;
                                                    } catch {
                                                        return dateStr;
                                                    }
                                                };

                                                const currentAttachmentId = attachment.attachment_id || attachment.id || idx;
                                                const isOpening = openingAttachmentId === String(currentAttachmentId);

                                                return (
                                                    <tr key={currentAttachmentId} className={`hover:bg-primary/5 transition-colors ${idx % 2 !== 0 ? 'bg-gray-50' : 'bg-white'}`}>
                                                        <td className="px-3 md:px-6 py-3 text-left">
                                                            <button
                                                                onClick={() => handleOpenAttachment(attachment)}
                                                                disabled={isOpening}
                                                                className="text-primary hover:text-black font-semibold break-all text-left cursor-pointer inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-wait underline underline-offset-4"
                                                            >
                                                                {attachment.file_name || "-"}
                                                            </button>
                                                        </td>
                                                        <td className="px-3 md:px-6 py-3 text-center text-black/60 font-bold uppercase">
                                                            {attachment.document_type || attachment.attachment_type || "-"}
                                                        </td>
                                                        <td className="px-3 md:px-6 py-3 text-center text-black/60 font-bold uppercase">
                                                            {formatDateDDMMYYYY(attachment.upload_date)}
                                                        </td>
                                                        <td className="px-3 md:px-6 py-3 text-center text-black/50 font-bold uppercase">
                                                            {attachment.invoice_due ? formatDateDDMMYYYY(attachment.invoice_due) : "-"}
                                                        </td>
                                                        <td className="px-3 md:px-6 py-3 text-center">
                                                            <span className="inline-flex px-2 py-1 bg-gray-100 text-black/70 rounded-full text-caption font-bold uppercase tracking-widest">
                                                                {attachment.payment || attachment.payment_status || "-"}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white border border-border p-10 md:p-20 text-center text-black/50 italic rounded-md shadow-sm text-xs font-bold uppercase tracking-widest">
                                {safeTranslate("noAttachments", "No attachments available for this order")}
                            </div>
                        )}
                    </div>

                    {/* Payment History Section */}
                    <div className="mb-12" id="payment-history-section">
                        <div className="flex items-center justify-between border-b border-[#ddd] pb-2 mb-3">
                            <div className="inline-block">
                                <h2 className="text-body-lg md:text-h3-sm font-bold text-black uppercase">
                                    {t("m.payment-historydso") || "Payment History"}
                                </h2>
                            </div>
                            <hr className="border-[#ddd] mb-3" />
                            {isPaid ? (
                                <div className="text-green-600 font-bold text-label uppercase tracking-widest flex items-center gap-1">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                    {safeTranslate("paymentCompleted", "Payment Completed")}
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsPaymentModalOpen(true)}
                                    className="bg-primary hover:bg-primaryHover text-white px-5 py-2 rounded-sm font-bold text-body-sm transition-all shadow-sm active:scale-95"
                                >
                                    {t("orders.makePayment")}
                                </button>
                            )}
                        </div>

                        <div className="bg-white border border-[#ddd] overflow-hidden mb-10 shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs border-collapse">
                                    <thead className="bg-gray-50 border-b border-border">
                                        <tr className="bg-primary">
                                            <th className="px-3 md:px-4 py-3 font-bold text-black text-center tracking-widest uppercase whitespace-nowrap">{safeTranslate("receiptNo", "Receipt No")}</th>
                                            <th className="px-3 md:px-4 py-3 font-bold text-black text-center tracking-widest uppercase whitespace-nowrap">{safeTranslate("paymentDate", "Payment Date")}</th>
                                            <th className="px-3 md:px-4 py-3 font-bold text-black text-center tracking-widest uppercase whitespace-nowrap">{safeTranslate("paymentMethod", "Payment Method")}</th>
                                            <th className="px-3 md:px-4 py-3 font-bold text-black text-center tracking-widest uppercase whitespace-nowrap">{safeTranslate("invoiceAmount", "Invoice Amount")}</th>
                                            <th className="px-3 md:px-4 py-3 font-bold text-black text-center tracking-widest uppercase whitespace-nowrap">{safeTranslate("paidAmount", "Paid Amount")}</th>
                                            <th className="px-3 md:px-4 py-3 font-bold text-black text-center tracking-widest uppercase whitespace-nowrap">{safeTranslate("dueAmount", "Due Amount")}</th>
                                            <th className="px-3 md:px-4 py-3 font-bold text-black text-center tracking-widest uppercase whitespace-nowrap">{t("orders.status")}</th>
                                            <th className="px-3 md:px-4 py-3 font-bold text-black text-center tracking-widest uppercase whitespace-nowrap">{safeTranslate("proof", "Proof")}</th>
                                            <th className="px-3 md:px-4 py-3 font-bold text-black text-center tracking-widest uppercase whitespace-nowrap">{safeTranslate("action", "Action")}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border text-center">
                                        {paymentHistory.map((payment: any, index: number) => (
                                            <tr key={payment.id || payment.receipt_no || index} className="hover:bg-primary/5 bg-white">
                                                <td className="px-3 md:px-4 py-3 text-black/80 font-medium">{payment.receipt_no}</td>
                                                <td className="px-3 md:px-4 py-3 text-black/80 font-medium">
                                                    {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString("en-GB").replace(/\//g, "-") : "-"}
                                                </td>
                                                <td className="px-3 md:px-4 py-3 text-black/80 font-medium">{payment.payment_method}</td>
                                                <td className="px-3 md:px-4 py-3 text-black/80 font-bold">
                                                    {formatCurrency(payment.invoice_amount || order.grand_total || 575)}
                                                </td>
                                                <td className="px-3 md:px-4 py-3 text-black/80 font-bold">
                                                    {formatCurrency(payment.paid_payment)}
                                                </td>
                                                <td className="px-3 md:px-4 py-3 text-black/80 font-bold text-red-500">
                                                    {formatCurrency(payment.due_payment)}
                                                </td>
                                                <td className="px-3 md:px-4 py-3">
                                                    <span className={`inline-flex px-3 py-1 rounded-sm text-caption font-bold uppercase tracking-tight border ${payment.payment_status === "Full Paid"
                                                        ? "bg-successBg text-successDark border-successBorder"
                                                        : "bg-warningLight text-warningOrange border-warningBar"
                                                        }`}>
                                                        {t(`data.${payment.payment_status}`) !== `data.${payment.payment_status}` ? t(`data.${payment.payment_status}`) : payment.payment_status}
                                                    </span>
                                                </td>
                                                <td className="px-3 md:px-4 py-3 text-black/50 font-medium">-</td>
                                                <td className="px-3 md:px-4 py-3">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => fetchSinglePayment(payment.id)}
                                                            className="bg-black text-white px-3 py-1.5 rounded-sm font-bold text-caption uppercase tracking-wide hover:bg-primaryHover transition-colors shadow-sm"
                                                        >
                                                            {safeTranslate("edit", "Edit")}
                                                        </button>
                                                        <span className="text-black/40 font-light">|</span>
                                                        <button
                                                            onClick={() => handleDownloadReceipt(payment)}
                                                            className="bg-primary text-white px-3 py-1.5 rounded-sm font-bold text-caption uppercase tracking-wide hover:bg-primaryHover transition-colors shadow-sm"
                                                        >
                                                            {safeTranslate("download", "Download")}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <MakePaymentModal
                        isOpen={isPaymentModalOpen}
                        onClose={() => setIsPaymentModalOpen(false)}
                        order={{
                            ...order,
                            grandTotal: order.grand_total,
                            increment_id: order.increment_id
                        }}
                        customerName={`${order.customer_firstname || ""} ${order.customer_lastname || ""}`.trim() || session?.user?.name || "Customer"}
                        onSave={handleSavePayment}
                        receivablePayment={dueAmount}
                    />

                    <EditPaymentModal
                        isOpen={isEditModalOpen}
                        onClose={() => setIsEditModalOpen(false)}
                        payment={selectedPayment}
                        order={order}
                        customerName={`${order.customer_firstname || ""} ${order.customer_lastname || ""}`.trim() || session?.user?.name || "Customer"}
                        onSave={handleSavePayment}
                    />
                </main>
            </div>


            {/* --- Printable Area (Hidden on screen) --- */}
            <div id="printable-order" className="hidden-print-container">
                <div className="printable-header">
                    <div className="comp-info">
                        <p className="font-bold">Btire.com</p>
                        <p>{t("data.Jeddah")}</p>
                        <p>{t("data.Saudi Arabia")}</p>
                        <p>{safeTranslate("trn", "TRN")}: </p>
                        <p>{safeTranslate("phone", "Phone")}: {shippingAddress?.telephone || "-"}</p>
                        <p>{safeTranslate("website", "Website")}: https://autoono-demo.btire.com/</p>

                    </div>
                    <div className="order-title-box">
                        <h1 className="order-summary-title">{safeTranslate("orderSummary", "ORDER SUMMARY")}</h1>

                    </div>
                    <div className="order-meta">
                        <img src="/logo/auttono-logo.jpg" alt="Logo" className="print-logo" />
                        <div className="meta-row">
                            <span className="label">{safeTranslate("orderHash", "ORDER #")}</span>
                            <span className="value">{order.increment_id}</span>
                        </div>
                        <div className="meta-row">
                            <span className="label">{safeTranslate("createdOn", "Created On")}</span>
                            <span className="value">{formatDate(order.created_at)}</span>
                        </div>
                    </div>
                </div>

                <div className="address-box-container">
                    <div className="address-header-row">
                        <div className="header-cell">{safeTranslate("billingAddress", "Billing Address")}</div>
                        <div className="header-cell">{safeTranslate("shipTo", "SHIP TO")}</div>

                    </div>
                    <div className="address-content-row">
                        <div className={`content-cell ${locale === 'ar' ? 'border-l' : 'border-r'} border-black text-start`}>

                            <p className="font-bold">{billingAddress?.firstname} {billingAddress?.lastname}</p>
                            <p>{billingAddress?.company || "-"}</p>
                            <p>{billingAddress?.street?.join(", ")}</p>
                            <p><bdi dir="ltr">{billingAddress?.city}, {billingAddress?.postcode}</bdi></p>
                            <p>{billingAddress?.country_id === "SA" ? t("data.Saudi Arabia") : billingAddress?.country_id}</p>
                            <p>{t("orderDetails.phone")}: {billingAddress?.telephone}</p>
                            <p>{t("m.email")}: <bdi dir="ltr">{order.customer_email || "-"}</bdi></p>

                        </div>
                        <div className="content-cell">
                            <p className="font-bold">{shippingAddress?.firstname} {shippingAddress?.lastname}</p>
                            <p>{shippingAddress?.company || "-"}</p>
                            <p>{shippingAddress?.street?.join(", ")}</p>
                            <p><bdi dir="ltr">{shippingAddress?.city}, {shippingAddress?.postcode}</bdi></p>
                            <p>{shippingAddress?.country_id === "SA" ? t("data.Saudi Arabia") : shippingAddress?.country_id}</p>
                            <p>{t("orderDetails.phone")}: {shippingAddress?.telephone}</p>

                        </div>
                    </div>
                </div>

                <table className="items-print-table">
                    <thead>
                        <tr>
                            <th className="text-left">{safeTranslate("description", "DESCRIPTION")}</th>
                            <th className="text-center">{safeTranslate("qty", "Qty")}</th>
                            <th className="text-right">{safeTranslate("unitPrice", "UNIT PRICE")}</th>
                            <th className="text-right">{safeTranslate("total", "TOTAL")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.items?.map((item: any, idx: number) => (
                            <tr key={item.item_id || item.id || idx}>
                                <td>
                                    <p className="item-name">{item.name}</p>
                                    <p className="item-sku">{item.sku}</p>
                                </td>
                                <td className="text-center">{Math.round(item.qty_ordered)}</td>
                                <td className="text-right">{formatCurrency(item.price)}</td>
                                <td className="text-right font-bold">{formatCurrency(item.row_total)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="totals-print-container">
                    <div className="totals-wrapper">
                        <div className="total-row">
                            <span>{safeTranslate("subtotal", "Subtotal")}</span>
                            <span>{formatCurrency(order.subtotal)}</span>
                        </div>
                        <div className="total-row">
                            <span>{safeTranslate("vat", "VAT (15%)")}</span>
                            <span>{formatCurrency(order.tax_amount)}</span>
                        </div>
                        <div className="total-row grand-total-row">
                            <span>{safeTranslate("grandTotal", "Grand Total")}</span>
                            <span>{formatCurrency(order.grand_total)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom Styles for Printing */}
            <style jsx global>{`
                #printable-order {
                    display: none;
                }

                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #printable-order, #printable-order * {
                        visibility: visible;
                    }
                    #printable-order {
                        display: block !important;
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        background: white !important;
                        color: black !important;
                        padding: 20px;
                        font-family: 'Rubik', sans-serif;
                    }
                    
                    /* Reset everything else */
                    .no-print, aside, nav, header, footer {
                        display: none !important;
                    }
                    
                    /* Header Styles */
                    .printable-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        margin-bottom: 30px;
                    }
                    .comp-info {
                        font-size: 11px;
                        line-height: 1.4;
                    }
                    .order-title-box {
                        flex: 1;
                        text-align: center;
                    }
                    .order-summary-title {
                        font-size: 20px;
                        font-weight: 700;
                        text-decoration: none;
                        display: inline-block;
                        border-bottom: 1.5px solid black;
                        padding-bottom: 2px;
                        margin-top: 10px;
                    }
                    .order-meta {
                        text-align: right;
                        display: flex;
                        flex-direction: column;
                        gap: 4px;
                    }
                    .print-logo {
                        height: 40px;
                        width: auto;
                        margin-bottom: 10px;
                        margin-left: auto;
                    }
                    .meta-row {
                        display: flex;
                        justify-content: space-between;
                        font-size: 11px;
                        font-weight: 600;
                        gap: 20px;
                    }
                    .meta-row .label { width: 60px; text-align: left; }
                    .meta-row .value { text-align: right; }

                    /* Address Box Styles */
                    .address-box-container {
                        border: 1px solid black;
                        margin-bottom: 30px;
                        border-radius: 2px;
                        overflow: hidden;
                    }
                    .address-header-row {
                        display: flex;
                        background-color: #f0f0f0 !important;
                        -webkit-print-color-adjust: exact;
                        border-bottom: 1px solid black;
                    }
                    .header-cell {
                        flex: 1;
                        padding: 6px 15px;
                        font-size: 11px;
                        font-weight: 700;
                    }
                    .address-content-row {
                        display: flex;
                    }
                    .content-cell {
                        flex: 1;
                        padding: 15px;
                        font-size: 11px;
                        line-height: 1.5;
                        min-height: 120px;
                    }

                    /* Table Styles */
                    .items-print-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 30px;
                    }
                    .items-print-table th {
                        background-color: #f0f0f0 !important;
                        -webkit-print-color-adjust: exact;
                        border: 1px solid black;
                        padding: 8px 15px;
                        font-size: 11px;
                        font-weight: 700;
                    }
                    .items-print-table td {
                        border: 1px solid black;
                        padding: 10px 15px;
                        font-size: 11px;
                        vertical-align: top;
                    }
                    .item-name { font-weight: 700; margin-bottom: 2px; }
                    .item-sku { font-size: 10px; color: #444; }

                    /* Totals Styles */
                    .totals-print-container {
                        display: flex;
                        justify-content: flex-end;
                    }
                    .totals-wrapper {
                        width: 250px;
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                    }
                    .total-row {
                        display: flex;
                        justify-content: space-between;
                        font-size: 11px;
                        font-weight: 700;
                    }
                    .grand-total-row {
                        margin-top: 5px;
                        padding-top: 5px;
                        font-size: 13px;
                        font-weight: 900;
                    }
                }
            `}</style>
        </div>
    );
}
