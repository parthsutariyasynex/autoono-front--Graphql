"use client";
import React from "react";
import { useTranslation } from "@/hooks/useTranslation";
import Drawer from "@/components/Drawer";

interface PaymentDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    payment: any;
    order: any;
    customerName: string;
    customerCode: string;
    customerCompany: string;
}

const PaymentDetailModal: React.FC<PaymentDetailModalProps> = ({
    isOpen,
    onClose,
    payment,
    order,
    customerName,
    customerCode,
    customerCompany,
}) => {
    const { t } = useTranslation();

    if (!payment) return null;

    // Format Date to DD-MM-YYYY
    const formatPaymentDate = (dateStr: string) => {
        if (!dateStr) return "-";
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            const dd = String(date.getDate()).padStart(2, "0");
            const mm = String(date.getMonth() + 1).padStart(2, "0");
            const yyyy = date.getFullYear();
            return `${dd}-${mm}-${yyyy}`;
        } catch {
            return dateStr;
        }
    };

    const getStatusLabel = (status: string) => {
        if (!status) return "-";
        const s = status.toLowerCase();
        if (s === "pending") return t("data.Pending") || "Pending";
        if (s === "hold") return t("data.On Hold") || "Hold";
        if (s === "success") return t("common.success") || "Success";
        if (s === "fail") return t("common.failed") || "Fail";
        if (s === "full paid") return t("data.Full Paid") || "Full Paid";
        if (s === "partial paid") return t("data.Partial Paid") || "Partial Paid";
        const capitalized = status.charAt(0).toUpperCase() + status.slice(1);
        const key = `data.${capitalized}`;
        const translated = t(key);
        return translated !== key ? translated : status;
    };

    const getStatusBadgeClasses = (status: string) => {
        const s = (status || "").toLowerCase();
        if (s === "full paid" || s === "success") {
            return "bg-green-50 text-green-700 border-green-200";
        }
        if (s === "fail") {
            return "bg-red-50 text-red-700 border-red-200";
        }
        // pending, hold, partial paid
        return "bg-amber-50 text-amber-700 border-amber-200";
    };

    const paymentDateFormatted = formatPaymentDate(payment.payment_date);
    const paymentFor = payment.order_increment_id
        ? (t("order") !== "order" ? t("order") : "Order")
        : (t("account") !== "account" ? t("account") : "Account");
    const orderNo = payment.order_increment_id || "-";
    const sapOrderNo = order?.sap_order_number || payment.sap_invoice_no || "-";

    const invoiceAmount = order?.grand_total !== undefined
        ? Number(order.grand_total).toFixed(2)
        : (payment.invoice_amount !== undefined ? Number(payment.invoice_amount).toFixed(2) : "-");

    const receivablePayment = order?.receivable_payment !== undefined
        ? Number(order.receivable_payment).toFixed(2)
        : (payment.receivable_payment !== undefined ? Number(payment.receivable_payment).toFixed(2) : invoiceAmount);

    const paidAmount = payment.paid_payment !== undefined
        ? Number(payment.paid_payment).toFixed(2)
        : "0.00";

    const duePayment = (payment.due_payment !== undefined && payment.due_payment !== null)
        ? Number(payment.due_payment).toFixed(2)
        : (receivablePayment !== "-")
            ? Math.max(0, Number(receivablePayment) - Number(paidAmount)).toFixed(2)
            : "-";

    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            title={t("orderDetails.paymentDetail") || "Payment Detail"}
            scrollable={true}
        >
            <div className="flex-1 overflow-y-auto px-5 py-4 divide-y divide-gray-100 bg-white custom-scrollbar">
                {/* Receipt No */}
                <div className="pb-1">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                        {t("orderDetails.receiptNo") || "Receipt No"}
                    </div>
                    <div className="text-xs font-semibold text-[#222222]">
                        {payment.receipt_no || "-"}
                    </div>
                </div>

                {/* Payment Date */}
                <div className="py-1">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                        {t("orderDetails.paymentDate") || "Payment Date"}
                    </div>
                    <div className="text-xs font-semibold text-[#222222]">
                        {paymentDateFormatted}
                    </div>
                </div>

                {/* Contact Name */}
                <div className="py-1">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                        {t("orderDetails.contactName") || "Contact Name"}
                    </div>
                    <div className="text-xs font-semibold text-[#222222]">
                        {payment.customer_name || customerName || "-"}
                    </div>
                </div>

                {/* Customer Code */}
                <div className="py-1">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                        {t("orderDetails.customerCode") || "Customer Code"}
                    </div>
                    <div className="text-xs font-semibold text-[#222222]">
                        {payment.customer_code || customerCode || "-"}
                    </div>
                </div>

                {/* Company Name */}
                <div className="py-1">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                        {t("orderDetails.companyName") || "Company Name"}
                    </div>
                    <div className="text-xs font-semibold text-[#222222]">
                        {payment.company_name || customerCompany || "-"}
                    </div>
                </div>

                {/* Payment Status */}
                <div className="py-1">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                        {t("orderDetails.paymentStatus") || "Payment Status"}
                    </div>
                    <div>
                        <span className={`inline-flex px-2.5 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-tight border ${getStatusBadgeClasses(payment.payment_status)}`}>
                            {getStatusLabel(payment.payment_status)}
                        </span>
                    </div>
                </div>

                {/* Payment For */}
                <div className="py-1">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                        {t("orderDetails.paymentFor") || "Payment For"}
                    </div>
                    <div className="text-xs font-semibold text-[#222222]">
                        {paymentFor}
                    </div>
                </div>

                {/* Order No */}
                <div className="py-1">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                        {t("orderDetails.orderNo") || "Order No"}
                    </div>
                    <div className="text-xs font-semibold text-[#222222]">
                        {orderNo}
                    </div>
                </div>

                {/* SAP Order No */}
                <div className="py-1">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                        {t("orderDetails.sapOrderNo") || "SAP Order No"}
                    </div>
                    <div className="text-xs font-semibold text-[#222222]">
                        {sapOrderNo}
                    </div>
                </div>

                {/* Payment Method */}
                <div className="py-1">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                        {t("orderDetails.paymentMethod") || "Payment Method"}
                    </div>
                    <div className="text-xs font-semibold text-[#222222]">
                        {payment.payment_method || "-"}
                    </div>
                </div>

                {/* Invoice Amount */}
                <div className="py-1">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                        {t("orderDetails.invoiceAmount") || "Invoice Amount"}
                    </div>
                    <div className="text-xs font-semibold text-[#222222]">
                        {invoiceAmount}
                    </div>
                </div>

                {/* Receivable Payment */}
                <div className="py-1">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                        {t("orderDetails.receivablePayment") || "Receivable Payment"}
                    </div>
                    <div className="text-xs font-semibold text-[#222222]">
                        {receivablePayment}
                    </div>
                </div>

                {/* Paid Amount */}
                <div className="py-1">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                        {t("orderDetails.paidAmount") || "Paid Amount"}
                    </div>
                    <div className="text-xs font-semibold text-[#222222]">
                        {paidAmount}
                    </div>
                </div>

                {/* Due Payment */}
                <div className="py-1">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                        {t("orderDetails.duePayment") || "Due Payment"}
                    </div>
                    <div className="text-xs font-semibold text-[#222222]">
                        {duePayment}
                    </div>
                </div>

                {/* Remarks */}
                <div className="py-1">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                        {t("orderDetails.remarks") || "Remarks"}
                    </div>
                    <div className="text-xs font-semibold text-[#222222] leading-relaxed">
                        {payment.remarks || "-"}
                    </div>
                </div>
            </div>
        </Drawer>
    );
};

export default PaymentDetailModal;
