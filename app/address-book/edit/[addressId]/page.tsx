"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Addresses from "@/components/Addresses";
import { useTranslation } from "@/hooks/useTranslation";
import { api } from "@/lib/api/api-client";

type PermissionState = "loading" | "allowed" | "denied";

function EditAddressSkeleton() {
    return (
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
    );
}

function NoPermissionWarning({ title }: { title: string }) {
    return (
        <div className="min-h-screen bg-white text-black">
            <div className="flex flex-col lg:flex-row flex-1 min-h-0 w-full">
                <Sidebar />
                <main className="flex-1 w-full min-w-0 px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-5 bg-white">
                    <div className="flex items-center gap-4 mb-5">
                        <h1 className="text-h3 md:text-h1-sm font-semibold text-black uppercase tracking-tight">
                            {title}
                        </h1>
                    </div>
                    <div className="flex items-start gap-3 bg-[#fef9ec] border border-[#f5c842] rounded-sm px-4 py-3">
                        <svg className="w-5 h-5 text-[#b8860b] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm text-[#7a5c00] font-medium">
                            Please contact BTire admin or sales developer to add new address.
                        </p>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default function EditAddressPage() {
    return (
        <Suspense fallback={<EditAddressSkeleton />}>
            <EditAddressPageContent />
        </Suspense>
    );
}

function EditAddressPageContent() {
    const { addressId } = useParams();
    const { t } = useTranslation();
    const id = String(addressId);
    const isNew = id === "new";
    const pageTitle = isNew ? t("addressBook.addNewAddress") : t("addressBook.editAddress");

    const [permission, setPermission] = useState<PermissionState>("loading");

    useEffect(() => {
        const checkEditPermission = async () => {
            try {
                // Read user_type from the sidebar cache that the Sidebar component
                // already populates. Avoids a concurrent call to the same Magento
                // endpoint which causes the sidebar to revert to the fallback set.
                let userType = "";
                try {
                    const cached = localStorage.getItem("sidebar_cache_v2");
                    if (cached) {
                        const parsed = JSON.parse(cached);
                        userType = parsed?.user_type ?? "";
                    }
                } catch {}

                // Fetch subaccount permission definitions (needed only for subaccounts).
                // Only hit the sidebar API if the cache is empty (very first load ever).
                let permDefs: any[] = [];
                if (!userType) {
                    const [sidebarData, defs] = await Promise.all([
                        api.get("/kleverapi/account-sidebar").catch(() => null),
                        api.get("/kleverapi/subaccount-permissions").catch(() => []),
                    ]);
                    userType = sidebarData?.user_type ?? "";
                    permDefs = Array.isArray(defs) ? defs : [];
                } else if (userType === "subaccount") {
                    // Only need permission definitions for sub-accounts.
                    permDefs = await api.get("/kleverapi/subaccount-permissions").catch(() => []);
                }

                // Regular B2C customers always have address-edit permission.
                if (userType === "customer") {
                    setPermission("allowed");
                    return;
                }

                // Sub-accounts: check whether the backend granted them the
                // "Can Manage Address Book" permission. The permission code and
                // its numeric value both come from the API — nothing is hardcoded.
                if (userType === "subaccount") {
                    const subAccountId =
                        typeof window !== "undefined"
                            ? localStorage.getItem("subAccountId")
                            : null;

                    if (!subAccountId) {
                        setPermission("denied");
                        return;
                    }

                    const subAccount = await api
                        .get(`/kleverapi/subaccounts/${subAccountId}`)
                        .catch(() => null);

                    // Find the address-book permission entry in the API definitions.
                    const addressPermDef = Array.isArray(permDefs)
                        ? permDefs.find(
                            (p: any) =>
                                typeof p.code === "string" &&
                                p.code === "account_address_book_modification_permission"
                        )
                        : null;

                    if (!addressPermDef) {
                        // Backend returned no matching definition → deny.
                        setPermission("denied");
                        return;
                    }

                    // The sub-account's permissions array may be a list of individual
                    // values or a single bitmask. Check both forms.
                    const granted: (number | string)[] = subAccount?.permissions ?? [];
                    const permValue = Number(addressPermDef.value);

                    const hasPermission =
                        granted.length === 1
                            // Possibly a packed bitmask stored as a single entry.
                            ? (Number(granted[0]) & permValue) !== 0
                            // Array of individual permission values.
                            : granted.some((v) => Number(v) === permValue);

                    setPermission(hasPermission ? "allowed" : "denied");
                    return;
                }

                // Any other user type (e.g. "Master Company", B2B company accounts)
                // does not have self-service address editing on this platform.
                setPermission("denied");
            } catch {
                // Unexpected failure → deny (safe default).
                setPermission("denied");
            }
        };

        checkEditPermission();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    if (permission === "loading") {
        return <EditAddressSkeleton />;
    }

    if (permission === "denied") {
        return <NoPermissionWarning title={pageTitle} />;
    }

    return (
        <div className="min-h-screen bg-white text-black">
            <div className="flex flex-col lg:flex-row flex-1 min-h-0 w-full">
                <Sidebar />
                <main className="flex-1 w-full min-w-0 px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-5 bg-white">
                    <Addresses
                        mode={isNew ? "new" : "edit"}
                        addressId={id}
                        title={pageTitle}
                    />
                </main>
            </div>
        </div>
    );
}
