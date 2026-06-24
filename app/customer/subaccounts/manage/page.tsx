"use client";
import { useTranslation } from "@/hooks/useTranslation";
import { useLocalePath } from "@/hooks/useLocalePath";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { useSession } from "next-auth/react";
import Sidebar from "@/components/Sidebar";
import { redirectToLogin } from "@/utils/helpers";
import { ManageAccountsSkeleton } from "@/components/skeletons";

type SubAccount = {
    entity_id: number | string;
    firstname: string;
    lastname: string;
    email: string;
    is_active?: boolean | number | string;
    [key: string]: any;
};

export default function ManageSubAccountsPage() {
    const router = useRouter();
    const { t } = useTranslation();
    const lp = useLocalePath();
    const { data: session, status } = useSession();
    const token = useSelector((state: RootState) => state.auth.token);

    const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [loggingInId, setLoggingInId] = useState<string | number | null>(null);

    useEffect(() => {
        if (status === "unauthenticated") {
            redirectToLogin(router);
            return;
        }

        // Permission check: sub-accounts cannot manage other accounts
        if (typeof window !== "undefined") {
            const isSub = localStorage.getItem("isSubAccount") === "true";
            if (isSub) {
                router.replace(lp("/my-account"));
            }
        }
    }, [status, router, lp]);

    const fetchSubAccounts = async () => {
        if (!token) return;
        try {
            setLoading(true);
            const res = await fetch("/api/kleverapi/subaccounts", {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.message || t("common.failed"));
                return;
            }

            // Handle both array response and object with items
            const accounts = Array.isArray(data) ? data : data.items || data.data || [];
            setSubAccounts(accounts);
            setError(null);
        } catch (err: any) {
            setError(err.message || t("common.failed"));
        } finally {
            setLoading(false);
        }
    };

    // Fetch sub-accounts list
    useEffect(() => {
        fetchSubAccounts();
    }, [token]);

    // Login as sub-account
    const handleLoginAsSubAccount = async (subAccount: SubAccount) => {
        if (!token) return;

        // Log raw data so we can see exactly which fields the API returns
        console.log("[SubAccount] raw account object:", JSON.stringify(subAccount));

        // Try every common ID field name the Klever API might use
        const subAccountId =
            subAccount.sub_account_id ??
            subAccount.klever_id ??
            subAccount.entity_id ??
            subAccount.id ??
            subAccount.customer_id ?? null;

        console.log("[SubAccount] resolved id:", subAccountId);

        if (!subAccountId) {
            alert(t("common.error"));
            return;
        }
        setLoggingInId(subAccountId);

        try {
            const res = await fetch(`/api/kleverapi/subaccounts/${subAccountId}/login`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.message || t("common.failed"));
                setLoggingInId(null);
                return;
            }

            // Extract the sub-account token from various possible response shapes
            const subToken: string | null =
                typeof data === "string" ? data
                    : data?.token || data?.access_token || data?.customer_token || data?.customerToken || null;

            if (!subToken) {
                setError(t("common.failed"));
                setLoggingInId(null);
                return;
            }

            // Store the sub-account token so api-client uses it for all subsequent calls
            localStorage.setItem("subAccountToken", subToken);
            localStorage.setItem("isSubAccount", "true");
            localStorage.setItem("subAccountName", `${subAccount.firstname} ${subAccount.lastname}`);
            localStorage.setItem("subAccountId", String(subAccountId));

            // Redirect to my-account as the sub-account
            router.push(lp("/my-account"));
        } catch (err: any) {
            setError(err.message || t("common.failed"));
            setLoggingInId(null);
        }
    };

    // Magento returns is_active as true/false or 1/0.
    // Only treat explicit falsy values as inactive; default to active when field is
    // missing or unknown so Magento's own check is the source of truth.
    const isAccountActive = (account: SubAccount): boolean => {
        const v = account.is_active;
        return v === true || String(v) === "1" || String(v) === "true";
    };

    if (loading) {
        return (
            <div className="flex flex-col w-full bg-white">
                <div className="flex flex-col lg:flex-row flex-1 w-full">
                    <Sidebar />
                    <ManageAccountsSkeleton rows={5} />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full bg-white font-rubik">
            <div className="flex flex-col lg:flex-row flex-1 w-full">
                <Sidebar />

                <main className="flex-1 w-full px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-5 bg-white">
                    {error && (
                        <div className="bg-red-50 border border-red-100 text-red-700 p-4 mb-6 rounded-md" role="alert">
                            <p className="text-xs font-bold uppercase mb-1">{t("common.error")}</p>
                            <p className="text-xs">{error}</p>
                        </div>
                    )}

                    {subAccounts.length === 0 && !error ? (
                        <div className="bg-[#fff9e6] border border-[#ffe58f] p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top duration-300">
                            <span className="text-[#faad14] text-lg">⚠</span>
                            <p className="text-[13px] font-medium text-black/80">
                                {t("subaccounts.noSubaccounts") || "There are not subaccounts to display."}
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Header Action Bar */}
                            <div className="flex justify-between items-center mb-5">
                                <h1 className="text-h3 md:text-[26px] font-bold text-black uppercase tracking-wide">
                                    {t("subaccounts.title") || "MANAGE SUB-ACCOUNTS"}
                                </h1>
                            </div>
                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-3">
                                {subAccounts.map((account, idx) => {
                                    const accountId = account.entity_id || account.id || account.customer_id || account.sub_account_id;
                                    const active = isAccountActive(account);
                                    return (
                                        <div key={accountId || idx} className="bg-white border border-[#ddd] rounded-sm p-4">
                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                <div className="min-w-0">
                                                    <p className="text-[13px] font-bold text-black uppercase">
                                                        {account.firstname || account.name || "N/A"} {account.lastname || ""}
                                                    </p>
                                                    <p className="text-[12px] text-gray-500 font-medium mt-1 break-all">
                                                        {account.email || "N/A"}
                                                    </p>
                                                </div>
                                                <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md flex-shrink-0 ${active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                                    {active ? t("m.active") : t("m.inactive")}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => handleLoginAsSubAccount(account)}
                                                disabled={!active || loggingInId === accountId}
                                                className={`w-full text-[11px] font-bold px-4 py-2.5 uppercase tracking-widest transition-all rounded-md shadow-sm active:scale-95 ${active ? "bg-primary hover:bg-primaryHover text-white disabled:opacity-50" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
                                            >
                                                {loggingInId === accountId ? t("common.loading") : t("m.sign-in")}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Desktop Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-body text-left border-collapse border border-[#ddd]">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr className="bg-primary text-label uppercase font-bold tracking-widest">
                                            <th className="px-2 xl:px-4 py-2 border border-warning/30">{t("m.name")}</th>
                                            <th className="px-2 xl:px-4 py-2 border border-warning/30">{t("m.email")}</th>
                                            <th className="px-2 xl:px-4 py-2 border border-warning/30">{t("m.status")}</th>
                                            <th className="px-2 xl:px-4 py-2 border border-warning/30 text-center">{t("m.action")}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {subAccounts.map((account, idx) => {
                                            const accountId = account.entity_id || account.id || account.customer_id || account.sub_account_id;
                                            const active = isAccountActive(account);
                                            return (
                                                <tr key={accountId || idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b border-gray-200 hover:bg-yellow-50/30 transition-colors`}>
                                                    <td className="px-2 xl:px-4 py-1.5 border-r border-gray-200 text-xs font-bold text-black uppercase">
                                                        {account.firstname || account.name || "N/A"} {account.lastname || ""}
                                                    </td>
                                                    <td className="px-2 xl:px-4 py-1.5 border-r border-gray-200 text-sm font-medium text-gray-600">
                                                        {account.email || "N/A"}
                                                    </td>
                                                    <td className="px-2 xl:px-4 py-1.5 border-r border-gray-200 text-xs">
                                                        <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md ${active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                                            {active ? t("m.active") : t("m.inactive")}
                                                        </span>
                                                    </td>
                                                    <td className="px-2 xl:px-4 py-1.5 border-r border-gray-200 text-center">
                                                        <button
                                                            onClick={() => handleLoginAsSubAccount(account)}
                                                            disabled={!active || loggingInId === accountId}
                                                            className={`text-[10px] font-bold px-4 py-2 uppercase tracking-widest transition-all rounded-sm ${active ? "bg-primary hover:bg-black text-white disabled:opacity-50" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
                                                        >
                                                            {loggingInId === accountId ? t("common.loading") : t("m.login")}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}
