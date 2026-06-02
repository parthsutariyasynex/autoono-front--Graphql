"use client";
import { useTranslation } from "@/hooks/useTranslation";
import { useLocalePath } from "@/hooks/useLocalePath";

import React, { useState, useEffect } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import PortalDropdown from "@/components/PortalDropdown";
import Pagination from "@/components/Pagination";
import toast from "react-hot-toast";
import { OrdersTableSkeleton } from "@/components/skeletons";
import { redirectToLogin } from "@/utils/helpers";

// Helper to normalize options (strings or objects) to {label, value} format
function normalizeOptions(options: any[]): { label: string; value: string }[] {
    return options.map((opt) => {
        if (typeof opt === "string") return { label: opt, value: opt };
        const label = opt.label || opt.name || opt.status || "";
        const value = opt.value || opt.id || label;
        return { label, value: String(value) };
    });
}

// Fetcher with token
const fetcher = async (url: string, token: string | null) => {
    if (!token) return null;
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
        const error = new Error("An error occurred while fetching the data.");
        // @ts-ignore
        error.info = await res.json();
        // @ts-ignore
        error.status = res.status;
        throw error;
    }
    return res.json();
};

export default function OrderAttachmentsPage() {
    const { data: session, status: authStatus } = useSession();
    const router = useRouter();
    const { t, isRtl } = useTranslation();
    const lp = useLocalePath();

    // Filters state
    const [searchText, setSearchText] = useState("");
    const [searchOrderId, setSearchOrderId] = useState("");
    const [documentType, setDocumentType] = useState("All");
    const [invoiceDue, setInvoiceDue] = useState("All");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [openingFileId, setOpeningFileId] = useState<string | null>(null);

    // Auth Guard
    useEffect(() => {
        if (authStatus === "unauthenticated") {
            redirectToLogin(router);
        }
    }, [authStatus, router]);

    // Construct API URL with query params
    const token = (session as any)?.accessToken;
    const queryParams = new URLSearchParams();
    if (searchOrderId) queryParams.append("order_id", searchOrderId);
    if (documentType !== "All") queryParams.append("document_type", documentType);
    if (invoiceDue !== "All") queryParams.append("invoice_due", invoiceDue);
    queryParams.append("pageSize", pageSize.toString());
    queryParams.append("currentPage", currentPage.toString());

    const apiUrl = token
        ? `/api/kleverapi/order-attachments/search${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
        : null;

    // SWR for data fetching
    const { data, error, isLoading, mutate } = useSWR(
        apiUrl ? [apiUrl, token] : null,
        ([url, t]) => fetcher(url, t)
    );

    // Filter Options
    const { data: filterOptionsData } = useSWR(
        token ? [`/api/kleverapi/order-attachments/filter-options`, token] : null,
        ([url, t]) => fetcher(url, t)
    );

    const docTypeOptions = filterOptionsData?.document_type_options || filterOptionsData?.document_types || [];
    const invoiceDueOptions = filterOptionsData?.invoice_due_options || filterOptionsData?.invoice_due || [];

    // Helper to ensure "All" is present and at the start, translate labels
    // via the `data.<label>` convention (falls back to the raw label).
    const translateLabel = (label: string) => {
        const key = `data.${label}`;
        const translated = t(key);
        return translated !== key ? translated : label;
    };

    const getOptionsWithAll = (options: any[]) => {
        const allOption = { label: t("m.all") || "All", value: "All" };
        if (!options || options.length === 0) return [allOption];
        const normalized = normalizeOptions(options);
        const hasAll = normalized.some(opt => opt.value.toLowerCase() === "all" || opt.label.toLowerCase() === "all");
        const localized = normalized.map(opt => {
            const isAll = opt.value.toLowerCase() === "all" || opt.label.toLowerCase() === "all";
            return { ...opt, label: isAll ? (t("m.all") || "All") : translateLabel(opt.label) };
        });
        return hasAll ? localized : [allOption, ...localized];
    };

    const finalDocTypes = getOptionsWithAll(docTypeOptions);
    const finalInvoiceDues = getOptionsWithAll(invoiceDueOptions);

    const handleSearch = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setSearchOrderId(searchText);
        setCurrentPage(1);
    };

    const handleReset = () => {
        setSearchText("");
        setSearchOrderId("");
        setDocumentType("All");
        setInvoiceDue("All");
        setCurrentPage(1);
    };

    const handleViewOrder = (orderId: string) => {
        if (!orderId) return;
        router.push(lp(`/my-orders/${orderId}`));
    };

    const handleViewFile = async (attachment: any) => {
        const id = attachment.attachment_id || attachment.id;
        const fileUrl = attachment.file_url;
        const fileName = attachment.file_name || attachment.label || "file";
        if (!id) return;

        setOpeningFileId(id);
        try {
            // kleverOrderUploadSearch doesn't expose `file_url`, so we also
            // forward `name`. The route uses Magento's deterministic media
            // layout `/media/orderupload/<a>/<b>/<filename>` to locate the
            // file when no explicit URL is available.
            const qs = new URLSearchParams();
            if (fileUrl) qs.set("url", fileUrl);
            if (fileName) qs.set("name", fileName);
            const proxyUrl = `/api/kleverapi/order-attachments/file/${id}${qs.toString() ? `?${qs.toString()}` : ""}`;

            const res = await fetch(proxyUrl, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || t("orderAttachments.unableToOpen"));
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";

            const ext = fileName.split('.').pop()?.toLowerCase() || "";
            const viewableTypes = ["pdf", "jpg", "jpeg", "png", "gif", "webp"];
            if (!viewableTypes.includes(ext)) {
                link.download = fileName;
            }

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => window.URL.revokeObjectURL(url), 5000);
        } catch (error: any) {
            console.error("View File Error:", error);
            toast.error(error.message || t("common.error"));
        } finally {
            setOpeningFileId(null);
        }
    };

    const getDocTypeLabel = (fileName: string, origType: string) => {
        if (origType && origType !== "-") return origType;
        if (!fileName) return "documents";
        const ext = fileName.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'pdf': return "PDF";
            case 'jpg':
            case 'jpeg':
            case 'png': return "image";
            case 'doc':
            case 'docx': return "Word";
            case 'xls':
            case 'xlsx': return "Excel";
            default: return "documents";
        }
    };

    const formatDate = (dateStr: string | undefined | null) => {
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

    const attachments = Array.isArray(data) ? data : data?.attachments || data?.items || [];
    const totalItems = data?.total_count || attachments.length;
    const totalPages = Math.ceil(totalItems / pageSize);

    const handlePageChange = (page: number) => setCurrentPage(page);
    const handlePageSizeChange = (size: number) => { setPageSize(size); setCurrentPage(1); };

    return (
        <div className="flex flex-col lg:flex-row flex-1 min-h-0 w-full bg-[#fcfcfc]">
            <Sidebar />

            <main className="flex-1 w-full px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-10 bg-surfacePage min-w-0" dir={isRtl ? "rtl" : "ltr"}>
                <h1 className="text-h3 md:text-[26px] font-bold text-black mb-6 md:mb-10 uppercase tracking-wide">
                    {t("orderAttachments.title")}
                </h1>

                {/* Search Section */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-6 md:mb-8">
                    <div className="w-full sm:w-[200px]">
                        <input
                            type="text"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            placeholder={t("m.search")}
                            className="w-full bg-white border border-border rounded-md px-4 py-2.5 text-xs text-black focus:outline-none focus:border-primary placeholder:text-black/50 font-bold shadow-sm"
                        />
                    </div>
                    <button
                        onClick={handleSearch}
                        className="w-full sm:w-auto bg-primary hover:bg-primary text-black font-bold h-[40px] px-4 md:px-6 rounded-md text-xs uppercase tracking-widest transition-all shadow-sm active:scale-95"
                    >
                        {t("m.search")}
                    </button>
                </div>

                {/* Filters Section */}
                <div className="flex flex-col sm:flex-row gap-4 items-end mb-6 md:mb-10 bg-white p-4 md:p-6 border border-border rounded-md shadow-sm">
                    <div className="w-full sm:w-auto sm:min-w-[200px]">
                        <label className="block text-xs font-bold text-black mb-2 uppercase tracking-wider">{t("m.document-type")}</label>
                        <PortalDropdown
                            value={documentType}
                            onChange={(val) => { setDocumentType(val); setCurrentPage(1); }}
                            options={finalDocTypes}
                            buttonClassName="w-full h-[40px] bg-white text-black font-bold border border-gray-200 rounded-md px-4 text-xs ltr:text-left rtl:text-right flex items-center justify-between cursor-pointer focus:outline-none focus:border-primary"
                        />
                    </div>

                    <div className="w-full sm:w-auto sm:min-w-[200px]">
                        <label className="block text-xs font-bold text-black mb-2 uppercase tracking-wider">{t("m.invoice-due")}</label>
                        <PortalDropdown
                            value={invoiceDue}
                            onChange={(val) => { setInvoiceDue(val); setCurrentPage(1); }}
                            options={finalInvoiceDues}
                            buttonClassName="w-full h-[40px] bg-white text-black font-bold border border-gray-200 rounded-md px-4 text-xs ltr:text-left rtl:text-right flex items-center justify-between cursor-pointer focus:outline-none focus:border-primary"
                        />
                    </div>

                    <div>
                        <button
                            onClick={handleReset}
                            className="w-full sm:w-auto bg-black hover:bg-gray-800 text-white font-bold h-[40px] px-6 md:px-8 rounded-md text-xs uppercase tracking-widest transition-all shadow-md active:scale-95"
                        >
                            {t("m.reset")}
                        </button>
                    </div>
                </div>

                {/* Table Section */}
                {error ? (
                    <div className="bg-red-50 border border-red-100 text-red-600 p-4 md:p-8 rounded-md text-center">
                        <p className="font-bold text-xs uppercase mb-2">{t("common.error")}</p>
                        <p className="text-xs">{error.message}</p>
                        <button
                            onClick={() => mutate()}
                            className="mt-6 px-10 py-3 bg-red-600 text-white rounded-md font-bold text-xs uppercase tracking-widest shadow-md active:scale-95 cursor-pointer"
                        >
                            {t("common.tryAgain")}
                        </button>
                    </div>
                ) : isLoading ? (
                    <OrdersTableSkeleton rows={6} />
                ) : attachments.length > 0 ? (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto w-full border border-border rounded-md shadow-sm">
                            <table className="w-full border-collapse bg-white">
                                <thead className="bg-gray-50 border-b border-border">
                                    <tr className="h-[50px]">
                                        <th className="px-6 py-3 font-bold text-xs text-black uppercase tracking-wider text-center">{t("orders.orderId")}</th>
                                        <th className="px-6 py-3 font-bold text-xs text-black uppercase tracking-wider ltr:text-left rtl:text-right">{t("m.file-name")}</th>
                                        <th className="px-6 py-3 font-bold text-xs text-black uppercase tracking-wider text-center">{t("m.document-type")}</th>
                                        <th className="px-6 py-3 font-bold text-xs text-black uppercase tracking-wider ltr:text-left rtl:text-right">{t("m.created-at")}</th>
                                        <th className="px-6 py-3 font-bold text-xs text-black uppercase tracking-wider ltr:text-left rtl:text-right">{t("m.invoice-due")}</th>
                                        <th className="px-6 py-3 font-bold text-xs text-black uppercase tracking-wider ltr:text-left rtl:text-right">{t("m.payment")}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {attachments.map((attachment: any, idx: number) => {
                                        const attId = attachment.id || attachment.attachment_id || String(idx);
                                        const isOpening = openingFileId === String(attId);
                                        const orderDisplay = attachment.order_increment_id || attachment.order_id || "-";
                                        const fileName = attachment.file_name || attachment.label || t("m.download");
                                        const docTypeLabel = getDocTypeLabel(fileName, attachment.comment || attachment.document_type || attachment.attachment_type);
                                        const createdAt = formatDate(attachment.created_at || attachment.upload_date);
                                        const invoiceDueVal = attachment.invoice_due ? formatDate(attachment.invoice_due) : "";
                                        const paymentStatus = attachment.payment || attachment.payment_status || "";

                                        return (
                                            <tr key={attId} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b border-border hover:bg-primary/5 transition-colors text-xs`}>
                                                <td className="px-6 py-4 text-center font-bold">
                                                    <button onClick={() => handleViewOrder(attachment.order_id)} className="text-black hover:text-primary hover:underline transition-all cursor-pointer focus:outline-none">{orderDisplay}</button>
                                                </td>
                                                <td className="px-6 py-4 ltr:text-left rtl:text-right font-medium">
                                                    <div className="flex items-center gap-3">
                                                        <button onClick={() => { const useUrl = attachment.file_url || attachment.file_path; handleViewFile({ ...attachment, file_url: useUrl, attachment_id: attId }); }} disabled={isOpening} className={`text-black hover:underline inline-block break-all ltr:text-left rtl:text-right focus:outline-none font-bold ${isOpening ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>{fileName}</button>
                                                        
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center font-bold text-black/70 uppercase">{t(`m.${docTypeLabel.toLowerCase()}`) !== `m.${docTypeLabel.toLowerCase()}` ? t(`m.${docTypeLabel.toLowerCase()}`) : (t(`data.${docTypeLabel}`) !== `data.${docTypeLabel}` ? t(`data.${docTypeLabel}`) : docTypeLabel)}</td>
                                                <td className="px-6 py-4 ltr:text-left rtl:text-right font-bold text-black/60">{createdAt}</td>
                                                <td className="px-6 py-4 ltr:text-left rtl:text-right font-bold text-black/60">{invoiceDueVal}</td>
                                                <td className="px-6 py-4 ltr:text-left rtl:text-right">
                                                    <span className={`px-2 py-1 rounded-md font-bold uppercase text-caption ${paymentStatus.toLowerCase().includes('paid') ? 'bg-green-100 text-green-700' : 'bg-primary text-primary'}`}>{paymentStatus ? (t(`data.${paymentStatus}`) !== `data.${paymentStatus}` ? t(`data.${paymentStatus}`) : paymentStatus) : "-"}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card List */}
                        <div className="md:hidden space-y-3">
                            {attachments.map((attachment: any, idx: number) => {
                                const attId = attachment.id || attachment.attachment_id || String(idx);
                                const isOpening = openingFileId === String(attId);
                                const orderDisplay = attachment.order_increment_id || attachment.order_id || "-";
                                const fileName = attachment.file_name || attachment.label || t("m.download");
                                const docTypeLabel = getDocTypeLabel(fileName, attachment.comment || attachment.document_type || attachment.attachment_type);
                                const createdAt = formatDate(attachment.created_at || attachment.upload_date);
                                const invoiceDueVal = attachment.invoice_due ? formatDate(attachment.invoice_due) : "";
                                const paymentStatus = attachment.payment || attachment.payment_status || "";

                                return (
                                    <div key={attId} className="bg-white border border-border rounded-md p-4 shadow-sm">
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="min-w-0 flex-1">
                                                <button
                                                    onClick={() => { const useUrl = attachment.file_url || attachment.file_path; handleViewFile({ ...attachment, file_url: useUrl, attachment_id: attId }); }}
                                                    disabled={isOpening}
                                                    className={`text-body font-bold text-black hover:text-primary ltr:text-left rtl:text-right break-all ${isOpening ? 'opacity-50' : ''}`}
                                                >
                                                    {fileName}
                                                    
                                                </button>
                                                <p className="text-label text-black/60 font-medium mt-1 uppercase tracking-wider">{t(`m.${docTypeLabel.toLowerCase()}`) !== `m.${docTypeLabel.toLowerCase()}` ? t(`m.${docTypeLabel.toLowerCase()}`) : (t(`data.${docTypeLabel}`) !== `data.${docTypeLabel}` ? t(`data.${docTypeLabel}`) : docTypeLabel)}</p>
                                            </div>
                                            <span className={`px-2 py-1 rounded-md font-bold uppercase text-caption flex-shrink-0 ${paymentStatus.toLowerCase().includes('paid') ? 'bg-green-100 text-green-700' : 'bg-primary text-primary'}`}>
                                                {paymentStatus ? (t(`data.${paymentStatus}`) !== `data.${paymentStatus}` ? t(`data.${paymentStatus}`) : paymentStatus) : "-"}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-label text-black/60 font-medium border-t border-gray-100 pt-2.5">
                                            <div className="flex items-center gap-1">
                                                <span className="font-bold text-black uppercase text-caption">{t("m.order")}:</span>
                                                <button onClick={() => handleViewOrder(attachment.order_id)} className="text-black hover:text-primary font-bold">{orderDisplay}</button>
                                            </div>
                                            <span>{createdAt}</span>
                                            {invoiceDueVal && <span>{t("m.invoice-due")}: {invoiceDueVal}</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        {totalItems > 0 && (
                            <div className="mt-8 flex justify-center">
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    totalItems={totalItems}
                                    pageSize={pageSize}
                                    onPageChange={handlePageChange}
                                    onPageSizeChange={handlePageSizeChange}
                                />
                            </div>
                        )}
                    </>
                ) : (
                    <div className="border border-border p-8 md:p-24 text-center rounded-md bg-white shadow-sm">
                        <p className="text-black/50 italic text-xs uppercase tracking-widest">{t("orderAttachments.noRecords")}</p>
                    </div>
                )}
            </main>
        </div>
    );
}
