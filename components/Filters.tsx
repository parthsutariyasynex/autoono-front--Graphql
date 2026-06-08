// "use client";

// import React, { useState, useRef, useEffect, useMemo } from "react";

// interface FiltersProps {
//     status: string;
//     search: string;
//     onStatusChange: (status: string) => void;
//     onSearchChange: (search: string) => void;
//     onApplySearch: () => void;
//     onReset: () => void;
//     isFiltered?: boolean;
//     statusCounts?: Record<string, number>;
// }

// const Filters: React.FC<FiltersProps> = ({
//     status,
//     search,
//     onStatusChange,
//     onSearchChange,
//     onApplySearch,
//     onReset,
//     isFiltered = false,
//     statusCounts = {},
// }) => {
//     const [isStatusOpen, setIsStatusOpen] = useState(false);
//     const [isOrderOpen, setIsOrderOpen] = useState(false);

//     const [statusOptions, setStatusOptions] = useState<any[]>(["All"]);
//     const [orderOptions, setOrderOptions] = useState<any[]>(["All"]);

//     const statusRef = useRef<HTMLDivElement>(null);
//     const orderRef = useRef<HTMLDivElement>(null);

//     // Fetch dynamic filter options
//     useEffect(() => {
//         async function fetchFilterOptions() {
//             try {
//                 const res = await fetch("/api/kleverapi/my-orders/filter-options", {
//                     headers: {
//                         "Content-Type": "application/json",
//                     },
//                 });
//                 const data = await res.json();

//                 // Handle FilterByStatus
//                 let fetchedStatusOptions: any[] = [];
//                 const statusData = data["Filter By Status"] || data.FilterByStatus || data.status_options || data.statuses || data.status || data;
//                 if (Array.isArray(statusData)) {
//                     fetchedStatusOptions = statusData;
//                 } else if (statusData && typeof statusData === 'object' && Array.isArray(statusData.items)) {
//                     fetchedStatusOptions = statusData.items;
//                 }

//                 if (fetchedStatusOptions.length > 0) {
//                     const hasAll = fetchedStatusOptions.some(opt => {
//                         const label = typeof opt === 'string' ? opt : (opt.label || opt.name || opt.status || "");
//                         return label.toLowerCase() === "all";
//                     });

//                     const finalStatusOptions = hasAll ? fetchedStatusOptions : ["All", ...fetchedStatusOptions];
//                     setStatusOptions(finalStatusOptions);
//                 }

//                 // Handle FilterByOrder
//                 let fetchedOrderOptions: any[] = [];
//                 const orderData = data["Filter By Order"] || data.FilterByOrder || data.order_options || data.orders || data.order;
//                 if (Array.isArray(orderData)) {
//                     fetchedOrderOptions = orderData;
//                 } else if (orderData && typeof orderData === 'object' && Array.isArray(orderData.items)) {
//                     fetchedOrderOptions = orderData.items;
//                 }

//                 if (fetchedOrderOptions.length > 0) {
//                     const hasAll = fetchedOrderOptions.some(opt => {
//                         const label = typeof opt === 'string' ? opt : (opt.label || opt.name || opt.increment_id || "");
//                         return label.toLowerCase() === "all";
//                     });

//                     const finalOrderOptions = hasAll ? fetchedOrderOptions : ["All", ...fetchedOrderOptions];
//                     setOrderOptions(finalOrderOptions);
//                 }
//             } catch (error) {
//                 console.error("Failed to fetch order filter options:", error);
//                 setStatusOptions(["All", "Check Pending"]);
//             }
//         }
//         fetchFilterOptions();
//     }, []);

//     // Close dropdowns on outside click
//     useEffect(() => {
//         function handleClickOutside(e: MouseEvent) {
//             if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
//                 setIsStatusOpen(false);
//             }
//             if (orderRef.current && !orderRef.current.contains(e.target as Node)) {
//                 setIsOrderOpen(false);
//             }
//         }
//         document.addEventListener("mousedown", handleClickOutside);
//         return () => document.removeEventListener("mousedown", handleClickOutside);
//     }, []);

//     const selectedStatusLabel = useMemo(() => {
//         const found = statusOptions.find(opt => {
//             const val = typeof opt === 'string' ? opt : (opt.value || opt.id || opt.label || opt.status || "");
//             return val === status;
//         });
//         if (!found) return status || "All";
//         return typeof found === 'string' ? found : (found.label || found.name || status || "All");
//     }, [status, statusOptions]);

//     return (
//         <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-8 mt-2 overflow-visible">
//             <div className="flex flex-col md:flex-row gap-6 items-end">
//                 {/* Status Dropdown */}
//                 <div className="flex flex-col gap-1.5">
//                     <label className="text-body-lg font-bold text-black uppercase tracking-tight">
//                         Filter By Status
//                     </label>
//                     <div className="relative" ref={statusRef}>
//                         <button
//                             type="button"
//                             onClick={() => {
//                                 setIsStatusOpen(!isStatusOpen);
//                                 setIsOrderOpen(false);
//                             }}
//                             className="h-[42px] min-w-[180px] px-3 bg-primary text-black text-body font-bold flex items-center justify-between cursor-pointer focus:outline-none rounded-[1px]"
//                         >
//                             <span>{t(`data.${selectedStatusLabel}`) !== `data.${selectedStatusLabel}` ? t(`data.${selectedStatusLabel}`) : selectedStatusLabel}</span>
//                             <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${isStatusOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
//                             </svg>
//                         </button>

//                         {isStatusOpen && (
//                             <ul className="absolute top-full left-0 min-w-[180px] w-full bg-primary z-[100] shadow-md max-h-[320px] overflow-y-auto border-t border-black/10">
//                                 {statusOptions.map((opt: any, idx: number) => {
//                                     const optionLabel = typeof opt === 'string' ? opt : (opt.label || opt.name || opt.status || String(idx));
//                                     const optionValue = typeof opt === 'string' ? opt : (opt.value || opt.id || optionLabel);

//                                     const valForCount = optionValue.toLowerCase();
//                                     const count = statusCounts[valForCount] ?? statusCounts[optionValue] ?? 0;

//                                     return (
//                                         <li key={`${optionLabel}-${idx}`}>
//                                             <button
//                                                 type="button"
//                                                 onClick={() => {
//                                                     onStatusChange(optionValue);
//                                                     setIsStatusOpen(false);
//                                                 }}
//                                                 className={`w-full text-left px-4 py-2 text-body-lg text-black hover:bg-info hover:text-white transition-colors flex justify-between items-center ${status === optionValue ? "bg-info text-white font-bold" : ""}`}
//                                             >
//                                                 <span>{optionLabel}</span>
//                                             </button>
//                                         </li>
//                                     );
//                                 })}
//                             </ul>
//                         )}
//                     </div>
//                 </div>

//                 {/* Search By Order # (Text Input) */}
//                 <div className="flex-1 min-w-[220px]">
//                     <label className="block text-body-lg font-bold text-black mb-1.5 uppercase tracking-tight">
//                         Filter By Order
//                     </label>
//                     <input
//                         type="text"
//                         value={search === "All" ? "" : search}
//                         onChange={(e) => onSearchChange(e.target.value)}
//                         onKeyDown={(e) => {
//                             if (e.key === "Enter") {
//                                 onApplySearch();
//                             }
//                         }}
//                         placeholder="e.g. 000001"
//                         className="w-full h-[42px] px-3 bg-surfaceMuted border border-gray-200 text-body-lg text-black/80 focus:outline-none focus:border-primary transition-colors rounded-[1px]"
//                     />
//                 </div>

//                 {/* Actions */}
//                 <div className="flex gap-2.5">
//                     <button
//                         onClick={onApplySearch}
//                         className="h-[42px] px-8 bg-black text-white text-body font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors rounded-[1px]"
//                     >
//                         SEARCH
//                     </button>
//                     <button
//                         onClick={onReset}
//                         className="h-[42px] px-8 bg-black text-white text-body font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors rounded-[1px]"
//                     >
//                         RESET
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default Filters;


"use client";

import { useTranslation } from "@/hooks/useTranslation";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { api } from "@/lib/api/api-client";

interface FiltersProps {
    status: string;
    search: string;
    onStatusChange: (status: string) => void;
    onSearchChange: (search: string) => void;
    onApplySearch: () => void;
    onReset: () => void;
    isFiltered?: boolean;
    statusCounts?: Record<string, number>;
}

const Filters: React.FC<FiltersProps> = ({
    status,
    search,
    onStatusChange,
    onSearchChange,
    onApplySearch,
    onReset,
    isFiltered = false,
    statusCounts = {},
}) => {
    const { t } = useTranslation();
    const [isStatusOpen, setIsStatusOpen] = useState(false);
    const [isOrderOpen, setIsOrderOpen] = useState(false);

    const [statusOptions, setStatusOptions] = useState<any[]>(["All"]);
    const [orderOptions, setOrderOptions] = useState<any[]>(["All"]);

    const statusRef = useRef<HTMLDivElement>(null);
    const orderRef = useRef<HTMLDivElement>(null);

    // Fetch dynamic filter options
    useEffect(() => {
        async function fetchFilterOptions() {
            try {
                const data = await api.get("/kleverapi/my-orders/filter-options");

                // Handle FilterByStatus
                let fetchedStatusOptions: any[] = [];
                const statusData = data["Filter By Status"] || data.FilterByStatus || data.status_options || data.statuses || data.status || data;
                if (Array.isArray(statusData)) {
                    fetchedStatusOptions = statusData;
                } else if (statusData && typeof statusData === 'object' && Array.isArray(statusData.items)) {
                    fetchedStatusOptions = statusData.items;
                }

                if (fetchedStatusOptions.length > 0) {
                    const hasAll = fetchedStatusOptions.some(opt => {
                        const label = typeof opt === 'string' ? opt : (opt.label || opt.name || opt.status || "");
                        return label.toLowerCase() === "all";
                    });

                    const finalStatusOptions = hasAll ? fetchedStatusOptions : ["All", ...fetchedStatusOptions];
                    setStatusOptions(finalStatusOptions);
                }

                // Handle FilterByOrder
                let fetchedOrderOptions: any[] = [];
                const orderData = data["Filter By Order"] || data.FilterByOrder || data.order_options || data.orders || data.order;
                if (Array.isArray(orderData)) {
                    fetchedOrderOptions = orderData;
                } else if (orderData && typeof orderData === 'object' && Array.isArray(orderData.items)) {
                    fetchedOrderOptions = orderData.items;
                }

                if (fetchedOrderOptions.length > 0) {
                    const hasAll = fetchedOrderOptions.some(opt => {
                        const label = typeof opt === 'string' ? opt : (opt.label || opt.name || opt.increment_id || "");
                        return label.toLowerCase() === "all";
                    });

                    const finalOrderOptions = hasAll ? fetchedOrderOptions : ["All", ...fetchedOrderOptions];
                    setOrderOptions(finalOrderOptions);
                }
            } catch (error) {
                console.error("Failed to fetch order filter options:", error);
                setStatusOptions(["All", "Check Pending"]);
            }
        }
        fetchFilterOptions();
    }, []);

    // Close dropdowns on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
                setIsStatusOpen(false);
            }
            if (orderRef.current && !orderRef.current.contains(e.target as Node)) {
                setIsOrderOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedStatusLabel = useMemo(() => {
        const found = statusOptions.find(opt => {
            const val = typeof opt === 'string' ? opt : (opt.value || opt.id || opt.label || opt.status || "");
            return val === status;
        });
        if (!found) return status || "All";
        return typeof found === 'string' ? found : (found.label || found.name || status || "All");
    }, [status, statusOptions]);

    return (
        <div className="bg-white p-5 rounded-md shadow-sm border border-border mb-8 mt-2 overflow-visible">
            <div className="flex flex-col md:flex-row gap-5 items-end">
                {/* Status Dropdown */}
                <div className="flex flex-col gap-1.5 min-w-[180px]">
                    <label className="text-xs font-bold text-black uppercase tracking-wide">
                        {t("common.filter")} {t("common.status")}
                    </label>
                    <div className="relative" ref={statusRef}>
                        <button
                            type="button"
                            onClick={() => {
                                setIsStatusOpen(!isStatusOpen);
                                setIsOrderOpen(false);
                            }}
                            className="h-[38px] w-full px-3 bg-white border border-gray-300 text-black text-xs font-bold flex items-center justify-between cursor-pointer focus:outline-none focus:border-primary rounded-md transition-colors"
                        >
                            <span>{t(`data.${selectedStatusLabel}`) !== `data.${selectedStatusLabel}` ? t(`data.${selectedStatusLabel}`) : selectedStatusLabel}</span>
                            <svg className={`w-3 h-3 text-black/60 transition-transform duration-200 ${isStatusOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {isStatusOpen && (
                            <ul className="absolute top-[calc(100%+4px)] start-0 w-full bg-white z-[100] shadow-xl rounded-md border border-gray-200 py-1 max-h-[300px] overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                                {statusOptions.map((opt: any, idx: number) => {
                                    const optionLabel = typeof opt === 'string' ? opt : (opt.label || opt.name || opt.status || String(idx));
                                    const optionValue = typeof opt === 'string' ? opt : (opt.value || opt.id || optionLabel);

                                    return (
                                        <li key={`${optionLabel}-${idx}`}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    onStatusChange(optionValue);
                                                    setIsStatusOpen(false);
                                                }}
                                                className={`w-full text-start px-4 py-2 text-xs transition-colors truncate ${status === optionValue
                                                    ? "bg-primary font-bold"
                                                    : "text-black/80 hover:bg-primary"
                                                    }`}
                                            >
                                                {t(`data.${optionLabel.trim()}`) !== `data.${optionLabel.trim()}` ? t(`data.${optionLabel.trim()}`) : optionLabel}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Search By Order # (Text Input) */}
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-black mb-1.5 uppercase tracking-wide">
                        {t("common.filter")} {t("orders.orderId")}
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            value={search === "All" ? "" : search}
                            onChange={(e) => onSearchChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    onApplySearch();
                                }
                            }}
                            placeholder={t("m.search")}
                            className="w-full h-[38px] px-3 bg-white border border-gray-300 text-xs text-black focus:outline-none focus:border-primary transition-colors rounded-md placeholder:text-black/50"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 min-w-fit">
                    <button
                        onClick={onApplySearch}
                        className="h-[38px] px-6 bg-primary hover:bg-primary text-xs font-bold uppercase tracking-wider transition-all rounded-md shadow-sm active:scale-95"
                    >
                        {t("m.search")}
                    </button>
                    <button
                        onClick={onReset}
                        className="h-[38px] px-6 bg-gray-100 hover:bg-gray-200 text-black text-xs font-bold uppercase tracking-wider transition-all rounded-md shadow-sm active:scale-95 border border-gray-200"
                    >
                        {t("m.reset")}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Filters;
