"use client";

import React, { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api/api-client";

interface FiltersProps {
    status: string;
    orderNumber: string;
    onStatusChange: (status: string) => void;
    onOrderNumberChange: (order: string) => void;
    onSearch: () => void;
    onReset: () => void;
}

const Filters: React.FC<FiltersProps> = ({
    status,
    orderNumber,
    onStatusChange,
    onOrderNumberChange,
    onSearch,
    onReset,
}) => {
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
                console.log("[Filters] API Response Data:", data);

                // Handle FilterByStatus
                let fetchedStatusOptions: any[] = [];
                const statusData = data["Filter By Status"] || data.FilterByStatus || data.status_options || data.statuses || data.status || data;
                if (Array.isArray(statusData)) {
                    fetchedStatusOptions = statusData;
                } else if (statusData && typeof statusData === 'object' && Array.isArray(statusData.items)) {
                    fetchedStatusOptions = statusData.items;
                }

                if (fetchedStatusOptions.length > 0) {
                    // Smart deduplicate "All"
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
                    // Smart deduplicate "All"
                    const hasAll = fetchedOrderOptions.some(opt => {
                        const label = typeof opt === 'string' ? opt : (opt.label || opt.name || opt.increment_id || "");
                        return label.toLowerCase() === "all";
                    });

                    const finalOrderOptions = hasAll ? fetchedOrderOptions : ["All", ...fetchedOrderOptions];
                    setOrderOptions(finalOrderOptions);
                }
                else {
                    // Fallback to minimal if nothing returned
                    setOrderOptions(["All"]);
                }
            } catch (error) {
                console.error("Failed to fetch order filter options:", error);
                setStatusOptions(["All", "Check Pending"]);
                setOrderOptions(["All"]);
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

    return (
        <div className="mb-6">
            <div className="flex flex-wrap gap-x-5 gap-y-4 items-end">
                {/* Status Dropdown */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-body-lg font-bold text-black uppercase tracking-tight">
                        Filter By Status
                    </label>
                    <div className="relative" ref={statusRef}>
                        <button
                            type="button"
                            onClick={() => {
                                setIsStatusOpen(!isStatusOpen);
                                setIsOrderOpen(false);
                            }}
                            className="h-[42px] min-w-[180px] px-3 bg-primary text-black text-body font-bold flex items-center justify-between cursor-pointer focus:outline-none rounded-[1px]"
                        >
                            <span>{status || "All"}</span>
                            <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${isStatusOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {isStatusOpen && (
                            <ul className="absolute top-full left-0 min-w-[180px] w-full bg-primary z-50 shadow-md max-h-[320px] overflow-y-auto border-t border-gray-200">
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
                                                className={`w-full text-left px-4 py-2 text-body-lg text-black hover:bg-info hover:text-white transition-colors ${status === optionValue ? "bg-info text-white font-bold" : ""}`}
                                            >
                                                {optionLabel}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Order Search (Text Input) */}
                <div className="flex-1 min-w-[220px]">
                    <label className="block text-body-lg font-bold text-black mb-1.5 uppercase tracking-tight">
                        Search By Order #
                    </label>
                    <input
                        type="text"
                        value={orderNumber === "All" ? "" : orderNumber}
                        onChange={(e) => onOrderNumberChange(e.target.value)}
                        placeholder="e.g. 000001"
                        className="w-full h-[42px] px-3 bg-surfaceMuted border border-gray-200 text-body-lg text-black/80 focus:outline-none focus:border-primary transition-colors rounded-[1px]"
                    />
                </div>

                <div className="flex gap-2.5">
                    <button
                        onClick={onSearch}
                        className="h-[42px] px-8 bg-black text-white text-body font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors rounded-[1px]"
                    >
                        SEARCH
                    </button>
                    <button
                        onClick={onReset}
                        className="h-[42px] px-8 bg-black text-white text-body font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors rounded-[1px]"
                    >
                        RESET
                    </button>
                </div>
            </div>
        </div>
    );
};


export default Filters;
