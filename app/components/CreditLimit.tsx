"use client";

import { useEffect, useRef, useState } from "react";
import { Hourglass } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { api } from "@/lib/api/api-client";
import Price from "./Price";

interface CreditLimitResponse {
    user_type: string;
    is_visible: boolean;
    currency: string;
    above_credit_limit_order: boolean;
    credit_limit_permission: boolean;
    credit_limit_visibility: number;
    total_credit_limit: number;
    used_credit_limit: number;
    available_credit_limit: number;
    total_credit_limit_formatted: string;
    used_credit_limit_formatted: string;
    available_credit_limit_formatted: string;
}

// Module-level in-flight dedup + 5-min TTL. Credit limit changes only after
// orders/payments — fine to reuse for short windows. Stops React StrictMode
// (dev) double-mount and concurrent CreditLimit instances from firing twice.
let _creditInflight: Promise<CreditLimitResponse | null> | null = null;
let _creditCache: { data: CreditLimitResponse; fetchedAt: number } | null = null;
const CREDIT_TTL_MS = 5 * 60 * 1000;

const CreditLimit = () => {
    const { t } = useTranslation();
    const [data, setData] = useState<CreditLimitResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const didInitialFetch = useRef(false);
    useEffect(() => {
        if (didInitialFetch.current) return;
        didInitialFetch.current = true;
        let isMounted = true;

        const fetchCreditInfo = async () => {
            // Serve from cache when fresh
            if (_creditCache && Date.now() - _creditCache.fetchedAt < CREDIT_TTL_MS) {
                if (isMounted) {
                    setData(_creditCache.data);
                    setError(null);
                    setLoading(false);
                }
                return;
            }
            try {
                setLoading(true);
                // Share in-flight promise across concurrent callers
                if (!_creditInflight) {
                    _creditInflight = api.get("/kleverapi/credit-account")
                        .then((res: CreditLimitResponse) => {
                            _creditCache = { data: res, fetchedAt: Date.now() };
                            return res;
                        })
                        .finally(() => { _creditInflight = null; });
                }
                const response = await _creditInflight;
                if (isMounted && response) {
                    setData(response);
                    setError(null);
                }
            } catch (err: any) {
                console.error("[CreditLimit] Fetch error:", err);
                if (isMounted) {
                    setError(err.message || "Failed to load credit information");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchCreditInfo();
        return () => { isMounted = false; };
    }, []);

    // if (loading) {
    //     return (
    //         <div className="w-full h-32 flex flex-col items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
    //             {/* <Loader2 className="w-6 h-6 animate-spin text-[#f5a623] mb-2" /> */}
    //             {/* <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t("common.loading") || "Loading..."}</span> */}
    //         </div>
    //     );
    // }

    if (error) return null;

    if (!data || data.is_visible === false) {
        return null;
    }

    const cardClass = "flex shadow-sm rounded-lg overflow-hidden transition-all duration-300 hover:shadow-md transform hover:-translate-y-1 group";
    const iconContainerClass = "w-16 md:w-20 flex items-center justify-center p-3 transition-colors duration-300";
    const contentClass = "flex-1 p-3 md:p-4 flex flex-col justify-center items-end text-white";

    return (
        <section className="animate-in fade-in slide-in-from-bottom duration-700">
            <h2 className="text-[14px] md:text-[16px] font-bold text-black uppercase mb-3">
                {t("m.credit-account-information") || "Credit Account Information"}
            </h2>
            <hr className="border-gray-200 mb-6" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
                {/* Total Credit Limit */}
                <div className={cardClass}>
                    <div className={`${iconContainerClass} bg-[#2980b9] group-hover:bg-[#1f6391]`}>
                        <Hourglass className="text-white w-6 h-6 md:w-8 md:h-8" />
                    </div>
                    <div className={`${contentClass} bg-[#3498db]`}>
                        <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-tight opacity-90">
                            {t("m.total-credit-limit") || "Total Credit Limit"}
                        </span>
                        <div className="flex items-center gap-1 mt-1 md:mt-1.5">
                            <Price amount={data.total_credit_limit} className="text-base md:text-xl font-bold text-white" symbolClassName="text-white" />
                        </div>
                    </div>
                </div>

                {/* Used Credit Limit */}
                <div className={cardClass}>
                    <div className={`${iconContainerClass} bg-[#c0392b] group-hover:bg-[#962d22]`}>
                        <Hourglass className="text-white w-6 h-6 md:w-8 md:h-8" />
                    </div>
                    <div className={`${contentClass} bg-[#e74c3c]`}>
                        <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-tight opacity-90">
                            {t("m.used-credit-limit") || "Used Credit Limit"}
                        </span>
                        <div className="flex items-center gap-1 mt-1 md:mt-1.5">
                            <Price amount={data.used_credit_limit} className="text-base md:text-xl font-bold text-white" symbolClassName="text-white" />
                        </div>
                    </div>
                </div>

                {/* Available Credit Limit */}
                <div className={cardClass}>
                    <div className={`${iconContainerClass} bg-[#16a085] group-hover:bg-[#117d68]`}>
                        <Hourglass className="text-white w-6 h-6 md:w-8 md:h-8" />
                    </div>
                    <div className={`${contentClass} bg-[#1abc9c]`}>
                        <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-tight opacity-90">
                            {t("m.available-credit-limit") || "Available Credit Limit"}
                        </span>
                        <div className="flex items-center gap-1 mt-1 md:mt-1.5">
                            <Price amount={data.available_credit_limit} className="text-base md:text-xl font-bold text-white" symbolClassName="text-white" />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default CreditLimit;
