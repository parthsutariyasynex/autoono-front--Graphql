"use client";
import React, { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import { getClientStoreCode } from "@/lib/api/api-client";
import Drawer from "@/components/Drawer";

interface MakePaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    order?: any;
    customerName?: string;
    onSave?: (data: any) => void;
    receivablePayment?: number;
}

const MakePaymentModal: React.FC<MakePaymentModalProps> = ({
    isOpen,
    onClose,
    order,
    customerName: initialCustomerName,
    onSave,
    receivablePayment,
}) => {
    useLockBodyScroll(isOpen);

    const { t, locale, isRtl } = useTranslation();
    const { data: session } = useSession();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(false);

    // Dynamic field states
    const [customerCode, setCustomerCode] = useState("KLV765");
    const [companyName, setCompanyName] = useState("Klever Tech Solutions - FZE");
    const [contactName, setContactName] = useState(initialCustomerName || "");
    const [receivableBalance, setReceivableBalance] = useState<number>(-34230.45);
    const [totalCreditLimit, setTotalCreditLimit] = useState<number>(62355.30);
    const [orderList, setOrderList] = useState<any[]>([]);
    const [localSelectedOrder, setLocalSelectedOrder] = useState<any>(null);
    const [dueAmount, setDueAmount] = useState<number | null>(null);

    const [formData, setFormData] = useState({
        payment_date: new Date().toISOString().split("T")[0],
        payment_method: "",
        paid_payment: "",
        remarks: "",
    });

    // Helper: calculate due amount for dynamically selected order
    const fetchDueAmount = async (ord: any, token: string) => {
        if (!ord) return;
        try {
            const storeCode = getClientStoreCode();
            const res = await fetch(`/api/kleverapi/payment-history?orderId=${ord.entity_id || ord.order_id || ord.id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    ...(storeCode ? { "x-store-code": storeCode } : {}),
                },
            });
            let calculatedDue = ord.grand_total || ord.grandTotal || 0;
            if (res.ok) {
                const data = await res.json();
                const totalPaid = (data.items || []).reduce((sum: number, p: any) => {
                    const amount = parseFloat(p.paid_payment || p.paidAmount || "0");
                    return sum + (isNaN(amount) ? 0 : amount);
                }, 0);
                calculatedDue = Math.max(0, calculatedDue - totalPaid);
            }
            setDueAmount(calculatedDue);
            setFormData((prev) => ({
                ...prev,
                paid_payment: calculatedDue > 0 ? calculatedDue.toFixed(2) : "",
            }));
        } catch (err) {
            console.error("Error calculating due amount:", err);
        }
    };

    // Load data dynamically from APIs
    useEffect(() => {
        if (!isOpen) return;

        const token = (session as any)?.accessToken;
        if (!token) return;

        const loadModalData = async () => {
            setIsLoadingData(true);
            try {
                const storeCode = getClientStoreCode();
                const headers = {
                    Authorization: `Bearer ${token}`,
                    ...(storeCode ? { "x-store-code": storeCode } : {}),
                };

                // Fetch credit limit and customer profile in parallel
                const [creditRes, accountRes] = await Promise.all([
                    fetch("/api/kleverapi/credit-account", { headers }),
                    fetch("/api/kleverapi/my-account", { headers }),
                ]);

                if (creditRes.ok) {
                    const creditData = await creditRes.json();
                    if (creditData && creditData.used_credit_limit !== undefined) {
                        // Receivable (Account Balance) is negative used credit limit
                        setReceivableBalance(-creditData.used_credit_limit);
                    }
                    if (creditData && creditData.total_credit_limit !== undefined) {
                        setTotalCreditLimit(creditData.total_credit_limit);
                    }
                }

                if (accountRes.ok) {
                    const accountData = await accountRes.json();
                    const name = `${accountData.firstname || ""} ${accountData.lastname || ""}`.trim();
                    setContactName(name || initialCustomerName || "");

                    const getAttr = (code: string, fallback: string = "N/A") => {
                        if (accountData[code] !== undefined) return accountData[code];
                        const attr = accountData.custom_attributes?.find(
                            (a: any) => a.attribute_code === code
                        )?.value;
                        return attr ? attr : fallback;
                    };

                    const comp = getAttr("company_name");
                    setCompanyName(comp !== "N/A" ? comp : "Klever Tech Solutions - FZE");

                    const code = getAttr("customer_code");
                    setCustomerCode(code !== "N/A" ? code : "KLV765");
                }

                // Handle order select logic
                if (order) {
                    setLocalSelectedOrder(order);
                    if (receivablePayment !== undefined) {
                        setDueAmount(receivablePayment);
                        setFormData((prev) => ({
                            ...prev,
                            paid_payment: Number(receivablePayment).toFixed(2),
                        }));
                    } else {
                        await fetchDueAmount(order, token);
                    }
                } else {
                    // Fetch recent orders to pick a default payment target
                    const ordersRes = await fetch("/api/kleverapi/my-orders?pageSize=100&currentPage=1", { headers });
                    if (ordersRes.ok) {
                        const ordersData = await ordersRes.json();
                        const items = ordersData.items || [];
                        setOrderList(items);

                        // Find the first unpaid order
                        const unpaid = items.find((o: any) => {
                            const status = (o.status || "").toLowerCase();
                            return status !== "complete" && status !== "closed";
                        });

                        const defaultOrder = unpaid || items[0] || null;
                        setLocalSelectedOrder(defaultOrder);
                        if (defaultOrder) {
                            await fetchDueAmount(defaultOrder, token);
                        }
                    }
                }
            } catch (error) {
                console.error("Error loading payment details:", error);
                toast.error("Failed to load account information dynamically");
            } finally {
                setIsLoadingData(false);
            }
        };

        loadModalData();
    }, [isOpen, order, session, initialCustomerName, receivablePayment]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = (session as any)?.accessToken;

        if (!token) {
            toast.error(t("orderDetails.loginToSubmit") || "Please log in to submit payment");
            return;
        }

        if (!localSelectedOrder) {
            toast.error("No active order selected for payment");
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
            const response = await fetch("/api/kleverapi/payment-history", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                    "x-locale": locale,
                },
                body: JSON.stringify({
                    order_id: localSelectedOrder.entity_id || localSelectedOrder.order_id || localSelectedOrder.id,
                    sap_invoice_no: localSelectedOrder.sap_order_number || localSelectedOrder.sap_invoice_no || "",
                    payment_date: formData.payment_date,
                    payment_method: formData.payment_method,
                    paid_payment: parseFloat(formData.paid_payment),
                    remarks: formData.remarks,
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
            {isLoadingData && (
                <div className="absolute inset-0 z-50 bg-white/80 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-[#1e73be]" />
                        <span className="text-body-sm font-bold text-black/60">Loading order information...</span>
                    </div>
                </div>
            )}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5 bg-white" dir={isRtl ? "rtl" : "ltr"}>
                {/* Order # */}
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">
                        {t("orderDetails.orderNo") || "Order #"}
                    </label>
                    <input
                        type="text"
                        readOnly
                        value={localSelectedOrder?.increment_id || localSelectedOrder?.order_id || ""}
                        className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-sm text-xs text-black outline-none cursor-default font-medium"
                    />
                </div>

                {/* Customer Name */}
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">
                        {t("orderDetails.customerName") || "Customer Name"}
                    </label>
                    <input
                        type="text"
                        readOnly
                        value={contactName}
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
                        value={customerCode}
                        className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-sm text-xs text-black outline-none cursor-default font-medium"
                    />
                </div>

                {/* SAP Invoice No */}
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">
                        {t("orderDetails.sapInvoiceNo") || "SAP Invoice No"}
                    </label>
                    <input
                        type="text"
                        readOnly
                        value={localSelectedOrder?.sap_order_number || localSelectedOrder?.sap_invoice_no || ""}
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
                        <option value="Cash">{t("orderDetails.cash") || "Cash"}</option>
                        <option value="Bank Transfer">{t("orderDetails.bankTransfer") || "Bank Transfer"}</option>
                        <option value="Cheque">{t("orderDetails.check") || "Cheque"}</option>
                        <option value="Card">Card</option>
                    </select>
                </div>

                {/* Invoice Amount */}
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">
                        {t("orderDetails.grandTotal") || "Invoice Amount"}
                    </label>
                    <input
                        type="text"
                        readOnly
                        value={Number(localSelectedOrder?.grand_total || localSelectedOrder?.grandTotal || 0).toFixed(2)}
                        className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-sm text-xs text-black outline-none cursor-default font-medium"
                    />
                </div>

                {/* Receivable Payment */}
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">
                        {t("orderDetails.receivablePayment") || "Receivable Payment"}
                    </label>
                    <input
                        type="text"
                        readOnly
                        disabled
                        value={
                            receivablePayment !== undefined
                                ? Number(receivablePayment).toFixed(2)
                                : (dueAmount !== null ? Number(dueAmount).toFixed(2) : "0.00")
                        }
                        className="w-full px-3 py-1.5 bg-gray-100 border border-gray-300 rounded-sm text-xs text-gray-500 outline-none cursor-not-allowed font-medium"
                    />
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
                        disabled={isSubmitting || isLoadingData}
                        className="w-full bg-[#1e73be] hover:bg-[#155a96] text-white py-2 rounded-sm font-bold text-xs uppercase transition-all active:scale-95 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        {t("orderDetails.submitPayment") || "Submit Payment"}
                    </button>
                </div>
            </form>
        </Drawer>
    );
};

export default MakePaymentModal;
