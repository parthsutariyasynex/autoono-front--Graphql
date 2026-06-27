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

// ─── Shared utilities ────────────────────────────────────────────────────────

function normalizeOptions(options: any[]): { label: string; value: string }[] {
    return options.map((opt) => {
        if (typeof opt === "string") return { label: opt, value: opt };
        const label = opt.label || opt.name || opt.status || "";
        const value = opt.value || opt.id || label;
        return { label, value: String(value) };
    });
}

const fetcher = async (url: string, token: string | null) => {
    if (!token) return null;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
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

function formatDate(dateStr: string | undefined | null): string {
    if (!dateStr) return "-";
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        return `${day}-${month}-${d.getFullYear()}`;
    } catch {
        return dateStr;
    }
}

function getDocTypeLabel(fileName: string, origType: string): string {
    if (origType && origType !== "-") return origType;
    if (!fileName) return "documents";
    const ext = fileName.split(".").pop()?.toLowerCase();
    switch (ext) {
        case "pdf": return "PDF";
        case "jpg":
        case "jpeg":
        case "png": return "image";
        case "doc":
        case "docx": return "Word";
        case "xls":
        case "xlsx": return "Excel";
        default: return "documents";
    }
}

// ─── Entry point: detect user type, render the correct view ──────────────────

export default function OrderAttachmentsPage() {
    // null = not yet determined (prevents flash of wrong layout)
    const [isSalesPerson, setIsSalesPerson] = useState<boolean | null>(null);

    useEffect(() => {
        try {
            const cache = JSON.parse(localStorage.getItem("sidebar_cache_v2") || "{}");
            // Primary check: explicit user_type field
            if (cache.user_type === "Sales Person") {
                setIsSalesPerson(true);
                return;
            }
            // Fallback: address_book is hidden for Sales Person accounts
            const addressBook = (cache.items || []).find((i: any) => i.code === "address_book");
            setIsSalesPerson(addressBook?.is_visible === false);
        } catch {
            setIsSalesPerson(false);
        }
    }, []);

    // Hold render until role is known — avoids a flash of the wrong layout
    if (isSalesPerson === null) return null;

    if (isSalesPerson) return <SalesPersonOrderAttachments />;
    return <DefaultOrderAttachments />;
}

// ─── DEFAULT view — every non-Sales-Person account ───────────────────────────
// Original layout: 1 search input · Document Type · Invoice Due dropdowns
// Table: # Order | File Name | Document Type | Created On | Invoice Due | Payment

function DefaultOrderAttachments() {
    const { data: session, status: authStatus } = useSession();
    const router = useRouter();
    const { t, isRtl } = useTranslation();
    const lp = useLocalePath();

    const [searchText, setSearchText] = useState("");
    const [searchOrderId, setSearchOrderId] = useState("");
    const [documentType, setDocumentType] = useState("All");
    const [invoiceDue, setInvoiceDue] = useState("All");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [openingFileId, setOpeningFileId] = useState<string | null>(null);

    useEffect(() => {
        if (authStatus === "unauthenticated") redirectToLogin(router);
    }, [authStatus, router]);

    const token = (session as any)?.accessToken;

    const queryParams = new URLSearchParams();
    if (searchOrderId) queryParams.append("order_id", searchOrderId);
    if (documentType !== "All") queryParams.append("document_type", documentType);
    if (invoiceDue !== "All") queryParams.append("invoice_due", invoiceDue);
    queryParams.append("pageSize", pageSize.toString());
    queryParams.append("currentPage", currentPage.toString());

    const apiUrl = token
        ? `/api/kleverapi/order-attachments/search?${queryParams.toString()}`
        : null;

    const { data, error, isLoading, mutate } = useSWR(
        apiUrl ? [apiUrl, token] : null,
        ([url, tk]) => fetcher(url, tk)
    );

    const { data: filterOptionsData } = useSWR(
        token ? ["/api/kleverapi/order-attachments/filter-options", token] : null,
        ([url, tk]) => fetcher(url, tk)
    );

    const buildOptions = (raw: any[]) => {
        const allOpt = { label: t("m.all") || "All", value: "All" };
        if (!raw || raw.length === 0) return [allOpt];
        const normalized = normalizeOptions(raw);
        const hasAll = normalized.some(o => o.value.toLowerCase() === "all");
        return hasAll ? normalized : [allOpt, ...normalized];
    };

    const finalDocTypes = buildOptions(
        filterOptionsData?.document_types || filterOptionsData?.document_type_options || []
    );
    const finalInvoiceDues = buildOptions(
        filterOptionsData?.invoice_due_options || filterOptionsData?.invoice_due || []
    );

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
        setOpeningFileId(String(id));
        try {
            const qs = new URLSearchParams();
            if (fileUrl) qs.set("url", fileUrl);
            if (fileName) qs.set("name", fileName);
            const proxyUrl = `/api/kleverapi/order-attachments/file/${id}${qs.toString() ? `?${qs.toString()}` : ""}`;
            const res = await fetch(proxyUrl, { headers: { Authorization: `Bearer ${token}` } });
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
            const ext = fileName.split(".").pop()?.toLowerCase() || "";
            if (!["pdf", "jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
                link.download = fileName;
            }
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => window.URL.revokeObjectURL(url), 5000);
        } catch (err: any) {
            toast.error(err.message || t("common.error"));
        } finally {
            setOpeningFileId(null);
        }
    };

    const attachments = Array.isArray(data) ? data : data?.items || data?.attachments || [];
    const totalItems = data?.total_count || attachments.length;
    const totalPages = Math.ceil(totalItems / pageSize);

    const dropdownCls = "w-full h-9 bg-white text-black border border-gray-200 px-3 text-body ltr:text-left rtl:text-right flex items-center justify-between cursor-pointer";

    return (
        <div className="flex flex-col lg:flex-row flex-1 min-h-0 w-full">
            <Sidebar />

            <main
                className="flex-1 w-full px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-5 min-w-0"
                dir={isRtl ? "rtl" : "ltr"}
            >
                <h1 className="text-h3 md:text-[26px] font-bold text-black uppercase tracking-wide mb-5">
                    {t("orderAttachments.title")}
                </h1>

                {/* Filters */}
                <form onSubmit={handleSearch} className="mb-5">
                    {/* Row 1: search input + Search button */}
                    <div className="flex flex-col sm:flex-row gap-2 mb-2">
                        <input
                            type="text"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            placeholder={t("orderAttachments.searchPlaceholder") || "Search Order..."}
                            className="h-9 flex-1 border border-gray-200 bg-white px-3 text-body text-black placeholder-gray-400 focus:outline-none focus:border-primary"
                            suppressHydrationWarning
                        />
                        <button
                            type="submit"
                            className="h-9 px-6 bg-primary hover:bg-primaryHover text-white text-body-sm font-bold uppercase tracking-widest transition-colors whitespace-nowrap"
                            suppressHydrationWarning
                        >
                            {t("orderAttachments.search") || "Search"}
                        </button>
                    </div>

                    {/* Row 2: Document Type + Invoice Due + Reset */}
                    <div className="flex flex-col sm:flex-row gap-2 items-center">
                        <div className="w-full sm:w-48">
                            <PortalDropdown
                                value={documentType}
                                onChange={(val) => { setDocumentType(val); setCurrentPage(1); }}
                                options={finalDocTypes}
                                buttonClassName={dropdownCls}
                                placeholder={t("orderAttachments.document") || "Document"}
                            />
                        </div>
                        <div className="w-full sm:w-48">
                            <PortalDropdown
                                value={invoiceDue}
                                onChange={(val) => { setInvoiceDue(val); setCurrentPage(1); }}
                                options={finalInvoiceDues}
                                buttonClassName={dropdownCls}
                                placeholder={t("orderAttachments.invoiceDue") || "Invoice Due"}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleReset}
                            className="h-9 px-6 bg-black hover:bg-gray-800 text-white text-body-sm font-bold uppercase tracking-widest transition-colors whitespace-nowrap"
                            suppressHydrationWarning
                        >
                            {t("orderAttachments.reset") || "Reset"}
                        </button>
                    </div>
                </form>

                {/* Content */}
                {error ? (
                    <div className="bg-warningBgPale border border-warningBgSoft text-warningBadge p-6 text-center rounded-sm">
                        <p className="font-bold text-body-sm uppercase mb-2">{t("orderAttachments.errorLoading")}</p>
                        <p className="text-body-sm mb-4">{error.message}</p>
                        <button
                            onClick={() => mutate()}
                            className="px-8 py-2 bg-primary text-white text-body-sm font-bold uppercase tracking-widest"
                        >
                            {t("orderAttachments.tryAgain")}
                        </button>
                    </div>
                ) : isLoading ? (
                    <OrdersTableSkeleton rows={6} />
                ) : attachments.length > 0 ? (
                    <>
                        {/* Desktop table */}
                        <div className="hidden md:block overflow-x-auto w-full">
                            <table className="w-full border-collapse min-w-[640px] border border-[#ddd]">
                                <thead>
                                    <tr className="bg-primary text-label uppercase font-bold tracking-widest">
                                        <th className="px-3 py-2 border border-warning/30 text-center whitespace-nowrap text-body-sm">
                                            {t("orderAttachments.orderHash") || "# Order"}
                                        </th>
                                        <th className="px-3 py-2 border border-warning/30 ltr:text-left rtl:text-right text-body-sm">
                                            {t("orderAttachments.fileName") || "File Name"}
                                        </th>
                                        <th className="px-3 py-2 border border-warning/30 text-center whitespace-nowrap text-body-sm">
                                            {t("orderAttachments.documentType") || "Document Type"}
                                        </th>
                                        <th className="px-3 py-2 border border-warning/30 text-center whitespace-nowrap text-body-sm">
                                            {t("orderAttachments.createdOn") || "Created On"}
                                        </th>
                                        <th className="px-3 py-2 border border-warning/30 text-center whitespace-nowrap text-body-sm">
                                            {t("m.invoice-due") || "Invoice Due"}
                                        </th>
                                        <th className="px-3 py-2 border border-warning/30 text-center whitespace-nowrap text-body-sm">
                                            {t("orderAttachments.payment") || "Payment"}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {attachments.map((attachment: any, idx: number) => {
                                        const attId = attachment.id || attachment.attachment_id || String(idx);
                                        const isOpening = openingFileId === String(attId);
                                        const orderDisplay = attachment.order_increment_id || attachment.order_id || "-";
                                        const fileName = attachment.file_name || attachment.label || t("m.download");
                                        const docTypeLabel = getDocTypeLabel(fileName, attachment.comment || attachment.document_type || attachment.upload_for || attachment.attachment_type || "");
                                        const createdAt = formatDate(attachment.created_at || attachment.upload_date);
                                        const invoiceDueVal = attachment.invoice_due ? formatDate(attachment.invoice_due) : "-";
                                        const paymentStatus = attachment.payment || attachment.payment_status || "";

                                        return (
                                            <tr key={attId} className="border-b border-gray-200">
                                                <td className="px-3 py-2 border-r border-gray-200 text-center text-body">
                                                    <button
                                                        onClick={() => handleViewOrder(String(attachment.order_id))}
                                                        className="text-black hover:underline font-medium focus:outline-none"
                                                    >
                                                        {orderDisplay}
                                                    </button>
                                                </td>
                                                <td className="px-3 py-2 border-r border-gray-200 text-body max-w-[240px]">
                                                    <button
                                                        onClick={() => handleViewFile({ ...attachment, attachment_id: attId })}
                                                        disabled={isOpening}
                                                        className={`text-black hover:underline ltr:text-left rtl:text-right break-words focus:outline-none ${isOpening ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                                                    >
                                                        {fileName}
                                                    </button>
                                                </td>
                                                <td className="px-3 py-2 border-r border-gray-200 text-center text-body uppercase">
                                                    {docTypeLabel}
                                                </td>
                                                <td className="px-3 py-2 border-r border-gray-200 text-center text-body whitespace-nowrap">
                                                    {createdAt}
                                                </td>
                                                <td className="px-3 py-2 border-r border-gray-200 text-center text-body whitespace-nowrap">
                                                    {invoiceDueVal}
                                                </td>
                                                <td className="px-3 py-2 border-r border-gray-200 text-center text-body">
                                                    {paymentStatus ? (
                                                        <span className={`inline-block px-2 py-0.5 text-caption font-bold uppercase rounded-sm ${paymentStatus.toLowerCase().includes("paid")
                                                            ? "bg-green-50 text-green-700 border border-green-200"
                                                            : "bg-warningBgPale text-warningBadge border border-warningBgSoft"
                                                            }`}>
                                                            {paymentStatus}
                                                        </span>
                                                    ) : (
                                                        <span className="text-black/40">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile cards */}
                        <div className="md:hidden space-y-3">
                            {attachments.map((attachment: any, idx: number) => {
                                const attId = attachment.id || attachment.attachment_id || String(idx);
                                const isOpening = openingFileId === String(attId);
                                const orderDisplay = attachment.order_increment_id || attachment.order_id || "-";
                                const fileName = attachment.file_name || attachment.label || t("m.download");
                                const docTypeLabel = getDocTypeLabel(fileName, attachment.comment || attachment.document_type || attachment.upload_for || "");
                                const createdAt = formatDate(attachment.created_at || attachment.upload_date);
                                const invoiceDueVal = attachment.invoice_due ? formatDate(attachment.invoice_due) : "";
                                const paymentStatus = attachment.payment || attachment.payment_status || "";

                                return (
                                    <div key={attId} className="border border-[#ddd] bg-white p-4 rounded-sm space-y-2">
                                        <div className="flex items-start justify-between gap-3">
                                            <button
                                                onClick={() => handleViewFile({ ...attachment, attachment_id: attId })}
                                                disabled={isOpening}
                                                className={`text-body font-bold text-primary hover:underline ltr:text-left rtl:text-right break-all ${isOpening ? "opacity-50" : ""}`}
                                            >
                                                {fileName}
                                            </button>
                                            {paymentStatus && (
                                                <span className={`flex-shrink-0 px-2 py-0.5 text-caption font-bold uppercase rounded-sm ${paymentStatus.toLowerCase().includes("paid")
                                                    ? "bg-green-50 text-green-700 border border-green-200"
                                                    : "bg-warningBgPale text-warningBadge border border-warningBgSoft"
                                                    }`}>
                                                    {paymentStatus}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-caption text-black/60 uppercase tracking-wide">{docTypeLabel}</p>
                                        <div className="border-t border-[#ddd] pt-2 space-y-1">
                                            <div className="flex justify-between text-body-sm">
                                                <span className="font-bold text-black">{t("orderAttachments.order") || "Order:"}</span>
                                                <button onClick={() => handleViewOrder(String(attachment.order_id))} className="text-primary hover:underline font-medium">{orderDisplay}</button>
                                            </div>
                                            <div className="flex justify-between text-body-sm">
                                                <span className="text-black/60">{t("orderAttachments.createdOn") || "Created On"}:</span>
                                                <span className="text-black">{createdAt}</span>
                                            </div>
                                            {invoiceDueVal && (
                                                <div className="flex justify-between text-body-sm">
                                                    <span className="text-black/60">{t("orderAttachments.due") || "Due"}:</span>
                                                    <span className="text-black">{invoiceDueVal}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {totalItems > 0 && (
                            <div className="mt-6">
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    totalItems={totalItems}
                                    pageSize={pageSize}
                                    onPageChange={(p) => setCurrentPage(p)}
                                    onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
                                />
                            </div>
                        )}
                    </>
                ) : (
                    <div className="border border-[#ddd] p-12 text-center bg-white rounded-sm">
                        <p className="text-black/50 italic text-body-sm">{t("orderAttachments.noRecords")}</p>
                    </div>
                )}
            </main>
        </div>
    );
}

// ─── SALES PERSON view ───────────────────────────────────────────────────────
// 2-row filters · 8-column table with Company, Company Code, Invoice Due, Payment
// Blue table header · black Search/Reset buttons

function SalesPersonOrderAttachments() {
    const { data: session, status: authStatus } = useSession();
    const router = useRouter();
    const { t, isRtl } = useTranslation();
    const lp = useLocalePath();

    const [searchText, setSearchText] = useState("");
    const [searchOrderId, setSearchOrderId] = useState("");
    const [localCompanyCode, setLocalCompanyCode] = useState("");
    const [companyCodeSearch, setCompanyCodeSearch] = useState("");
    const [company, setCompany] = useState("All");
    const [documentType, setDocumentType] = useState("All");
    const [invoiceDue, setInvoiceDue] = useState("All");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [openingFileId, setOpeningFileId] = useState<string | null>(null);

    useEffect(() => {
        if (authStatus === "unauthenticated") redirectToLogin(router);
    }, [authStatus, router]);

    const token = (session as any)?.accessToken;

    const queryParams = new URLSearchParams();
    if (searchOrderId) queryParams.append("order_id", searchOrderId);
    if (documentType !== "All") queryParams.append("document_type", documentType);
    if (invoiceDue !== "All") queryParams.append("invoice_due", invoiceDue);
    if (company !== "All") queryParams.append("company", company);
    if (companyCodeSearch) queryParams.append("company_code", companyCodeSearch);
    queryParams.append("pageSize", pageSize.toString());
    queryParams.append("currentPage", currentPage.toString());

    const apiUrl = token
        ? `/api/kleverapi/order-attachments/search?${queryParams.toString()}`
        : null;

    const { data, error, isLoading, mutate } = useSWR(
        apiUrl ? [apiUrl, token] : null,
        ([url, tk]) => fetcher(url, tk)
    );

    const { data: filterOptionsData } = useSWR(
        token ? ["/api/kleverapi/order-attachments/filter-options", token] : null,
        ([url, tk]) => fetcher(url, tk)
    );

    const translateLabel = (label: string) => {
        const key = `data.${label}`;
        const translated = t(key);
        return translated !== key ? translated : label;
    };

    const buildOptions = (raw: any[]) => {
        const allOpt = { label: t("m.all") || "All", value: "All" };
        if (!raw || raw.length === 0) return [allOpt];
        const normalized = normalizeOptions(raw);
        const hasAll = normalized.some(o => o.value.toLowerCase() === "all");
        const localized = normalized.map(o => {
            const isAll = o.value.toLowerCase() === "all";
            return { ...o, label: isAll ? (t("m.all") || "All") : translateLabel(o.label) };
        });
        return hasAll ? localized : [allOpt, ...localized];
    };

    const finalDocTypes = buildOptions(filterOptionsData?.document_types || filterOptionsData?.document_type_options || []);
    const finalInvoiceDues = buildOptions(filterOptionsData?.invoice_due_options || filterOptionsData?.invoice_due || []);
    const finalCompanyOptions = buildOptions(filterOptionsData?.company_options || []);

    const handleSearch = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setSearchOrderId(searchText);
        setCompanyCodeSearch(localCompanyCode);
        setCurrentPage(1);
    };

    const handleReset = () => {
        setSearchText("");
        setSearchOrderId("");
        setLocalCompanyCode("");
        setCompanyCodeSearch("");
        setCompany("All");
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
        setOpeningFileId(String(id));
        try {
            const qs = new URLSearchParams();
            if (fileUrl) qs.set("url", fileUrl);
            if (fileName) qs.set("name", fileName);
            const proxyUrl = `/api/kleverapi/order-attachments/file/${id}${qs.toString() ? `?${qs.toString()}` : ""}`;
            const res = await fetch(proxyUrl, { headers: { Authorization: `Bearer ${token}` } });
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
            const ext = fileName.split(".").pop()?.toLowerCase() || "";
            if (!["pdf", "jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
                link.download = fileName;
            }
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => window.URL.revokeObjectURL(url), 5000);
        } catch (err: any) {
            console.error("View File Error:", err);
            toast.error(err.message || t("common.error"));
        } finally {
            setOpeningFileId(null);
        }
    };

    const attachments = Array.isArray(data) ? data : data?.items || data?.attachments || [];
    const totalItems = data?.total_count || attachments.length;
    const totalPages = Math.ceil(totalItems / pageSize);

    const inputCls = "h-[34px] w-full border border-gray-300 bg-white px-3 text-[12px] text-black placeholder-gray-400 focus:outline-none focus:border-gray-500";
    const blackBtnCls = "h-[34px] px-6 bg-black hover:bg-gray-800 text-white text-[11px] font-bold uppercase tracking-widest transition-colors whitespace-nowrap";
    const dropdownBtnCls = "w-full h-[34px] bg-white text-black border border-gray-300 px-3 text-[12px] ltr:text-left rtl:text-right flex items-center justify-between cursor-pointer focus:outline-none focus:border-gray-500";

    return (
        <div className="flex flex-col lg:flex-row flex-1 min-h-0 w-full bg-[#f5f5f5]">
            <Sidebar />

            <main
                className="flex-1 w-full px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-5 bg-[#f5f5f5] min-w-0"
                dir={isRtl ? "rtl" : "ltr"}
            >
                <h1 className="text-[22px] font-semibold text-black mb-4 uppercase">
                    {t("orderAttachments.title")}
                </h1>

                {/* Filters */}
                <form onSubmit={handleSearch} className="mb-4">
                    {/* Row 1: Search Order + Search by Company Code + Search */}
                    <div className="flex flex-col sm:flex-row gap-2 mb-2">
                        <input
                            type="text"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            placeholder={t("orderAttachments.searchOrder") || "Search Order"}
                            className={inputCls}
                            suppressHydrationWarning
                        />
                        <input
                            type="text"
                            value={localCompanyCode}
                            onChange={(e) => setLocalCompanyCode(e.target.value)}
                            placeholder={t("orderAttachments.searchCompanyCode") || "Search by Company Code"}
                            className={inputCls}
                            suppressHydrationWarning
                        />
                        <button type="submit" className={blackBtnCls} suppressHydrationWarning>
                            {t("m.search") || "Search"}
                        </button>
                    </div>

                    {/* Row 2: Company + Document + Invoice Due + Reset */}
                    <div className="flex flex-col sm:flex-row gap-2 items-end">
                        <div className="w-full sm:w-[180px]">
                            <PortalDropdown
                                value={company}
                                onChange={(val) => { setCompany(val); setCurrentPage(1); }}
                                options={finalCompanyOptions}
                                buttonClassName={dropdownBtnCls}
                                placeholder={t("orders.company") || "Company"}
                            />
                        </div>
                        <div className="w-full sm:w-[180px]">
                            <PortalDropdown
                                value={documentType}
                                onChange={(val) => { setDocumentType(val); setCurrentPage(1); }}
                                options={finalDocTypes}
                                buttonClassName={dropdownBtnCls}
                                placeholder={t("m.document-type") || "Document"}
                            />
                        </div>
                        <div className="w-full sm:w-[180px]">
                            <PortalDropdown
                                value={invoiceDue}
                                onChange={(val) => { setInvoiceDue(val); setCurrentPage(1); }}
                                options={finalInvoiceDues}
                                buttonClassName={dropdownBtnCls}
                                placeholder={t("m.invoice-due") || "Invoice Due"}
                            />
                        </div>
                        <button type="button" onClick={handleReset} className={blackBtnCls} suppressHydrationWarning>
                            {t("m.reset") || "Reset"}
                        </button>
                    </div>
                </form>

                {/* Content */}
                {error ? (
                    <div className="bg-red-50 border border-red-200 text-red-600 p-6 text-center">
                        <p className="font-bold text-xs uppercase mb-2">{t("common.error")}</p>
                        <p className="text-xs mb-4">{error.message}</p>
                        <button onClick={() => mutate()} className="px-8 py-2 bg-red-600 text-white text-xs font-bold uppercase tracking-widest">
                            {t("common.tryAgain")}
                        </button>
                    </div>
                ) : isLoading ? (
                    <OrdersTableSkeleton rows={6} />
                ) : attachments.length > 0 ? (
                    <>
                        {/* Desktop table */}
                        <div className="hidden md:block overflow-x-auto w-full">
                            <table className="w-full border-collapse bg-white border border-[#ccc]" style={{ minWidth: 900 }}>
                                <thead>
                                    <tr style={{ backgroundColor: "#1979c3" }}>
                                        {[
                                            { key: "orders.orderId", fallback: "Order #", center: true },
                                            { key: "m.file-name", fallback: "File Name", center: false },
                                            { key: "orders.company", fallback: "Company", center: true },
                                            { key: "orders.companyCode", fallback: "Company Code", center: true },
                                            { key: "m.document-type", fallback: "Document Type", center: true },
                                            { key: "m.created-at", fallback: "Created On", center: true },
                                            { key: "m.invoice-due", fallback: "Invoice Due", center: true },
                                            { key: "m.payment", fallback: "Payment", center: true },
                                        ].map((col) => (
                                            <th
                                                key={col.key}
                                                className={`px-3 py-2 border border-[#1565a8] text-white text-[11px] font-bold uppercase tracking-wide whitespace-nowrap ${col.center ? "text-center" : "ltr:text-left rtl:text-right"}`}
                                            >
                                                {t(col.key) || col.fallback}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {attachments.map((attachment: any, idx: number) => {
                                        const attId = attachment.id || attachment.attachment_id || String(idx);
                                        const isOpening = openingFileId === String(attId);
                                        const orderDisplay = attachment.order_increment_id || attachment.order_id || "-";
                                        const fileName = attachment.file_name || attachment.label || t("m.download");
                                        const docTypeLabel = getDocTypeLabel(fileName, attachment.comment || attachment.document_type || attachment.upload_for || attachment.attachment_type || "");
                                        const createdAt = formatDate(attachment.created_at || attachment.upload_date);
                                        const invoiceDueVal = attachment.invoice_due ? formatDate(attachment.invoice_due) : "-";
                                        const paymentStatus = attachment.payment || attachment.payment_status || "";
                                        const companyName = attachment.company_name || attachment.company || "-";
                                        const companyCode = attachment.company_code || "-";
                                        const rowBg = idx % 2 === 0 ? "#ffffff" : "#f5f9ff";

                                        return (
                                            <tr
                                                key={attId}
                                                style={{ backgroundColor: rowBg }}
                                                className="border-b border-[#ddd]"
                                            >
                                                <td className="px-3 py-2 border-r border-[#ddd] text-center text-[12px]">
                                                    <button
                                                        onClick={() => handleViewOrder(String(attachment.order_id))}
                                                        className="text-[#1979c3] hover:underline font-medium focus:outline-none"
                                                    >
                                                        {orderDisplay}
                                                    </button>
                                                </td>
                                                <td className="px-3 py-2 border-r border-[#ddd] text-[12px] max-w-[220px]">
                                                    <button
                                                        onClick={() => handleViewFile({ ...attachment, attachment_id: attId })}
                                                        disabled={isOpening}
                                                        className={`text-[#1979c3] hover:underline ltr:text-left rtl:text-right break-words focus:outline-none ${isOpening ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                                                    >
                                                        {fileName}
                                                    </button>
                                                </td>
                                                <td className="px-3 py-2 border-r border-[#ddd] text-center text-[12px] text-black">{companyName}</td>
                                                <td className="px-3 py-2 border-r border-[#ddd] text-center text-[12px] text-black">{companyCode}</td>
                                                <td className="px-3 py-2 border-r border-[#ddd] text-center text-[12px] text-black uppercase font-medium">
                                                    {t(`data.${docTypeLabel}`) !== `data.${docTypeLabel}` ? t(`data.${docTypeLabel}`) : docTypeLabel}
                                                </td>
                                                <td className="px-3 py-2 border-r border-[#ddd] text-center text-[12px] text-black whitespace-nowrap">{createdAt}</td>
                                                <td className="px-3 py-2 border-r border-[#ddd] text-center text-[12px] text-black whitespace-nowrap">{invoiceDueVal}</td>
                                                <td className="px-3 py-2 border-r border-[#ddd] text-center text-[12px]">
                                                    {paymentStatus ? (
                                                        <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase rounded-sm ${paymentStatus.toLowerCase().includes("paid")
                                                            ? "bg-green-100 text-green-700"
                                                            : "bg-yellow-100 text-yellow-700"
                                                            }`}>
                                                            {t(`data.${paymentStatus}`) !== `data.${paymentStatus}` ? t(`data.${paymentStatus}`) : paymentStatus}
                                                        </span>
                                                    ) : (
                                                        <span className="text-black/40">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile cards */}
                        <div className="md:hidden space-y-3">
                            {attachments.map((attachment: any, idx: number) => {
                                const attId = attachment.id || attachment.attachment_id || String(idx);
                                const isOpening = openingFileId === String(attId);
                                const orderDisplay = attachment.order_increment_id || attachment.order_id || "-";
                                const fileName = attachment.file_name || attachment.label || t("m.download");
                                const docTypeLabel = getDocTypeLabel(fileName, attachment.comment || attachment.document_type || attachment.upload_for || "");
                                const createdAt = formatDate(attachment.created_at || attachment.upload_date);
                                const invoiceDueVal = attachment.invoice_due ? formatDate(attachment.invoice_due) : "";
                                const paymentStatus = attachment.payment || attachment.payment_status || "";
                                const companyName = attachment.company_name || attachment.company || "";
                                const companyCode = attachment.company_code || "";

                                return (
                                    <div key={attId} className="border border-[#ccc] bg-white p-4 space-y-2">
                                        <div className="flex items-start justify-between gap-3">
                                            <button
                                                onClick={() => handleViewFile({ ...attachment, attachment_id: attId })}
                                                disabled={isOpening}
                                                className={`text-[12px] font-bold text-[#1979c3] hover:underline ltr:text-left rtl:text-right break-all ${isOpening ? "opacity-50" : ""}`}
                                            >
                                                {fileName}
                                            </button>
                                            {paymentStatus && (
                                                <span className={`flex-shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase rounded-sm ${paymentStatus.toLowerCase().includes("paid") ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                                                    }`}>
                                                    {t(`data.${paymentStatus}`) !== `data.${paymentStatus}` ? t(`data.${paymentStatus}`) : paymentStatus}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-black/60 uppercase tracking-wide">{docTypeLabel}</p>
                                        <div className="border-t border-[#ddd] pt-2 space-y-1">
                                            <div className="flex justify-between text-[12px]">
                                                <span className="font-bold text-black">{t("m.order") || "Order"}:</span>
                                                <button onClick={() => handleViewOrder(String(attachment.order_id))} className="text-[#1979c3] hover:underline font-medium">{orderDisplay}</button>
                                            </div>
                                            {companyName && <div className="flex justify-between text-[12px]"><span className="text-black/60">{t("orders.company") || "Company"}:</span><span className="text-black">{companyName}</span></div>}
                                            {companyCode && <div className="flex justify-between text-[12px]"><span className="text-black/60">{t("orders.companyCode") || "Code"}:</span><span className="text-black">{companyCode}</span></div>}
                                            <div className="flex justify-between text-[12px]"><span className="text-black/60">{t("m.created-at") || "Created"}:</span><span className="text-black">{createdAt}</span></div>
                                            {invoiceDueVal && <div className="flex justify-between text-[12px]"><span className="text-black/60">{t("m.invoice-due") || "Invoice Due"}:</span><span className="text-black">{invoiceDueVal}</span></div>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {totalItems > 0 && (
                            <div className="mt-6">
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    totalItems={totalItems}
                                    pageSize={pageSize}
                                    onPageChange={(p) => setCurrentPage(p)}
                                    onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
                                />
                            </div>
                        )}
                    </>
                ) : (
                    <div className="border border-[#ccc] p-12 text-center bg-white">
                        <p className="text-black/50 italic text-xs uppercase tracking-widest">{t("orderAttachments.noRecords")}</p>
                    </div>
                )}
            </main>
        </div>
    );
}
