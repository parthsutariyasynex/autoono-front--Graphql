"use client";

import React, { useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import PortalDropdown from "@/components/PortalDropdown";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { redirectToLogin } from "@/utils/helpers";
import { useTranslation } from "@/hooks/useTranslation";
import { StatementSkeleton } from "@/components/skeletons";
import { getClientStoreCode } from "@/lib/api/api-client";

export default function MyStatementPage() {
    const { data: session, status: authStatus } = useSession();
    const router = useRouter();
    const { t } = useTranslation();

    const today = new Date().toISOString().split('T')[0];
    const currentYear = new Date().getFullYear();
    const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
    const [endDate, setEndDate] = useState(today);
    const [statementType, setStatementType] = useState("account_statement");
    const [rawStatementTypes, setRawStatementTypes] = useState<{ value: string; rawLabel: string }[]>([]);

    // Translate labels at render time so they update when locale changes without refetch.
    const statementTypes = useMemo(
        () => rawStatementTypes.map(({ value, rawLabel }) => {
            const key = `data.${rawLabel}`;
            const translated = t(key);
            return { value, label: translated !== key ? translated : rawLabel };
        }),
        [rawStatementTypes, t]
    );

    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch Statement Types
    React.useEffect(() => {
        const fetchTypes = async () => {
            const token = (session as any)?.accessToken;
            if (!token) return;

            try {
                const storeCode = getClientStoreCode();
                const res = await fetch("/api/kleverapi/my-statement/types", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        ...(storeCode ? { "x-store-code": storeCode } : {}),
                    },
                });
                if (res.ok) {
                    const data = await res.json();

                    // Standardize response structure: handle [ {k:v}, ... ] or { types: [...] }
                    const rawTypes = Array.isArray(data) ? data : (data.types || []);
                    const mapped = rawTypes.map((item: any) => ({
                        value: item.value || item.code || item.id || item,
                        rawLabel: item.label || item.name || item.type_name || item.value || item,
                    }));

                    if (mapped.length > 0) {
                        setRawStatementTypes(mapped);
                        // Optional: select first by default if not already set or current is invalid
                        if (!mapped.find((m: { value: string; rawLabel: string }) => m.value === statementType)) {
                            setStatementType(mapped[0].value);
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to fetch statement types:", err);
            }
        };

        if (authStatus === "authenticated") {
            fetchTypes();
        }
    }, [authStatus, session]);

    // Auth Guard
    if (authStatus === "unauthenticated") {
        redirectToLogin(router);
        return null;
    }

    if (authStatus === "loading") {
        return (
            <div className="flex flex-col lg:flex-row flex-1 min-h-0 w-full bg-[#fcfcfc]">
                <Sidebar />
                <StatementSkeleton />
            </div>
        );
    }

    const handleGetStatement = async () => {
        const token = (session as any)?.accessToken;
        if (!token) {
            toast.error(t("orders.mustLoggedIn"));
            return;
        }

        setIsDownloading(true);
        setError(null);
        // toast.loading("Download Started...", { id: "statement-download" });

        try {
            const queryParams = new URLSearchParams({
                fromDate: startDate,
                toDate: endDate,
                type: statementType,
            });

            const storeCode = getClientStoreCode();
            const response = await fetch(`/api/kleverapi/my-statement?${queryParams.toString()}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    ...(storeCode ? { "x-store-code": storeCode } : {}),
                },
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({ message: "Failed to download statement" }));
                let msg = data.message || "Something went wrong. Please try again.";
                // Substitute Magento positional placeholders (%1, %2, ...)
                if (data.parameters) {
                    const params = Array.isArray(data.parameters) ? data.parameters : Object.values(data.parameters);
                    params.forEach((p: any, i: number) => { msg = msg.replace(`%${i + 1}`, String(p)); });
                }
                throw new Error(msg);
            }

            const contentType = response.headers.get("content-type");

            if (contentType && contentType.includes("application/pdf")) {
                const blob = await response.blob();

                // --- Proper Download Solve ---
                const fileUrl = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.style.display = "none";
                a.href = fileUrl;
                a.download = `Statement_${startDate}_to_${endDate}.pdf`;

                document.body.appendChild(a);
                a.click();

                // Cleanup
                setTimeout(() => {
                    window.URL.revokeObjectURL(fileUrl);
                    document.body.removeChild(a);
                }, 100);

                toast.success(t("common.success"), { id: "statement-download" });
            } else {
                // Handle JSON fallback (if backend didn't follow the URL)
                const data = await response.json();
                if (data.pdf_url) {
                    const link = document.createElement("a");
                    link.href = data.pdf_url;
                    link.target = "_blank";
                    link.rel = "noopener noreferrer";
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    toast.success(t("common.success"), { id: "statement-download" });
                } else {
                    throw new Error("Invalid response format received from server.");
                }
            }
        } catch (err: any) {
            setError(err.message || "Failed to fetch statement");
            toast.error(err.message || "Download failed", { id: "statement-download" });
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white">


            <div className="flex flex-col lg:flex-row flex-1 min-h-0 w-full">
                {/* Left Sidebar */}
                <Sidebar />

                {/* Right Content */}
                <main className="flex-1 w-full px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-5 bg-surfacePage min-w-0">
                    <h1 className="text-h3 sm:text-h3 md:text-[26px] font-bold text-black mb-5 uppercase tracking-wide">
                        {t("statement.title")}
                    </h1>

                    <div className="max-w-[700px] bg-white border border-gray-200 shadow-sm overflow-hidden">
                        {/* Card Header */}
                        <div className="bg-surfaceMuted px-4 py-3 border-b border-gray-200">
                            <h2 className="text-body-lg font-bold text-black uppercase tracking-wide">
                                {t("m.get-your-statement")}
                            </h2>
                        </div>

                        {/* Card Body */}
                        <div className="p-3 md:p-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-4">
                                {/* Start Date */}
                                <div>
                                    <label className="block text-body font-bold text-black mb-2">
                                        {t("m.start-date")}
                                    </label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full h-[45px] px-4 rounded-sm cursor-pointer border border-gray-200 text-body-lg text-black/80 focus:outline-none focus:border-primary transition-colors"
                                    />
                                </div>

                                {/* End Date */}
                                <div>
                                    <label className="block text-body font-bold text-black mb-2">
                                        {t("m.end-date")}
                                    </label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full h-[45px] px-4 border rounded-sm cursor-pointer border-gray-200 text-body-lg text-black/80 focus:outline-none focus:border-primary transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Statement Type */}
                            {/* <div className="mb-6 md:mb-10">
                                <label className="block text-body font-bold text-black mb-2">
                                    {t("m.type")}
                                </label>
                                <PortalDropdown
                                    value={statementType}
                                    onChange={(val) => setStatementType(val)}
                                    options={statementTypes}
                                    placeholder={statementTypes.length > 0 ? t("m.select") : t("common.loading")}
                                    buttonClassName="w-full h-[45px] px-4 border border-gray-200 text-body-lg text-black/80 focus:outline-none focus:border-primary transition-colors bg-white font-medium shadow-sm flex items-center justify-between cursor-pointer"
                                />
                            </div> */}

                            {/* Download Button */}
                            <div className="flex flex-col gap-4">
                                <button
                                    onClick={handleGetStatement}
                                    disabled={isDownloading}
                                    className={`w-full sm:w-auto bg-primary  text-black px-6 sm:px-10 py-3 md:py-3.5 font-bold text-body-lg uppercase tracking-widest hover:bg-primaryHover transition-all rounded-sm flex items-center justify-center gap-3 ${isDownloading ? 'opacity-70 cursor-not-allowed grayscale' : ''}`}
                                >
                                    {isDownloading ? (
                                        <>

                                            {t("common.loading")}
                                        </>
                                    ) : (
                                        t("m.get-statement")
                                    )}
                                </button>

                                {error && (
                                    <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
                                        <p className="text-body font-bold mb-1">{t("common.error")}</p>
                                        <p className="text-body-sm">{error}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
