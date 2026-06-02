"use client";
import { useTranslation } from "@/hooks/useTranslation";
import { useLocalePath } from "@/hooks/useLocalePath";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import { fetchCustomerInfo } from "@/store/actions/customerActions";
import Sidebar from "@/components/Sidebar";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { redirectToLogin } from "@/utils/helpers";
import CreditLimit from "@/app/components/CreditLimit";
import Price from "@/app/components/Price";
import { AccountSkeleton } from "@/components/skeletons";


type CustomAttribute = {
    attribute_code: string;
    value: string;
};

type Address = {
    id?: number | string;
    default_billing?: boolean;
    default_shipping?: boolean;
    firstname?: string;
    lastname?: string;
    street?: string[];
    city?: string;
    postcode?: string;
    country_id?: string;
    telephone?: string;
    company?: string;
};

export default function MyAccountPage() {
    const router = useRouter();
    const { t } = useTranslation();
    const lp = useLocalePath();
    const pathname = usePathname();
    const dispatch = useDispatch<AppDispatch>();
    const { data: session, status } = useSession();
    const { data: customer, loading } = useSelector((state: RootState) => state.customer);
    const token = useSelector((state: RootState) => state.auth.token);

    const [subAccountName, setSubAccountName] = useState("");
    const [isSubAccountSession, setIsSubAccountSession] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const isSub = localStorage.getItem("isSubAccount") === "true";
            setIsSubAccountSession(isSub);
            setSubAccountName(localStorage.getItem("subAccountName") || "");

            // Clear cached parent customer data so the page re-fetches under the sub-account token
            if (isSub) {
                dispatch({ type: "CLEAR_CUSTOMER" });
            }
        }
    }, [pathname, router]);

    useEffect(() => {
        if (status === "unauthenticated") {
            redirectToLogin(router);
            return;
        }

        // Navbar already dispatches fetchCustomerInfo when customer is missing.
        // Skip here unless it really hasn't loaded (direct visit to this URL
        // before Navbar mounts), to avoid a duplicate /my-account call.
        if (status === "authenticated" && token && !customer) {
            dispatch(fetchCustomerInfo());
        }
    }, [status, token, dispatch, router, customer]);

    if (loading || !customer) {
        return (
            <div className="min-h-screen flex flex-col w-full bg-surfacePage">
                <div className="flex flex-col lg:flex-row flex-1 w-full">
                    <Sidebar />
                    <AccountSkeleton />
                </div>
            </div>
        );
    }

    const getAttr = (code: string, fallback: string = "N/A") => {
        if ((customer as any)[code] !== undefined) return (customer as any)[code];
        if ((customer as any).extension_attributes && (customer as any).extension_attributes[code] !== undefined) {
            return (customer as any).extension_attributes[code];
        }
        const attr = (customer as any).custom_attributes?.find(
            (a: CustomAttribute) => a.attribute_code === code
        )?.value;
        return attr ? attr : fallback;
    }

    const formatCurrency = (val: string) => {
        if (!val || val === "N/A") return "0.00";
        const num = parseFloat(val);
        if (isNaN(num)) return val;
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const cardBase = "border border-gray-200 bg-white shadow-sm rounded-none";
    const sectionHeader = "bg-surfaceHover px-4 py-3 border-b border-gray-200 text-black font-bold uppercase text-body";

    const addresses = (customer as any).addresses as Address[] | undefined;
    const defaultBilling = addresses?.find((a: Address) => a.default_billing);
    const defaultShipping = addresses?.find((a: Address) => a.default_shipping);

    const customerMobile = getAttr("mobile") !== "N/A"
        ? getAttr("mobile")
        : getAttr("mobile_number") !== "N/A"
            ? getAttr("mobile_number")
            : defaultBilling?.telephone || defaultShipping?.telephone || addresses?.[0]?.telephone || "N/A";

    const customerCompany = getAttr("company_name") !== "N/A"
        ? getAttr("company_name")
        : defaultBilling?.company || defaultShipping?.company || addresses?.[0]?.company || "N/A";

    const customerLocation = getAttr("location") !== "N/A"
        ? getAttr("location")
        : getAttr("customer_location") !== "N/A"
            ? getAttr("customer_location")
            : defaultBilling?.city
                ? `${defaultBilling.city} ,${defaultBilling.country_id || "SA"}`
                : defaultShipping?.city
                    ? `${defaultShipping.city} ,${defaultShipping.country_id || "SA"}`
                    : "N/A";

    return (
        <>
            <div className="min-h-screen flex flex-col w-full bg-surfacePage">
                <div className="flex flex-col lg:flex-row flex-1 w-full">
                    <Sidebar />

                    {/* Right Content */}
                    <main className="flex-1 w-full px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-10">

                        {/* Sub-account Identity Banner */}
                        {isSubAccountSession && (
                            <div className="bg-successLight border-l-4 border-successCheck text-successDark p-4 mb-8 flex items-center gap-3 animate-in fade-in slide-in-from-top duration-500 shadow-sm" role="alert">
                                <span className="text-successCheck font-bold text-lg">✔</span>
                                <p className="text-body-lg font-medium tracking-tight">
                                    {t("account.youAreLoggedAs")} {subAccountName && <span className="font-bold underline decoration-primary/40 underline-offset-4">{subAccountName}</span>}
                                </p>
                            </div>
                        )}

                        <h1 className="text-h3 sm:text-h3 md:text-[26px] font-bold text-black mb-6 md:mb-10 uppercase tracking-wide">
                            {t("account.title")}
                        </h1>

                        <div className="space-y-8">
                            {/* ACCOUNT INFORMATION */}
                            <div>
                                <h2 className="text-body-lg md:text-h3-sm font-bold text-black uppercase mb-3">{t("account.accountInformation")}</h2>
                                <hr className="border-gray-200 mb-6" />

                                {/* Single card — half-width at xl so it doesn't dominate huge desktops,
                                    but full-width up to lg so the right half isn't empty next to the
                                    256px sidebar at 1024-1279px. */}
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
                                    {/* Contact Information */}
                                    <div className={cardBase}>
                                        <div className={sectionHeader}>
                                            {t("account.contactInformation")}
                                        </div>
                                        <div className="p-3 md:p-5 text-body text-black/80 space-y-2.5 font-medium leading-relaxed">
                                            <p>{t("account.contactName")}: {(customer as any).firstname} {(customer as any).lastname}</p>
                                            <p>{t("account.email")}: {(customer as any).email}</p>
                                            <p>{t("account.customerMobile")}: <bdi dir="ltr">{customerMobile}</bdi></p>
                                            <p>{t("account.companyName")}: {customerCompany}</p>
                                            <p>{t("account.customerCode")}: {getAttr("customer_code")}</p>
                                            <p>{t("m.industry")}: {getAttr("industry") !== "N/A" ? getAttr("industry") : "N/A"}</p>
                                            <p>{t("m.location")}: {customerLocation}</p>
                                            <p>{t("account.contactInformation")}: <bdi dir="ltr">{(customer as any).email}</bdi> ,<bdi dir="ltr">{customerMobile}</bdi></p>

                                            <div className="flex flex-col md:flex-row gap-3 pt-4 md:pt-6">
                                                <Link href={lp("/customer/account/edit")} className="w-full md:w-auto text-center bg-primary hover:bg-primaryHover text-black text-body-sm font-bold px-6 py-2 uppercase transition-all rounded-sm">
                                                    {t("m.edit")}
                                                </Link>
                                                <Link href={lp("/customer/account/edit?change=password")} className="w-full md:w-auto text-center bg-primary hover:bg-primaryHover text-black text-body-sm font-bold px-6 py-2 uppercase transition-all rounded-sm whitespace-nowrap">
                                                    {t("changePassword.title")}
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* 2-col at xl+ (1280+) only — at lg with the account sidebar each card
                                would be ~352px which is too cramped for the multi-line content. */}
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
                                {/* SALES DATA */}
                                <div className={cardBase}>
                                    <div className={sectionHeader}>
                                        {t("m.sales-data-qty")}
                                    </div>
                                    <div className="p-3 md:p-5 text-body text-black/80 space-y-2.5 font-medium leading-relaxed">
                                        <p>{t("m.total-sales-qty")}: {getAttr("total_sales_qty", "0")}</p>
                                        <p>{t("m.order-frequency")}: {getAttr("order_frequency", "0")} {t("account.ordersPerMonth")}</p>
                                    </div>
                                </div>

                                {/* CUSTOMER BEHAVIOR */}
                                <div className={cardBase}>
                                    <div className={sectionHeader}>
                                        {t("m.customer-behavior")}
                                    </div>
                                    <div className="p-3 md:p-5 text-body text-black/80 space-y-2.5 font-medium leading-relaxed">
                                        <p>{t("m.payment-historydso")}: {getAttr("payment_history")}</p>
                                        <p>{t("m.credit-limit")}: <Price amount={getAttr("total_credit_limit")} /></p>
                                        <p>{t("m.credit-period")}: {getAttr("credit_period")} {t("account.days")}</p>
                                    </div>
                                </div>
                            </div>




                            {/* CREDIT ACCOUNT INFORMATION */}
                            <CreditLimit />


                            {/* ADDRESS BOOK */}
                            <div>
                                <h2 className="text-body-lg md:text-h3-sm font-bold text-black uppercase mb-3">{t("addressBook.title")}</h2>
                                <hr className="border-gray-200 mb-6" />

                                {/* Address cards stack until xl — each card needs ~400px+ to
                                    comfortably show street + city + zip + country + phone. */}
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
                                    {/* Default Billing Address Card */}
                                    <div className={cardBase + " flex flex-col"}>
                                        <div className={sectionHeader}>
                                            {t("addressBook.defaultBillingAddress")}
                                        </div>
                                        <div className="p-3 md:p-5 flex flex-col flex-1">
                                            {defaultBilling ? (
                                                <div className="text-body text-black leading-relaxed space-y-1 font-normal flex-1">
                                                    <p>{defaultBilling.firstname} {defaultBilling.lastname}</p>
                                                    <p>{defaultBilling.company}</p>
                                                    {defaultBilling.street?.map((s: string, i: number) => <p key={i}>{s}</p>)}
                                                    <p><bdi dir="ltr">{defaultBilling.city}, {defaultBilling.postcode}</bdi></p>
                                                    <p>{defaultBilling.country_id === 'SA' ? t("data.Saudi Arabia") : defaultBilling.country_id}</p>
                                                    <p>T: <bdi dir="ltr">{defaultBilling.telephone}</bdi></p>
                                                </div>
                                            ) : (
                                                <p className="text-body text-black/60 italic flex-1">{t("addressBook.noBillingAddress")}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Default Shipping Address Card */}
                                    <div className={cardBase + " flex flex-col"}>
                                        <div className={sectionHeader}>
                                            {t("addressBook.defaultShippingAddress")}
                                        </div>
                                        <div className="p-3 md:p-5 flex flex-col flex-1">
                                            {defaultShipping ? (
                                                <div className="text-body text-black leading-relaxed space-y-1 font-normal flex-1">
                                                    <p>{defaultShipping.firstname} {defaultShipping.lastname}</p>
                                                    <p>{defaultShipping.company}</p>
                                                    {defaultShipping.street?.map((s: string, i: number) => <p key={i}>{s}</p>)}
                                                    <p><bdi dir="ltr">{defaultShipping.city}, {defaultShipping.postcode}</bdi></p>
                                                    <p>{defaultShipping.country_id === 'SA' ? t("data.Saudi Arabia") : defaultShipping.country_id}</p>
                                                    <p>T: <bdi dir="ltr">{defaultShipping.telephone}</bdi></p>
                                                </div>
                                            ) : (
                                                <p className="text-body text-black/60 italic flex-1">{t("addressBook.noShippingAddress")}</p>
                                            )}

                                            <div className="pt-4 md:pt-8">
                                                {defaultShipping?.id ? (
                                                    <Link href={lp(`/customer/address-book/edit/${defaultShipping.id}`)} className="w-full md:w-auto text-center bg-primary hover:bg-primaryHover text-black text-body font-bold px-4 md:px-8 py-2.5 uppercase transition-all rounded-none inline-block">
                                                        {t("addressBook.editAddress")}
                                                    </Link>
                                                ) : (
                                                    <Link href={lp("/customer/address-book/edit/new")} className="w-full md:w-auto text-center bg-primary hover:bg-primaryHover text-black text-body font-bold px-4 md:px-8 py-2.5 uppercase transition-all rounded-none inline-block">
                                                        {t("addressBook.addAddress")}
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>


        </>
    );
}
