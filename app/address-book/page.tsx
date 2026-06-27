"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { api } from "@/lib/api/api-client";
import { useTranslation } from "@/hooks/useTranslation";
import { useLocalePath } from "@/hooks/useLocalePath";

interface Address {
    id: number | string;
    firstname: string | null;
    lastname: string | null;
    street: string[] | null;
    city: string | null;
    region: { region: string | null; region_id: number | null } | null;
    postcode: string | null;
    country_code: string | null;
    telephone: string | null;
    default_billing: boolean | null;
    default_shipping: boolean | null;
}

function countryDisplay(code: string | null): string {
    if (!code) return "";
    try {
        return new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) ?? code;
    } catch {
        return code;
    }
}

function AddressCard({ address }: { address: Address }) {
    const name = [address.firstname, address.lastname].filter(Boolean).join(" ");
    const street = Array.isArray(address.street) ? (address.street[0] ?? "") : (address.street ?? "");
    const cityPostcode = [address.city, address.postcode].filter(Boolean).join(", ");
    const country = countryDisplay(address.country_code);
    return (
        <div className="space-y-0.5 text-sm text-black">
            {name && <p>{name}</p>}
            {street && <p>{street}</p>}
            {cityPostcode && <p>{cityPostcode}</p>}
            {country && <p>{country}</p>}
            {address.telephone && <p>T: {address.telephone}</p>}
        </div>
    );
}

function Skeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="h-7 w-44 bg-gray-200 rounded" />
            <div className="flex items-center gap-4">
                <div className="h-4 w-40 bg-gray-200 rounded" />
                <div className="h-[1px] flex-1 bg-gray-200" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[0, 1].map(i => (
                    <div key={i} className="border border-[#ddd]">
                        <div className="bg-surfaceHover px-4 py-3 border-b border-[#ddd]">
                            <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
                        </div>
                        <div className="p-4 space-y-2">
                            {Array.from({ length: 5 }).map((_, j) => (
                                <div key={j} className="h-4 bg-gray-200 rounded" style={{ width: `${60 + j * 8}%` }} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function AddressBookContent() {
    const { t } = useTranslation();
    const lp = useLocalePath();
    // null  = not fetched yet (still loading)
    // []    = fetched and confirmed empty
    // [...] = fetched with real data
    const [addresses, setAddresses] = useState<Address[] | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log("[AddressBookPage] mounted");

        const init = async () => {
            try {
                console.log("[AddressBookPage] fetching addresses...");
                const addressData = await api.get("/kleverapi/addresses").catch((err: any) => {
                    console.log("[AddressBookPage] addresses fetch error:", err);
                    return [];
                });
                console.log("ADDRESS API RESPONSE:", addressData);
                const mapped = Array.isArray(addressData) ? addressData : [];
                console.log("MAPPED ADDRESSES:", mapped);
                console.log("default_billing flags:", mapped.map((a: any) => ({
                    id: a.id,
                    default_billing: a.default_billing,
                    default_shipping: a.default_shipping,
                })));
                setAddresses(mapped);
            } catch (err) {
                console.log("[AddressBookPage] unexpected error:", err);
                setAddresses([]);
            } finally {
                setLoading(false);
            }
        };

        init();
    }, []);

    // Hold skeleton until loading is done AND addresses have been set.
    if (loading || addresses === null) return <Skeleton />;

    const defaultBilling = addresses.find(a => a.default_billing) ?? null;
    const defaultShipping = addresses.find(a => a.default_shipping) ?? null;
    const additional = addresses.filter(a => !a.default_billing && !a.default_shipping);

    return (
        <>
            {/* Page title */}
            <div className="flex items-center gap-4 mb-6">
                <h1 className="text-h3 md:text-h1-sm font-semibold text-black uppercase tracking-tight whitespace-nowrap">
                    {t("addressBook.title")}
                </h1>
            </div>

            {/* ── DEFAULT ADDRESSES ── */}
            <div className="mb-8">
                <div className="flex items-center gap-4 mb-4">
                    <h2 className="text-sm font-bold text-black uppercase tracking-widest whitespace-nowrap">
                        {t("addressBook.defaultAddresses")}
                    </h2>
                    <div className="h-[1px] flex-1 bg-gray-300" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Default Billing */}
                    <div className="border border-[#ddd] shadow-sm">
                        <div className="bg-surfaceHover px-4 py-3 border-b border-[#ddd]">
                            <h3 className="text-xs font-bold text-black uppercase tracking-widest ltr:text-left rtl:text-right">
                                {t("addressBook.defaultBillingAddress")}
                            </h3>
                        </div>
                        <div className="p-4 flex flex-col gap-4">
                            {defaultBilling ? (
                                <AddressCard address={defaultBilling} />
                            ) : (
                                <p className="text-sm text-black/50 italic">
                                    {t("addressBook.noBillingAddress")}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Default Shipping */}
                    <div className="border border-[#ddd] shadow-sm">
                        <div className="bg-surfaceHover px-4 py-3 border-b border-[#ddd]">
                            <h3 className="text-xs font-bold text-black uppercase tracking-widest ltr:text-left rtl:text-right">
                                {t("addressBook.defaultShippingAddress")}
                            </h3>
                        </div>
                        <div className="p-4 flex flex-col gap-4">
                            {defaultShipping ? (
                                <>
                                    <AddressCard address={defaultShipping} />
                                    <div>
                                        <Link
                                            href={lp(`/address-book/edit/${defaultShipping.id}`)}
                                            className="inline-block bg-[#3b71a8] hover:bg-black text-white text-xs font-bold px-6 py-2.5 uppercase tracking-wider transition-colors"
                                        >
                                            {t("addressBook.editShippingAddress")}
                                        </Link>
                                    </div>
                                </>
                            ) : (
                                <p className="text-sm text-black/50 italic">
                                    {t("addressBook.noShippingAddress")}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── ADDITIONAL ADDRESS ENTRIES ── */}
            <div className="mb-8">
                <div className="flex items-center gap-4 mb-4">
                    <h2 className="text-sm font-bold text-black uppercase tracking-widest whitespace-nowrap">
                        {t("addressBook.additionalAddresses")}
                    </h2>
                    <div className="h-[1px] flex-1 bg-gray-300" />
                </div>

                {additional.length === 0 ? (
                    <p className="text-sm text-[#3b71a8]">
                        {t("addressBook.noAdditionalAddresses")}
                    </p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {additional.map(addr => (
                            <div key={addr.id} className="border border-[#ddd] shadow-sm p-4 flex flex-col gap-3">
                                <AddressCard address={addr} />
                                <Link
                                    href={lp(`/address-book/edit/${addr.id}`)}
                                    className="text-xs font-bold text-[#3b71a8] hover:underline uppercase self-start"
                                >
                                    {t("addressBook.edit")}
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

export default function AddressBookPage() {
    return (
        <div className="flex flex-col lg:flex-row flex-1 min-h-0 w-full">
            <Sidebar />
            <main className="flex-1 w-full min-w-0 px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-5 bg-white">
                <AddressBookContent />
            </main>
        </div>
    );
}
