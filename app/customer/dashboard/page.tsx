"use client";
import { useTranslation } from "@/hooks/useTranslation";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import { fetchCustomerInfo } from "@/store/actions/customerActions";
import Sidebar from "@/components/Sidebar";
import PortalDropdown from "@/components/PortalDropdown";
import { useSession } from "next-auth/react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { redirectToLogin } from "@/utils/helpers";
import { api } from "@/lib/api/api-client";
import { DashboardSkeleton } from "@/components/skeletons";

type CustomAttribute = {
    attribute_code: string;
    value: string;
};

const MONTH_KEYS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_KEYS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const QUARTER_KEYS_EN = ['Quarter 1', 'Quarter 2', 'Quarter 3', 'Quarter 4'];
const QUARTER_KEYS_AR = ['الربع الأول', 'الربع الثاني', 'الربع الثالث', 'الربع الرابع'];

export default function DashboardPage() {
    const router = useRouter();
    const { t, isRtl } = useTranslation();
    const pathname = usePathname();
    const dispatch = useDispatch<AppDispatch>();
    const { data: session, status } = useSession();
    const { data: customer, loading } = useSelector((state: RootState) => state.customer);
    const token = useSelector((state: RootState) => state.auth.token);

    const [isSubAccountSession, setIsSubAccountSession] = useState<boolean>(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("isSubAccount") === "true" && !!localStorage.getItem("subAccountToken");
        }
        return false;
    });
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [loadingDashboard, setLoadingDashboard] = useState(true);

    // Year selection state
    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);
    const [searchYear, setSearchYear] = useState<number>(currentYear);
    const [compareYear, setCompareYear] = useState<number>(currentYear - 1);
    const [isCompare, setIsCompare] = useState(false);

    // Selected items for display cards
    const [selectedProductGroup, setSelectedProductGroup] = useState("");
    const [selectedTyreSize, setSelectedTyreSize] = useState("");
    const [availableYears, setAvailableYears] = useState<number[]>([2026, 2025, 2024]);
    const [activeTab, setActiveTab] = useState<'quarterly' | 'monthly'>('quarterly');

    const monthNames = isRtl ? MONTH_KEYS_AR : MONTH_KEYS_EN;
    const quarterNames = isRtl ? QUARTER_KEYS_AR : QUARTER_KEYS_EN;

    useEffect(() => {
        if (typeof window !== "undefined") {
            setIsSubAccountSession(localStorage.getItem("isSubAccount") === "true" && !!localStorage.getItem("subAccountToken"));
        }
    }, [pathname]);

    // Derived: any valid auth — parent session OR active subaccount token
    const hasValidAuth = (status === "authenticated" && !!token) || isSubAccountSession;

    useEffect(() => {
        if (status === "unauthenticated" && !isSubAccountSession) {
            redirectToLogin(router);
            return;
        }
        if (hasValidAuth) {
            dispatch(fetchCustomerInfo());
        }
    }, [hasValidAuth, status, isSubAccountSession, dispatch, router]);

    // Fetch dashboard data whenever year or compare settings change
    useEffect(() => {
        if (hasValidAuth) {
            fetchDashboard();
        }
    }, [hasValidAuth, searchYear, compareYear, isCompare]);

    // Proper financial formatter (comas + 2 decimal places)
    const formatValue = (val: any) => {
        const num = Number(val || 0);
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const fetchDashboard = async () => {
        try {
            setLoadingDashboard(true);

            const params = new URLSearchParams();
            params.append('searchYear', String(searchYear));
            if (isCompare) {
                params.append('compareYear', String(compareYear));
            }

            const data = await api.get(`/kleverapi/dashboard?${params.toString()}`);
            console.log("dashboard data", data);
            if (data) {
                setDashboardData(data);
                if (data.available_years) setAvailableYears(data.available_years);

                // Dynamically set defaults from the API response using correct keys
                if (data.product_groups?.length > 0 && !selectedProductGroup) {
                    setSelectedProductGroup(data.product_groups[0].product_group);
                }
                if (data.tyre_sizes?.length > 0 && !selectedTyreSize) {
                    setSelectedTyreSize(data.tyre_sizes[0].size_pattern);
                }
            }
        } catch (err) {
            console.error("Dashboard data fetch error:", err);
            setDashboardData(null);
        } finally {
            setLoadingDashboard(false);
        }
    };

    if (loadingDashboard) return (
        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
            <Sidebar />
            <DashboardSkeleton />
        </div>
    );

    // Helper: look up a value from a dedicated summary array; if the API
    // doesn't return that array, fall back to yearly_summary filtered by year+period.
    const getSummaryQty = (
        dedicated: any[] | null | undefined,
        fallbackPeriod: string | number,
        year?: number
    ): string => {
        const arr = dedicated && dedicated.length > 0 ? dedicated : dashboardData?.yearly_summary;
        if (!arr) return "0";
        const entry = arr.find((d: any) =>
            (year === undefined || Number(d.year) === year) &&
            String(d.period) === String(fallbackPeriod)
        );
        return String(entry?.qty ?? "0");
    };

    const getSummaryAmount = (
        dedicated: any[] | null | undefined,
        fallbackPeriod: string | number,
        year?: number
    ): number => {
        const arr = dedicated && dedicated.length > 0 ? dedicated : dashboardData?.yearly_summary;
        if (!arr) return 0;
        const entry = arr.find((d: any) =>
            (year === undefined || Number(d.year) === year) &&
            String(d.period) === String(fallbackPeriod)
        );
        return Number(entry?.amount ?? 0);
    };

    // Helper: get qty for a specific year+period from compare data.
    // Falls back to yearly_summary when compare_quarterly/compare_monthly are absent.
    const getCompareQty = (
        dedicated: any[] | null | undefined,
        year: number,
        period: number
    ): number => {
        const arr = dedicated && dedicated.length > 0 ? dedicated : dashboardData?.yearly_summary;
        if (!arr) return 0;
        const entry = arr.find((d: any) =>
            Number(d.year) === year && Number(d.period) === period
        );
        return Number(entry?.qty ?? 0);
    };

    // Determine whether the API returned any meaningful data.
    // Checks all summary arrays and numeric values — if everything is absent or
    // zero the dashboard sections are hidden and "No record found!" is shown.
    const hasData = (() => {
        if (!dashboardData) return false;
        const allSummary = [
            ...(dashboardData?.yearly_summary || []),
            ...(dashboardData?.quarterly_summary || []),
            ...(dashboardData?.monthly_summary || []),
            ...(dashboardData?.compare_quarterly || []),
            ...(dashboardData?.compare_monthly || []),
        ];
        const hasSummaryData = allSummary.some(
            (d: any) => Number(d?.qty || 0) > 0 || Number(d?.amount || 0) > 0
        );
        const hasGroups = (dashboardData?.product_groups?.length || 0) > 0;
        const hasSizes = (dashboardData?.tyre_sizes?.length || 0) > 0;
        return hasSummaryData || hasGroups || hasSizes;
    })();

    const getAttr = (code: string) => {
        return (customer as any).custom_attributes?.find(
            (a: CustomAttribute) => a.attribute_code === code
        )?.value || "N/A";
    }

    // Translate API data values using data.* keys
    const translateData = (val: string) => {
        if (!val) return val;
        const translated = t(`data.${val}`);
        return translated !== `data.${val}` ? translated : val;
    };

    return (
        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
            <Sidebar />

            {/* Right Content Area */}
            <main className="flex-1 px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-5 bg-surfacePage min-h-0" dir={isRtl ? "rtl" : "ltr"}>
                <div className="w-full space-y-12">

                    {/* Sub-account Identity Banner */}
                    {/* {isSubAccountSession && (
                        <div className={`bg-green-50/80 ${isRtl ? 'border-r-4' : 'border-l-4'} border-green-500 text-green-800 p-4 mb-8 ${isRtl ? 'rounded-l-lg' : 'rounded-r-lg'} flex items-center gap-3 animate-in fade-in slide-in-from-top duration-500 shadow-sm border border-gray-200`} role="alert">
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-caption font-bold">&#10004;</div>
                            <p className="text-body-lg font-bold tracking-tight uppercase">{t("dashboard.subAccountBanner")}</p>
                        </div>
                    )} */}

                    <div className="flex items-center gap-4 mb-5">
                        <h1 className="text-h3 md:text-h1-sm font-semibold text-black uppercase tracking-tight">
                            {t("dashboard.title")}
                        </h1>
                    </div>

                    {/* COMPARE SECTION */}
                    {/* <section className="bg-white border border-border rounded-xl shadow-sm mb-12 overflow-hidden transition-all duration-300 hover:shadow-md"> */}
                    <section className="bg-white w-full xl:w-[475px] border border-border rounded-sm mb-6 overflow-hidden">

                        {/* Header Section */}
                        <div className="px-4 py-3 border-b border-[#ddd] flex items-center gap-4">
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="compare-toggle"
                                    checked={isCompare}
                                    onChange={(e) => {
                                        setIsCompare(e.target.checked);
                                        if (!e.target.checked) {
                                            setSearchYear(new Date().getFullYear());
                                        }
                                    }}
                                    className="w-[18px] h-[18px] accent-primary cursor-pointer"
                                />
                                <label htmlFor="compare-toggle" className="text-label font-bold uppercase text-black tracking-widest cursor-pointer select-none">{t("dashboard.compare")}</label>
                            </div>
                        </div>

                        {/* Body Section */}
                        <div className="p-3 md:p-4 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-12">
                            {/* First Selector */}
                            <div className="flex-1 w-full bg-primary border border-border rounded-sm transition-all">
                                <PortalDropdown
                                    value={searchYear}
                                    onChange={(val) => {
                                        setSearchYear(Number(val));
                                        setIsCompare(true);
                                    }}
                                    options={availableYears.map(y => ({ label: String(y), value: String(y) }))}
                                    buttonClassName="w-full h-11 px-5 flex items-center justify-between gap-2 cursor-pointer bg-transparent outline-none ltr:text-left rtl:text-right font-bold text-body uppercase tracking-wider text-black"
                                    className="w-full h-full"
                                />
                            </div>

                            {/* Constant "vs." label */}
                            <div className="flex items-center justify-center">
                                <span className="text-sm font-semibold text-black uppercase tracking-tighter italic ">
                                    {isRtl ? "مقابل" : "vs."}
                                </span>
                            </div>

                            {/* Second Selector */}
                            <div className="flex-1 w-full bg-primary border border-border rounded-sm transition-all">
                                <PortalDropdown
                                    value={compareYear}
                                    onChange={(val) => {
                                        setCompareYear(Number(val));
                                        setIsCompare(true);
                                    }}
                                    options={availableYears.map(y => ({ label: String(y), value: String(y) }))}
                                    buttonClassName="w-full h-11 px-5 flex items-center justify-between gap-2 cursor-pointer bg-transparent outline-none ltr:text-left rtl:text-right font-bold text-body uppercase tracking-wider text-black"
                                    className="w-full h-full"
                                />
                            </div>
                        </div>
                    </section>

                    {/* No data state — only shown when not comparing and there is genuinely no data */}
                    {!hasData && !isCompare && (
                        <div className="py-10 text-center">
                            <p className="text-body-lg font-semibold text-black uppercase tracking-widest">
                                {t("No record found!") || "No record found!"}
                            </p>
                        </div>
                    )}

                    {/* Summary Sections - visible only when data exists and not comparing */}
                    {hasData && !isCompare && (
                        <div className="space-y-3 md:space-y-6 animate-in fade-in duration-700">
                            {/* TOTAL ORDER QTY SECTION */}
                            <section>
                                <div className="flex flex-col">
                                    <h2 className="text-body-lg md:text-h3-sm font-bold text-black uppercase mb-1.5 md:mb-3">{t("m.total-order-qty")}</h2>
                                    <hr className="border-[#ddd] mb-3 md:mb-6" />
                                </div>
                                <div className="w-full xl:w-3/4 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
                                    <QtyCard
                                        label={`${t("dashboard.year")} - ${searchYear}`}
                                        value={dashboardData?.yearly_summary?.[0]?.qty || "0"}
                                        isRtl={isRtl}
                                    />
                                    <QtyCard
                                        label={t("m.quarter")}
                                        value={dashboardData?.quarterly_summary?.[0]?.qty || "0"}
                                        isRtl={isRtl}
                                    />
                                    <QtyCard
                                        label={t("m.months")}
                                        value={dashboardData?.monthly_summary?.[0]?.qty || "0"}
                                        isRtl={isRtl}
                                    />
                                </div>
                            </section>

                            {/* TOTAL ORDER VALUE SECTION */}
                            <section>
                                <div className="flex flex-col">
                                    <h2 className="text-body-lg md:text-h3-sm font-bold text-black uppercase mb-1.5 md:mb-3">{t("m.total-order-value")}</h2>
                                    <hr className="border-[#ddd] mb-3 md:mb-6" />
                                </div>
                                <div className="w-full xl:w-3/4 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
                                    <ValueCard
                                        label={`${t("dashboard.year")} - ${searchYear}`}
                                        value={formatValue(dashboardData?.yearly_summary?.[0]?.amount)}
                                        isRtl={isRtl}
                                    />
                                    <ValueCard
                                        label={t("m.quarter")}
                                        value={formatValue(dashboardData?.quarterly_summary?.[0]?.amount)}
                                        isRtl={isRtl}
                                    />
                                    <ValueCard
                                        label={t("m.months")}
                                        value={formatValue(dashboardData?.monthly_summary?.[0]?.amount)}
                                        isRtl={isRtl}
                                    />
                                </div>
                            </section>

                            {/* BOTTOM FILTERS */}
                            <section className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 md:grid-cols-3 gap-6 pt-4">
                                {/* Product Group Filter */}
                                {/* <div className="flex flex-col gap-4 group">
                                    <h3 className="text-body font-bold text-black uppercase tracking-widest ltr:text-left rtl:text-right">{t("dashboard.productGroupLabel")}</h3>
                                    <div className="bg-white border border-[#ddd] rounded-sm shadow-sm overflow-hidden">
                                        <div className="bg-primary border-b border-[#ddd] h-10 px-5 flex items-center relative">
                                            <PortalDropdown
                                                value={selectedProductGroup}
                                                onChange={(val) => setSelectedProductGroup(val)}
                                                options={
                                                    (!dashboardData?.product_groups || dashboardData.product_groups.length === 0)
                                                        ? [{ label: t("common.noDataFound"), value: "" }]
                                                        : dashboardData.product_groups.map((pg: any) => ({ label: translateData(pg.product_group), value: pg.product_group }))
                                                }
                                                placeholder={t("m.select")}
                                                buttonClassName="w-full h-full flex items-center justify-between gap-2 cursor-pointer bg-transparent outline-none ltr:text-left rtl:text-right font-bold text-xs uppercase tracking-wider text-black"
                                                className="w-full h-full"
                                            />
                                        </div>
                                        <div className="py-5 px-6 text-center">
                                            <p className="text-3xl font-bold text-black tracking-tight">
                                                {dashboardData?.product_groups?.find((pg: any) => pg.product_group === selectedProductGroup)?.qty || "0"}
                                            </p>
                                        </div>
                                    </div>
                                </div> */}

                                {/* Tyre Size Filter */}
                                {/* <div className="flex flex-col gap-4 group">
                                    <h3 className="text-body font-bold text-black uppercase tracking-widest ltr:text-left rtl:text-right">{t("dashboard.tyreSizeLabel")}</h3>
                                    <div className="bg-white border border-[#ddd] rounded-sm shadow-sm overflow-hidden">
                                        <div className="bg-primary border-b border-[#ddd] h-10 px-5 flex items-center relative">
                                            <PortalDropdown
                                                value={selectedTyreSize}
                                                onChange={(val) => setSelectedTyreSize(val)}
                                                options={
                                                    (!dashboardData?.tyre_sizes || dashboardData.tyre_sizes.length === 0)
                                                        ? [{ label: t("common.noDataFound"), value: "" }]
                                                        : dashboardData.tyre_sizes.map((ts: any) => ({ label: translateData(ts.size_pattern), value: ts.size_pattern }))
                                                }
                                                placeholder={t("m.select")}
                                                buttonClassName="w-full h-full flex items-center justify-between gap-2 cursor-pointer bg-transparent outline-none ltr:text-left rtl:text-right font-bold text-xs uppercase tracking-wider text-black"
                                                className="w-full h-full"
                                            />
                                        </div>
                                        <div className="py-5 px-6 text-center">
                                            <p className="text-3xl font-bold text-black tracking-tight">
                                                {dashboardData?.tyre_sizes?.find((ts: any) => ts.size_pattern === selectedTyreSize)?.qty || "0"}
                                            </p>
                                        </div>
                                    </div>
                                </div> */}
                            </section>
                        </div>
                    )}

                    {/* COMPARISON DETAILS SECTION (Chart & Table) */}
                    {isCompare && (
                        <section className="bg-white overflow-hidden animate-in fade-in slide-in-from-bottom duration-500">
                            <div className="py-3 border-b border-[#ddd] bg-gray-50/50">
                                <h2 className="text-lg md:text-xl font-bold text-black uppercase tracking-tight ltr:text-left rtl:text-right">
                                    {isRtl ? `مقارنة ${searchYear} مع ${compareYear}` : `COMPARE ${searchYear} WITH ${compareYear}`}
                                </h2>
                            </div>

                            {/* Tabs */}
                            <div className="flex pt-4 bg-gray-50/50 flex-col md:flex-row">
                                <button
                                    onClick={() => setActiveTab('quarterly')}
                                    className={`px-6 outline-none border-t border-l border-[#ddd] py-3 text-sm font-bold uppercase tracking-widest cursor-pointer transition-all
                                        ${activeTab === 'quarterly' ? 'text-white-l bg-primary' : 'bg-[#f5f5f5] text-black hover:text-black'}`}
                                >
                                    {t("dashboard.quarterlySalesData")}
                                </button>
                                <button
                                    onClick={() => setActiveTab('monthly')}
                                    className={`px-6 outline-none border-r border-t border-[#ddd] py-3 text-sm font-bold uppercase tracking-widest cursor-pointer transition-all
                                        ${activeTab === 'monthly' ? 'text-white bg-primary' : 'bg-[#f5f5f5] text-black hover:text-black'}`}
                                >
                                    {t("dashboard.monthlySalesData")}
                                </button>
                            </div>

                            <div className="p-3 border border-[#ddd]">
                                {/* Chart Implementation */}
                                {(() => {
                                    const isQuarterly = activeTab === 'quarterly';
                                    const periods = isQuarterly ? [1, 2, 3, 4] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
                                    const sourceArr = isQuarterly ? dashboardData?.compare_quarterly : dashboardData?.compare_monthly;
                                    const chartData = periods.map((p, i) => ({
                                        name: isQuarterly ? quarterNames[i] : monthNames[i],
                                        [searchYear]: getCompareQty(sourceArr, searchYear, p),
                                        [compareYear]: getCompareQty(sourceArr, compareYear, p),
                                    }));
                                    // When all values are 0, fix Y-axis domain to [0,1] so the grid
                                    // and axis ticks remain visible instead of collapsing to a flat line.
                                    const allZero = chartData.every(d => (d[searchYear] as number) === 0 && (d[compareYear] as number) === 0);

                                    return (
                                        <div className="w-full aspect-[16/9]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                                    <XAxis
                                                        dataKey="name"
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fill: 'var(--color-text-subtle)', fontSize: 11, fontWeight: 900 }}
                                                        dy={15}
                                                    />
                                                    <YAxis
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fill: 'var(--color-text-subtle)', fontSize: 10, fontWeight: 600 }}
                                                        domain={allZero ? [0, 1] : undefined}
                                                    />
                                                    <Tooltip
                                                        content={allZero ? () => null : undefined}
                                                        cursor={allZero ? false : { fill: 'var(--color-surface-input)' }}
                                                        contentStyle={{ backgroundColor: 'var(--color-surface)', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 900, fontSize: '12px', textTransform: 'uppercase' }}
                                                    />
                                                    <Legend
                                                        verticalAlign="top"
                                                        align="right"
                                                        iconType="circle"
                                                        wrapperStyle={{ paddingBottom: '40px', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}
                                                    />
                                                    <Bar dataKey={String(searchYear)} fill="#4E81C2" radius={[4, 4, 0, 0]} barSize={allZero ? 0 : 32} name={String(searchYear)} />
                                                    <Bar dataKey={String(compareYear)} fill="#6B7280" radius={[4, 4, 0, 0]} barSize={allZero ? 0 : 32} name={String(compareYear)} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    );
                                })()}

                                {/* Data Table */}
                                <div className="overflow-x-auto overflow-hidden">
                                    <table className="w-full border-collapse border border-[#ddd]">
                                        <thead>
                                            <tr className="bg-primary text-label uppercase font-bold tracking-widest">
                                                <th className="px-2 xl:px-4 py-2 border border-warning/30 text-label font-bold text-black uppercase tracking-widest text-center">{activeTab === 'quarterly' ? t("dashboard.quarter") : t("dashboard.month")}</th>
                                                <th className="px-2 xl:px-4 py-2 border border-warning/30 text-label font-bold text-black uppercase tracking-widest text-center">{searchYear} QTY</th>
                                                <th className="px-2 xl:px-4 py-2 border border-warning/30 text-label font-bold text-black uppercase tracking-widest text-center">{compareYear} QTY</th>
                                                <th className="px-2 xl:px-4 py-2 border border-warning/30 text-label font-bold text-black uppercase tracking-widest text-center">{isRtl ? 'التغيير' : 'CHANGE'}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 bg-white">
                                            {(activeTab === 'quarterly' ? [1, 2, 3, 4] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]).map((p) => {
                                                const sourceArr = activeTab === 'quarterly' ? dashboardData?.compare_quarterly : dashboardData?.compare_monthly;
                                                const val1 = getCompareQty(sourceArr, searchYear, p);
                                                const val2 = getCompareQty(sourceArr, compareYear, p);

                                                const label = activeTab === 'quarterly'
                                                    ? (isRtl ? `ر${p}` : `Q${p}`)
                                                    : (isRtl ? monthNames[p - 1] : p.toString());

                                                const change = val2 > 0 ? ((val1 - val2) / val2 * 100).toFixed(1) : (val1 > 0 ? "100" : "0");

                                                return (
                                                    <tr key={p} className="hover:bg-primary/5 group transition-colors">
                                                        <td className="px-2 xl:px-4 py-1.5 border-r border-gray-200 font-bold text-black text-body uppercase text-center">{label}</td>
                                                        <td className="px-2 xl:px-4 py-1.5 border-r border-gray-200 text-body-lg font-bold text-black text-center">{val1}</td>
                                                        <td className="px-2 xl:px-4 py-1.5 border-r border-gray-200 text-body-lg font-bold text-black/50 group-hover:text-black transition-colors text-center">{val2}</td>
                                                        <td className="px-2 xl:px-4 py-1.5 border-r border-gray-200 text-center">
                                                            <span className={`text-label font-bold px-2 py-1 rounded ${Number(change) >= 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                                                                {Number(change) >= 0 ? '+' : ''}{change}%
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </section>
                    )}
                </div>
            </main>
        </div>
    );
}

/**
 * Reusable Card Components
 */
function QtyCard({ label, value, isRtl }: { label: string; value: string; isRtl: boolean }) {
    return (
        <div className="bg-white border border-[#ddd] rounded-sm overflow-hidden group">
            <div className="bg-primary h-10 px-4 flex justify-between items-center text-black border-b border-border group-hover:bg-primary transition-colors">
                <span className="text-xs font-bold uppercase tracking-widest text-black/60">{label}</span>
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
            </div>
            <div className="py-5 px-4 text-center">
                <p className="text-4xl font-bold text-black tracking-tighter">{value}</p>
            </div>
        </div>
    );
}

function ValueCard({ label, value, isRtl }: { label: string; value: string; isRtl: boolean }) {
    return (
        <div className="bg-white border border-[#ddd] rounded-sm overflow-hidden group">
            <div className="bg-primary h-10 px-4 flex justify-between items-center text-black border-b border-border group-hover:bg-primary transition-colors">
                <span className="text-xs font-bold uppercase tracking-widest text-black/6">{label}</span>
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
            </div>
            <div className="py-5 px-4 text-center">
                <p className="text-2xl font-bold text-black tracking-tight">{value}</p>
            </div>
        </div>
    );
}
