"use client";
import { useTranslation } from "@/hooks/useTranslation";
import { ForecastSkeleton } from "@/components/skeletons";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import { fetchCustomerInfo } from "@/store/actions/customerActions";
import Sidebar from "@/components/Sidebar";
import { useSession } from "next-auth/react";
import { redirectToLogin } from "@/utils/helpers";
import PortalDropdown from "@/components/PortalDropdown";
import { useAction } from "@/hooks/useAction";

/**
 * Proper data structures for the Forecast API
 */
interface ForecastFile {
    forecast_id?: string | number;
    file_name?: string;
    filename?: string;
    name?: string;
    file_url?: string;
    uploaded_date?: string;
    created_at?: string;
    updated_at?: string;
    uploaded_at?: string;
    date?: string;
    entity_id?: string | number;
    file_id?: string | number;
    id?: string | number;
}

interface ForecastResponse {
    items: ForecastFile[];
    total_count: number;
    page_size: number;
    current_page: number;
    total_pages: number;
}

export default function MyForecastPage() {
    const router = useRouter();
    const { t, isRtl } = useTranslation();
    const dispatch = useDispatch<AppDispatch>();
    const { data: session, status } = useSession();
    const { data: customer, loading } = useSelector((state: RootState) => state.customer);
    const token = useSelector((state: RootState) => state.auth.token);

    const [isSubAccountSession, setIsSubAccountSession] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [forecasts, setForecasts] = useState<ForecastFile[]>([]);
    const [loadingForecasts, setLoadingForecasts] = useState(true);
    const { loading: uploading, run: runUpload } = useAction("forecast-upload");

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setIsSubAccountSession(localStorage.getItem("isSubAccount") === "true");
        }
    }, []);

    useEffect(() => {
        if (status === "unauthenticated") {
            redirectToLogin(router);
            return;
        }

        if (status === "authenticated" && token) {
            dispatch(fetchCustomerInfo());
            pullForecasts(currentPage, pageSize);
        }
    }, [status, token, dispatch, router, currentPage, pageSize]);

    const [downloadingId, setDownloadingId] = useState<string | number | null>(null);

    const pullForecasts = async (page: number, size: number) => {
        try {
            setLoadingForecasts(true);
            const response = await fetch(`/api/kleverapi/forecast?pageSize=${size}&currentPage=${page}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data: ForecastResponse = await response.json();
                const items = data.items || (Array.isArray(data) ? data : []);
                const total = data.total_count || items.length;
                setForecasts(items);
                setTotalItems(total);
            }
        } catch (err) {
            console.error("[Forecast List Error]:", err);
        } finally {
            setLoadingForecasts(false);
        }
    };

    const handleDownload = async (file: ForecastFile) => {
        const id = file.forecast_id || file.entity_id || file.id || file.file_id;
        const name = file.file_name || "forecast_file";
        const fileUrl = file.file_url;

        if (!id) {
            console.warn("[Forecast] Missing ID in file object:", file);
            alert(t("forecast.missingId"));
            return;
        }

        try {
            setDownloadingId(id);
            let proxyUrl = `/api/kleverapi/forecast/file/${id}?file_name=${encodeURIComponent(name)}`;

            if (fileUrl) {
                proxyUrl += `&url=${encodeURIComponent(fileUrl)}`;
            }

            const response = await fetch(proxyUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || t("forecast.downloadError"));
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            console.error("[Forecast Download Error]:", err);
            alert(err.message || t("forecast.downloadError"));
        } finally {
            setDownloadingId(null);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            alert(t("forecast.selectFile"));
            return;
        }

        await runUpload(async () => {
            try {
                const formData = new FormData();
                formData.append('file', selectedFile);

                const response = await fetch('/api/kleverapi/forecast', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });

                if (response.ok) {
                    alert(t("forecast.uploadSuccess"));
                    setSelectedFile(null);
                    pullForecasts(currentPage, pageSize);
                } else {
                    alert(t("forecast.uploadFailed"));
                }
            } catch (err) {
                console.error("[Forecast Upload Error]:", err);
                alert(t("forecast.uploadError"));
            }
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const getProperDate = (file: any) => {
        const rawDate = file.uploaded_date || file.created_at || file.uploaded_at ||
            file.date || file.upload_date || file.updated_at ||
            file.creation_time || file.createdDate;

        const locale = 'en-US';
        const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' };

        if (rawDate) {
            try {
                const parsedDate = new Date(rawDate.replace(' ', 'T'));
                if (!isNaN(parsedDate.getTime())) {
                    return parsedDate.toLocaleDateString(locale, options);
                }
                return rawDate;
            } catch (e) {
                return rawDate;
            }
        }

        return new Date().toLocaleDateString(locale, options);
    };

    if (loading || loadingForecasts) {
        return (
            <div className="flex flex-col lg:flex-row flex-1 min-h-0 w-full bg-[#fcfcfc]">
                <Sidebar />
                <ForecastSkeleton />
            </div>
        );
    }

    if (!customer) return null;

    return (
        <div className="flex flex-col lg:flex-row flex-1 min-h-0 w-full bg-[#fcfcfc]">
            <Sidebar />

            <main className="flex-1 w-full px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-5 bg-surfacePage min-w-0" dir={isRtl ? "rtl" : "ltr"}>
                {/* Header with Refresh */}
                <div className="flex justify-between items-center mb-5">
                    <h1 className="text-h3 md:text-[26px] font-bold text-black uppercase tracking-wide">
                        {t("forecast.title")}
                    </h1>
                    <button
                        onClick={() => pullForecasts(currentPage, pageSize)}
                        className="bg-white border border-gray-200 text-label md:text-body-sm font-bold px-3 md:px-4 py-1.5 uppercase hover:bg-gray-100 transition-all shadow-sm flex items-center gap-2"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></svg>
                        {t("forecast.refresh")}
                    </button>
                </div>

                {/* Section: Upload */}
                <h2 className="text-body md:text-[15px] font-bold text-black mb-3 md:mb-4 uppercase tracking-tighter">
                    {t("forecast.uploadForecast")}
                </h2>

                <div className="bg-white border border-gray-200 rounded-sm mb-8 md:mb-12 shadow-sm overflow-hidden">
                    <div className="p-4 md:p-8">
                        <div className="border-2 border-dashed border-gray-200 rounded-sm bg-surfaceDp px-4 md:px-6 py-6 md:py-8 flex flex-col items-center gap-4 md:gap-6">
                            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                                <span className="text-body md:text-body-lg font-medium text-black">{t("forecast.dropFiles")}</span>
                                <input
                                    type="file"
                                    id="file-upload"
                                    className="hidden"
                                    accept=".jpg,.jpeg,.gif,.png,.pdf,.docx,.doc,.xls,.xlsx"
                                    onChange={handleFileChange}
                                />
                                <label
                                    htmlFor="file-upload"
                                    className="bg-surfaceSoft border border-gray-400 px-4 py-1.5 text-body-sm md:text-body font-medium text-black cursor-pointer hover:bg-gray-200 transition-colors rounded-[2px]"
                                >
                                    {t("forecast.chooseFile")}
                                </label>
                            </div>
                            {selectedFile && (
                                <span className="text-body-sm md:text-body text-black font-medium truncate max-w-full">
                                    {selectedFile.name}
                                </span>
                            )}
                            <div className="text-center">
                                <span className="text-label md:text-body-lg font-medium text-black/70 leading-relaxed">
                                    {t("forecast.allowedFileTypes")}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className={`bg-white px-4 md:px-8 pb-4 md:pb-8 flex justify-center ${isRtl ? 'md:justify-start' : 'md:justify-end'}`}>
                        <button
                            onClick={handleUpload}
                            disabled={uploading}
                            className="w-full sm:w-auto bg-warningAmber text-black text-body-sm md:text-body font-bold px-8 md:px-12 py-2.5 md:py-2.5 uppercase tracking-wider hover:bg-black hover:text-white transition-all shadow-sm disabled:opacity-50"
                        >
                            {uploading ? t("forecast.uploading") : t("forecast.submit")}
                        </button>
                    </div>
                </div>

                {/* Desktop Table Header */}
                <div className="hidden sm:grid grid-cols-2 bg-surfacePage border border-gray-200 py-3 md:py-4 mb-2">
                    <span className="text-body-sm md:text-body font-bold text-black px-4 md:px-6 ltr:text-left rtl:text-right">{t("forecast.fileName")}</span>
                    <span className={`text-body-sm md:text-body font-bold text-black text-center ${isRtl ? 'border-r' : 'border-l'} border-gray-200`}>{t("forecast.uploadedDate")}</span>
                </div>

                {/* Mobile Header */}
                <div className="sm:hidden bg-surfacePage border border-gray-200 py-3 mb-2 px-4">
                    <span className="text-body-sm font-bold text-black">{t("forecast.files")}</span>
                </div>

                {/* Files List */}
                <div className="bg-white border border-gray-200 border-t-0 rounded-sm overflow-hidden">
                    {forecasts.length > 0 ? forecasts.map((file, idx) => {
                        const fileId = file.forecast_id || file.entity_id || file.id || file.file_id;
                        return (
                            <div key={fileId || idx} className="border-b border-gray-50 hover:bg-primary/5 transition-colors group">
                                {/* Mobile layout */}
                                <div className="sm:hidden px-4 py-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <button
                                            onClick={() => handleDownload(file)}
                                            disabled={downloadingId !== null && downloadingId === fileId}
                                            className="text-body text-black/80 font-medium group-hover:text-primaryHover hover:underline ltr:text-left rtl:text-right disabled:opacity-50 break-all"
                                        >
                                            {file.file_name || file.filename || file.name || t("m.name")}
                                        </button>
                                    </div>
                                    <span className="text-label text-black/50 font-medium mt-1 block">
                                        {getProperDate(file)}
                                    </span>
                                </div>
                                {/* Desktop layout */}
                                <div className="hidden sm:grid grid-cols-2 py-3 md:py-4">
                                    <div className="flex items-center gap-3 px-4 md:px-6">
                                        <button
                                            onClick={() => handleDownload(file)}
                                            disabled={downloadingId !== null && downloadingId === fileId}
                                            className="text-body text-black/80 font-medium group-hover:text-primaryHover hover:underline ltr:text-left rtl:text-right disabled:opacity-50"
                                        >
                                            {file.file_name || file.filename || file.name || t("m.name")}
                                        </button>
                                    </div>
                                    <span className={`text-body text-black/80 font-medium text-center ${isRtl ? 'border-r' : 'border-l'} border-gray-50`}>
                                        {getProperDate(file)}
                                    </span>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="py-16 md:py-20 text-center text-black/50 text-body md:text-body-lg bg-white">
                            {t("forecast.noRecords")}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                <div className="bg-surfaceDim mt-6 md:mt-10 py-3 md:py-3.5 px-3 md:px-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-black/80 rounded-sm">
                    <div className="flex items-center gap-4 sm:gap-6">
                        <span className="text-label md:text-body-sm font-medium">{totalItems} {t("forecast.items")}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-label md:text-body-sm font-medium">{t("forecast.show")}</span>
                            <PortalDropdown
                                value={String(pageSize)}
                                onChange={(val) => { setPageSize(Number(val)); setCurrentPage(1); }}
                                options={[{ label: "10", value: "10" }, { label: "20", value: "20" }, { label: "50", value: "50" }]}
                                minWidth={55}
                            />
                            <span className="text-label md:text-body-sm font-medium">{t("forecast.perPage")}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-3 sm:px-4 py-1.5 bg-white border border-gray-200 text-label md:text-body-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-all rounded-sm shadow-sm"
                        >
                            {t("forecast.prev")}
                        </button>
                        <span className="text-label md:text-body-sm font-bold text-black text-center uppercase tracking-tight">
                            {t("forecast.page")} {currentPage}
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            disabled={forecasts.length < pageSize}
                            className="px-3 sm:px-4 py-1.5 bg-white border border-gray-200 text-label md:text-body-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-all rounded-sm shadow-sm"
                        >
                            {t("forecast.next")}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
