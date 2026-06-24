// "use client";
// import { useTranslation } from "@/hooks/useTranslation";
// import React, { useEffect, useState } from "react";
// import { useSession } from "next-auth/react";
// import { useRouter, useSearchParams } from "next/navigation";
// import FavouriteProducts from "@/app/components/FavouriteProducts";
// import Sidebar from "@/components/Sidebar";
// import { redirectToLogin } from "@/utils/helpers";
// import { useLocalePath } from "@/hooks/useLocalePath";

// export default function FavoritesPage() {
//     const { status: authStatus } = useSession();
//     const router = useRouter();
//     const { t } = useTranslation();
//     const lp = useLocalePath();
//     const searchParams = useSearchParams();

//     const addedProductName = searchParams.get("added");
//     const [showBanner, setShowBanner] = useState(!!addedProductName);

//     useEffect(() => {
//         if (authStatus === "unauthenticated") {
//             redirectToLogin(router);
//         }
//     }, [authStatus, router]);

//     // Auto-dismiss banner after 6 seconds
//     useEffect(() => {
//         if (!addedProductName) return;
//         setShowBanner(true);
//         const timer = setTimeout(() => setShowBanner(false), 6000);
//         return () => clearTimeout(timer);
//     }, [addedProductName]);

//     if (authStatus === "loading") {
//         return (
//             <div className="min-h-screen flex items-center justify-center bg-white">
//                 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">{...Array.from({length:8}).map((_,i)=><div key={i} className="bg-gray-200 rounded-lg aspect-square"/>)}</div>
//             </div>
//         );
//     }

//     return (
//         <div className="flex flex-col w-full bg-white font-rubik">
//             <div className="flex flex-col lg:flex-row flex-1 w-full">
//                 <Sidebar />

//                 <main className="flex-1 w-full px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-5 bg-white min-w-0">

//                     {/* Green success banner — shown when a product was just added */}
//                     {showBanner && addedProductName && (
//                         <div className="flex items-start gap-3 bg-green-50 border border-green-200 text-green-800 px-4 py-3 mb-6 rounded-sm shadow-sm animate-in fade-in slide-in-from-top duration-300">
//                             <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
//                             </svg>
//                             <div className="flex-1 text-sm font-medium leading-snug">
//                                 <span className="font-bold">{addedProductName}</span>
//                                 {" "}{t("favorites.addedBannerSuffix") || "has been added to your Favourite products."}{" "}
//                                 <button
//                                     onClick={() => router.push(lp("/products"))}
//                                     className="underline underline-offset-2 font-bold hover:text-green-900 transition-colors"
//                                 >
//                                     {t("favorites.continueShopping") || "Click here to continue shopping."}
//                                 </button>
//                             </div>
//                             <button
//                                 onClick={() => setShowBanner(false)}
//                                 className="text-green-500 hover:text-green-800 transition-colors flex-shrink-0 mt-0.5"
//                                 aria-label="Dismiss"
//                             >
//                                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
//                                 </svg>
//                             </button>
//                         </div>
//                     )}

//                     <FavouriteProducts title={null} />
//                 </main>
//             </div>
//         </div>
//     );
// }


"use client";
import { useTranslation } from "@/hooks/useTranslation";
import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import FavouriteProducts from "@/app/components/FavouriteProducts";
import Sidebar from "@/components/Sidebar";
import { redirectToLogin } from "@/utils/helpers";
import { useLocalePath } from "@/hooks/useLocalePath";

export default function FavoritesPage() {
    const { status: authStatus } = useSession();
    const router = useRouter();
    const { t } = useTranslation();
    const lp = useLocalePath();
    const searchParams = useSearchParams();

    const addedProductName = searchParams.get("added");
    const [showBanner, setShowBanner] = useState(!!addedProductName);

    useEffect(() => {
        if (authStatus === "unauthenticated") {
            redirectToLogin(router);
        }
    }, [authStatus, router]);

    // Auto-dismiss banner after 6 seconds
    useEffect(() => {
        if (!addedProductName) return;
        setShowBanner(true);
        const timer = setTimeout(() => setShowBanner(false), 6000);
        return () => clearTimeout(timer);
    }, [addedProductName]);

    if (authStatus === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="bg-gray-200 rounded-lg aspect-square" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full bg-white font-rubik">
            <div className="flex flex-col lg:flex-row flex-1 w-full">
                <Sidebar />

                <main className="flex-1 w-full px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-5 bg-white min-w-0">

                    {/* Green success banner — shown when a product was just added */}
                    {showBanner && addedProductName && (
                        <div className="flex items-start gap-3 bg-green-50 border border-green-200 text-green-800 px-4 py-3 mb-6 rounded-sm shadow-sm">
                            <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="flex-1 text-sm font-medium leading-snug">
                                <span className="font-bold">{addedProductName}</span>
                                {" "}{t("favorites.addedBannerSuffix") || "has been added to your Favourite products."}{" "}
                                <button
                                    onClick={() => router.push(lp("/products"))}
                                    className="underline underline-offset-2 font-bold hover:text-green-900 transition-colors"
                                >
                                    {t("favorites.continueShopping") || "Click here to continue shopping."}
                                </button>
                            </div>
                            <button
                                onClick={() => setShowBanner(false)}
                                className="text-green-500 hover:text-green-800 transition-colors flex-shrink-0 mt-0.5"
                                aria-label="Dismiss"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    )}

                    <FavouriteProducts title={null} />
                </main>
            </div>
        </div>
    );
}
