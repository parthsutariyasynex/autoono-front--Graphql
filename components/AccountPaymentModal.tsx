"use client";
import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { getClientStoreCode } from "@/lib/api/api-client";
import Drawer from "@/app/components/Drawer";

interface AccountPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerName?: string;
    onSave?: (data: any) => void;
}

const AccountPaymentModal: React.FC<AccountPaymentModalProps> = ({
    isOpen,
    onClose,
    customerName: initialCustomerName,
    onSave,
}) => {
    const { t, locale, isRtl } = useTranslation();
    const { data: session } = useSession();
    const [isSubmitting, setIsSubmitting] = useState(false);

    interface AccountData {
        customerCode: string;
        companyName: string;
        contactName: string;
        totalOrderAmount: number;
        totalPaid: number;
        receivableBalance: number;
        paymentMethods: { value: string; label: string | null }[];
    }
    const [account, setAccount] = useState<AccountData | null>(null);

    const [formData, setFormData] = useState({
        payment_date: new Date().toISOString().split("T")[0],
        payment_method: "",
        paid_payment: "",
        remarks: "",
    });

    useEffect(() => {
        if (!isOpen) return;

        const token = (session as any)?.accessToken;
        if (!token) return;

        let cancelled = false;
        setAccount(null);

        const loadModalData = async () => {
            try {
                const storeCode = getClientStoreCode();
                const headers = {
                    Authorization: `Bearer ${token}`,
                    ...(storeCode ? { "x-store-code": storeCode } : {}),
                };

                const [receivableRes, accountRes, methodsRes] = await Promise.all([
                    fetch("/api/kleverapi/payment-history/account-receivable", { headers }),
                    fetch("/api/kleverapi/my-account", { headers }),
                    fetch("/api/kleverapi/payment-history/payment-methods", { headers }),
                ]);
                const [receivableData, accountData, methodsData] = await Promise.all([
                    receivableRes.ok ? receivableRes.json() : null,
                    accountRes.ok ? accountRes.json() : null,
                    methodsRes.ok ? methodsRes.json() : null,
                ]);

                if (cancelled) return;

                const totalOrderAmount = Number(receivableData?.total_order_amount) || 0;
                const totalPaid = Number(receivableData?.total_paid) || 0;
                const receivableBalance = Number(receivableData?.receivable_payment) || 0;

                const getAttr = (code: string) => {
                    if (!accountData) return "";
                    if (accountData[code] !== undefined && accountData[code] !== null) return accountData[code];
                    const attr = accountData.custom_attributes?.find(
                        (a: any) => a.attribute_code === code
                    )?.value;
                    return attr ?? "";
                };
                const name = accountData
                    ? `${accountData.firstname || ""} ${accountData.lastname || ""}`.trim()
                    : "";

                const methodItems = Array.isArray(methodsData?.items) ? methodsData.items : [];
                const paymentMethods = methodItems
                    .filter((m: any) => m && m.value)
                    .map((m: any) => ({ value: String(m.value), label: m.label ?? String(m.value) }));

                setAccount({
                    customerCode: getAttr("customer_code") || "",
                    companyName: getAttr("company_name") || "",
                    contactName: name || initialCustomerName || "",
                    totalOrderAmount,
                    totalPaid,
                    receivableBalance,
                    paymentMethods,
                });
            } catch (error) {
                if (cancelled) return;
                console.error("Error loading account payment details:", error);
                toast.error("Failed to load account information");
                setAccount({
                    customerCode: "",
                    companyName: "",
                    contactName: initialCustomerName || "",
                    totalOrderAmount: 0,
                    totalPaid: 0,
                    receivableBalance: 0,
                    paymentMethods: [],
                });
            }
        };

        loadModalData();
        return () => {
            cancelled = true;
        };
    }, [isOpen, session, initialCustomerName]);

    const isLoadingData = account === null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = (session as any)?.accessToken;

        if (!token) {
            toast.error(t("orderDetails.loginToSubmit") || "Please log in to submit payment");
            return;
        }
        if (!formData.paid_payment || parseFloat(formData.paid_payment) <= 0) {
            toast.error(t("orderDetails.enterPaidAmount") || "Please enter a valid paid amount");
            return;
        }
        if (!formData.payment_method) {
            toast.error(t("orderDetails.selectPaymentMethod") || "Please select a payment method");
            return;
        }

        setIsSubmitting(true);
        const toastId = toast.loading(t("orderDetails.submittingPayment") || "Submitting payment...");

        try {
            const postStoreCode = getClientStoreCode();
            const response = await fetch("/api/kleverapi/payment-history/account", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                    "x-locale": locale,
                    ...(postStoreCode ? { "x-store-code": postStoreCode } : {}),
                },
                body: JSON.stringify({
                    payment_date: formData.payment_date,
                    payment_method: formData.payment_method,
                    paid_payment: parseFloat(formData.paid_payment),
                    remarks: formData.remarks,
                    receivablePayment: account?.receivableBalance ?? null,
                }),
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || t("orderDetails.paymentSubmitFailed") || "Payment submission failed");
            }

            toast.success(t("orderDetails.paymentSubmitSuccess") || "Payment submitted successfully!", { id: toastId });
            onSave?.(result);
            onClose();
        } catch (error: any) {
            toast.error(error.message || t("m.something-went-wrong") || "Something went wrong", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            title={t("orders.makePayment") || "Make Payment"}
            scrollable={true}
        >
            {isLoadingData || !account ? (
                <div className="flex-1 p-6 space-y-5 bg-white animate-pulse" dir={isRtl ? "rtl" : "ltr"}>
                    {/* Pulsing form fields skeletons */}
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="space-y-2">
                            {/* Label skeleton */}
                            <div className="h-3 bg-gray-200 rounded-sm w-32"></div>
                            {/* Input skeleton */}
                            <div className="h-10 bg-gray-100 border border-gray-200 rounded-sm w-full"></div>
                        </div>
                    ))}
                    {/* Submit Button skeleton */}
                    <div className="pt-2">
                        <div className="h-11 bg-gray-200 rounded-sm w-full"></div>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5 bg-white" dir={isRtl ? "rtl" : "ltr"}>
                    {/* Total Order Amount */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">
                            {t("orderDetails.totalOrderAmount") || "Total Order Amount"}
                        </label>
                        <input
                            type="text"
                            readOnly
                            value={Number(account.totalOrderAmount).toFixed(2)}
                            className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-sm text-xs text-black outline-none cursor-default font-medium"
                        />
                    </div>

                    {/* Receivable (Account Balance) */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">
                            {t("orderDetails.receivableAccountBalance") || "Receivable (Account Balance)"}
                        </label>
                        <input
                            type="text"
                            readOnly
                            value={Number(account.receivableBalance).toFixed(2)}
                            className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-sm text-xs text-black outline-none cursor-default font-medium"
                        />
                    </div>

                    {/* Contact Name */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">
                            {t("orderDetails.contactName") || "Contact Name"}
                        </label>
                        <input
                            type="text"
                            readOnly
                            value={account.contactName}
                            className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-sm text-xs text-black outline-none cursor-default font-medium"
                        />
                    </div>

                    {/* Customer Code */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">
                            {t("orderDetails.customerCode") || "Customer Code"}
                        </label>
                        <input
                            type="text"
                            readOnly
                            value={account.customerCode}
                            className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-sm text-xs text-black outline-none cursor-default font-medium"
                        />
                    </div>

                    {/* Company Name */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">
                            {t("orderDetails.companyName") || "Company Name"}
                        </label>
                        <input
                            type="text"
                            readOnly
                            value={account.companyName}
                            className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-sm text-xs text-black outline-none cursor-default font-medium"
                        />
                    </div>

                    {/* Payment Date */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">
                            {t("orderDetails.paymentDate") || "Payment Date"} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            value={formData.payment_date}
                            onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                            className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-sm text-xs text-black outline-none focus:border-[#1e73be] transition-colors cursor-pointer font-medium"
                        />
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">
                            {t("orderDetails.paymentMethod") || "Payment Method"} <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.payment_method}
                            onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                            className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-sm text-xs text-black outline-none focus:border-[#1e73be] transition-colors font-medium cursor-pointer"
                        >
                            <option value="">{t("orderDetails.selectOption") || "-- Select --"}</option>
                            {(account.paymentMethods.length > 0
                                ? account.paymentMethods
                                : [
                                    { value: "Cash", label: t("orderDetails.cash") || "Cash" },
                                    { value: "Bank Transfer", label: t("orderDetails.bankTransfer") || "Bank Transfer" },
                                    { value: "Cheque", label: t("orderDetails.check") || "Cheque" },
                                    { value: "Card", label: "Card" },
                                ]
                            ).map((m) => (
                                <option key={m.value} value={m.value}>
                                    {m.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Paid Payment */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">
                            {t("orderDetails.paidPayment") || "Paid Payment"} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            value={formData.paid_payment}
                            onChange={(e) => setFormData({ ...formData, paid_payment: e.target.value })}
                            className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-sm text-xs text-black outline-none focus:border-[#1e73be] transition-colors font-medium"
                        />
                    </div>

                    {/* Remarks */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">
                            {t("orderDetails.remarks") || "Remarks"}
                        </label>
                        <textarea
                            value={formData.remarks}
                            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-sm text-xs text-black outline-none focus:border-[#1e73be] transition-colors resize-none font-medium h-[60px]"
                        />
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-[#1e73be] hover:bg-[#155a96] text-white py-2 rounded-sm font-bold text-xs uppercase transition-all active:scale-95 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            {t("orderDetails.submitPayment") || "Submit Payment"}
                        </button>
                    </div>
                </form>
            )}
        </Drawer>
    );
};

export default AccountPaymentModal;
