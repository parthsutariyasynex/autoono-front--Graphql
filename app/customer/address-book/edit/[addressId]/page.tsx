"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Addresses from "@/app/components/Addresses";
import { useTranslation } from "@/hooks/useTranslation";

export default function EditAddressPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col lg:flex-row flex-1 min-h-0 w-full">
                <div className="w-full lg:w-56 xl:w-64 flex-shrink-0 bg-surfaceMuted border-b lg:border-b-0 ltr:lg:border-r rtl:lg:border-l border-gray-200" />
                <div className="flex-1 p-4 md:p-10">
                    <div className="max-w-2xl space-y-4 animate-pulse">
                        {Array.from({ length: 7 }).map((_, i) => (
                            <div key={i} className="h-10 bg-gray-200 rounded" />
                        ))}
                    </div>
                </div>
            </div>
        }>
            <EditAddressPageContent />
        </Suspense>
    );
}

function EditAddressPageContent() {
    const { addressId } = useParams();
    const { t } = useTranslation();
    const id = String(addressId);
    const isNew = id === "new";

    return (
        <div className="min-h-screen bg-white text-black">
            <div className="flex flex-col lg:flex-row flex-1 min-h-0 w-full">
                <Sidebar />
                <main className="flex-1 w-full min-w-0 px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-5 bg-white">
                    <Addresses
                        mode={isNew ? "new" : "edit"}
                        addressId={id}
                        title={isNew ? t("addressBook.addNewAddress") : t("addressBook.editAddress")}
                    />
                </main>
            </div>
        </div>
    );
}
