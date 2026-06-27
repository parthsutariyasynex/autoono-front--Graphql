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
    const [displayedAccounts, setDisplayedAccounts] = useState<SubAccount[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [loggingInId, setLoggingInId] = useState<string | number | null>(null);
    const [isSalesPersonView, setIsSalesPersonView] = useState(false);

    useEffect(() => {
        if (status === "unauthenticated") {
            redirectToLogin(router);
            return;
        }

        if (typeof window !== "undefined") {
            const impersonating = localStorage.getItem("isSubAccount") === "true";
            let userTypeIsSubaccount = false;
            let addressBookVisible = true;
            try {
                const sc = localStorage.getItem("sidebar_cache_v2");
                if (sc) {
                    const parsed = JSON.parse(sc);
                    userTypeIsSubaccount = parsed?.user_type === "subaccount";
                    const abItem = (parsed?.items ?? []).find((i: any) => i.code === "address_book");
                    if (abItem) addressBookVisible = abItem.is_visible !== false;
                }
            } catch { }

            if (impersonating || userTypeIsSubaccount) {
                router.replace(lp("/my-account"));
                return;
            }

            // Sales Person: backend marks address_book as not visible
            setIsSalesPersonView(!addressBookVisible);
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

            const accounts = Array.isArray(data) ? data : data.items || data.data || [];
            setSubAccounts(accounts);
            setDisplayedAccounts(accounts);
            setError(null);
        } catch (err: any) {
            setError(err.message || t("common.failed"));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubAccounts();
    }, [token]);

    const handleSearch = () => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) {
            setDisplayedAccounts(subAccounts);
            return;
        }
        setDisplayedAccounts(
            subAccounts.filter((account) => {
                const code = String(account.customer_id ?? "").toLowerCase();
                const name = `${account.firstname ?? ""} ${account.lastname ?? ""}`.toLowerCase();
                return code.includes(q) || name.includes(q);
            })
        );
    };

    const handleReset = () => {
        setSearchQuery("");
        setDisplayedAccounts(subAccounts);
    };

    const handleLoginAsSubAccount = async (subAccount: SubAccount) => {
        if (!token) return;

        console.log("[SubAccount] raw account object:", JSON.stringify(subAccount));

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

            const subToken: string | null =
                typeof data === "string" ? data
                    : data?.token || data?.access_token || data?.customer_token || data?.customerToken || null;

            if (!subToken) {
                setError(t("common.failed"));
                setLoggingInId(null);
                return;
            }

            localStorage.setItem("subAccountToken", subToken);
            localStorage.setItem("isSubAccount", "true");
            localStorage.setItem("subAccountName", `${subAccount.firstname} ${subAccount.lastname}`);
            localStorage.setItem("subAccountId", String(subAccountId));

            router.push(lp("/my-account"));
        } catch (err: any) {
            setError(err.message || t("common.failed"));
            setLoggingInId(null);
        }
    };

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

    // ─── Sales Person view ────────────────────────────────────────────────────
    if (isSalesPersonView) {
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

                        {/* Reset + Search bar */}
                        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center mb-5">
                            {/* <button
                                onClick={handleReset}
                                className="text-[11px] font-bold px-5 py-2 uppercase tracking-widest bg-gray-200 hover:bg-gray-300 text-black transition-all rounded-sm"
                            >
                                {t("common.reset") || "RESET"}
                            </button> */}
                            <div className="flex flex-1 gap-2 w-full sm:w-auto">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                    placeholder={t("subaccounts.searchPlaceholder") || "Search by Code, Company or Name"}
                                    className="flex-1 border border-[#ddd] px-3 py-2 text-[12px] text-black placeholder-gray-400 outline-none focus:border-primary rounded-sm"
                                />
                                <button
                                    onClick={handleSearch}
                                    className="text-[11px] font-bold px-5 py-2 uppercase tracking-widest bg-primary hover:bg-primaryHover text-black transition-all rounded-sm whitespace-nowrap"
                                >
                                    {t("common.search") || "SEARCH"}
                                </button>
                            </div>
                        </div>

                        <h1 className="text-h3 md:text-[26px] font-bold text-black uppercase tracking-wide mb-5">
                            {t("subaccounts.salesPersonTitle") || "SALES PERSON CUSTOMERS"}
                        </h1>

                        {displayedAccounts.length === 0 && !error ? (
                            <div className="bg-[#fff9e6] border border-[#ffe58f] p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top duration-300">
                                <span className="text-[#faad14] text-lg">⚠</span>
                                <p className="text-[13px] font-medium text-black/80">
                                    {t("subaccounts.noSubaccounts") || "There are not subaccounts to display."}
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Mobile Card View */}
                                <div className="md:hidden space-y-3">
                                    {displayedAccounts.map((account, idx) => {
                                        const accountId = account.entity_id || account.id || account.customer_id || account.sub_account_id;
                                        return (
                                            <div key={accountId || idx} className="bg-white border border-[#ddd] rounded-sm p-4">
                                                <div className="min-w-0 mb-3">
                                                    <p className="text-[11px] text-gray-500 font-medium">{account.customer_id ?? "N/A"}</p>
                                                    <p className="text-[13px] font-bold text-black uppercase">
                                                        {account.firstname || "N/A"} {account.lastname || ""}
                                                    </p>
                                                    <p className="text-[12px] text-gray-500 font-medium mt-1 break-all">{account.email || "N/A"}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleLoginAsSubAccount(account)}
                                                    disabled={loggingInId === accountId}
                                                    className="w-full text-[11px] font-bold px-4 py-2.5 uppercase tracking-widest transition-all rounded-md shadow-sm active:scale-95 bg-primary hover:bg-primaryHover text-white disabled:opacity-50"
                                                >
                                                    {loggingInId === accountId ? t("common.loading") : t("m.login")}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Desktop Table */}
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="w-full text-body text-left border-collapse border border-[#ddd]">
                                        <thead>
                                            <tr className="bg-primary text-label uppercase font-bold tracking-widest">
                                                <th className="px-2 xl:px-4 py-2 border border-warning/30">{t("subaccounts.customerCode") || "Customer Code"}</th>
                                                <th className="px-2 xl:px-4 py-2 border border-warning/30">{t("subaccounts.companyName") || "Company Name"}</th>
                                                <th className="px-2 xl:px-4 py-2 border border-warning/30">{t("m.name")}</th>
                                                <th className="px-2 xl:px-4 py-2 border border-warning/30">{t("m.email")}</th>
                                                <th className="px-2 xl:px-4 py-2 border border-warning/30 text-center">{t("m.action")}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {displayedAccounts.map((account, idx) => {
                                                const accountId = account.entity_id || account.id || account.customer_id || account.sub_account_id;
                                                return (
                                                    <tr key={accountId || idx} className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} border-b border-gray-200 hover:bg-yellow-50/30 transition-colors`}>
                                                        <td className="px-2 xl:px-4 py-1.5 border-r border-gray-200 text-xs font-medium text-gray-700">
                                                            {account.customer_id ?? "N/A"}
                                                        </td>
                                                        <td className="px-2 xl:px-4 py-1.5 border-r border-gray-200 text-xs font-medium text-gray-700">
                                                            N/A
                                                        </td>
                                                        <td className="px-2 xl:px-4 py-1.5 border-r border-gray-200 text-xs font-bold text-black uppercase">
                                                            {account.firstname || "N/A"} {account.lastname || ""}
                                                        </td>
                                                        <td className="px-2 xl:px-4 py-1.5 border-r border-gray-200 text-sm font-medium text-gray-600">
                                                            {account.email || "N/A"}
                                                        </td>
                                                        <td className="px-2 xl:px-4 py-1.5 border-r border-gray-200 text-center">
                                                            <button
                                                                onClick={() => handleLoginAsSubAccount(account)}
                                                                disabled={loggingInId === accountId}
                                                                className="text-[10px] font-bold px-4 py-2 uppercase tracking-widest transition-all rounded-sm bg-primary hover:bg-black text-white disabled:opacity-50"
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

    // ─── Master Company view ──────────────────────────────────────────────────
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
                                                <tr key={accountId || idx} className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} border-b border-gray-200 hover:bg-yellow-50/30 transition-colors`}>
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
