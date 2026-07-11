"use client";
import React, { useState, useEffect } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import Drawer from "@/components/Drawer";

interface EditPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    payment: any;
    order: any;
    customerName: string;
    onSave?: (data: any) => void;
}

const EditPaymentModal: React.FC<EditPaymentModalProps> = ({ isOpen, onClose, payment, order, customerName, onSave }) => {
    const { t, locale, isRtl } = useTranslation();
    const { data: session } = useSession();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        sap_invoice_no: "",
        payment_date: "",
        payment_method: "",
        paid_payment: "",
        receiver_name: "",
        remarks: "",
        comment1: "",
        comment2: "",
        proof: null as File | null
    });

    useEffect(() => {
        if (isOpen && payment) {
            setFormData({
                sap_invoice_no: payment.sap_invoice_no || "",
                payment_date: payment.payment_date ? new Date(payment.payment_date).toISOString().split("T")[0] : "",
                payment_method: payment.payment_method || "Cash",
                paid_payment: payment.paid_payment?.toString() || "",
                receiver_name: payment.receiver_name || "",
                remarks: payment.remarks || "",
                comment1: payment.comment1 || "",
                comment2: payment.comment2 || "",
                proof: null
            });
        }
    }, [isOpen, payment]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData({ ...formData, proof: e.target.files[0] });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = (session as any)?.accessToken;

        if (!token) {
            toast.error(t("orderDetails.loginToUpdate"));
            return;
        }

        setIsSubmitting(true);
        const toastId = toast.loading(t("orderDetails.updatingPayment"));

        try {
            const response = await fetch(`/api/kleverapi/payment-history/${payment.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                    "x-locale": locale,
                },
                body: JSON.stringify({
                    id: payment.id,
                    order_id: order.entity_id || order.id,
                    sap_invoice_no: formData.sap_invoice_no,
                    payment_date: formData.payment_date,
                    payment_method: formData.payment_method,
                    paid_payment: formData.paid_payment,
                    receiver_name: formData.receiver_name,
                    remarks: formData.remarks,
                    comment1: formData.comment1,
                    comment2: formData.comment2
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || t("orderDetails.updateFailed"));
            }

            toast.success(t("orderDetails.paymentUpdated"), { id: toastId });
            onSave?.(result);
            onClose();
        } catch (error: any) {
            toast.error(error.message || t("m.something-went-wrong"), { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!payment || !order) return null;

    const labelClass = "text-label font-bold text-black/80 uppercase tracking-widest block mb-1.5";
    const inputClass = "w-full px-3 py-2.5 bg-white border border-gray-200 rounded-sm text-body text-black outline-none focus:border-black transition-colors";
    const readOnlyClass = "w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-sm text-body text-black/60 outline-none";

    return (
        <Drawer isOpen={isOpen} onClose={onClose}>
            <form onSubmit={handleSubmit} className="flex flex-col h-full bg-white" dir={isRtl ? "rtl" : "ltr"}>
                {/* Header */}
                <div className="bg-black text-white px-4 sm:px-5 md:px-6 py-4 flex-shrink-0 ltr:pr-14 rtl:pl-14">
                    <h2 className="text-body-lg font-bold uppercase tracking-wide">{t("orderDetails.editPayment")}</h2>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-5 md:px-6 py-5 space-y-5">
                    {/* Receipt No */}
                    <div>
                        <label className={labelClass}>{t("orderDetails.receiptNo")}</label>
                        <input type="text" readOnly value={payment.receipt_no || "N/A"} className={readOnlyClass} />
                    </div>

                    {/* Order ID */}
                    <div>
                        <label className={labelClass}>{t("orderDetails.orderIdLabel")}</label>
                        <input type="text" readOnly value={payment.order_increment_id || order.increment_id} className={readOnlyClass} />
                    </div>

                    {/* Customer Name */}
                    <div>
                        <label className={labelClass}>{t("m.customer-name")}</label>
                        <input type="text" readOnly value={payment.customer_name || customerName} className={readOnlyClass} />
                    </div>

                    {/* Customer Code */}
                    <div>
                        <label className={labelClass}>{t("m.customer-code")}</label>
                        <input type="text" readOnly value={payment.customer_code || order.customerCode || "N/A"} className={readOnlyClass} />
                    </div>

                    {/* SAP Invoice No */}
                    <div>
                        <label className={labelClass}>{t("orderDetails.sapInvoiceNo")}</label>
                        <input
                            type="text"
                            value={formData.sap_invoice_no}
                            onChange={(e) => setFormData({ ...formData, sap_invoice_no: e.target.value })}
                            className={inputClass}
                        />
                    </div>

                    {/* Payment Date */}
                    <div>
                        <label className={labelClass}>{t("orderDetails.paymentDate")}</label>
                        <input
                            type="date"
                            value={formData.payment_date}
                            onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                            className={inputClass}
                        />
                    </div>

                    {/* Payment Method */}
                    <div>
                        <label className={labelClass}>{t("orderDetails.paymentMethod")}</label>
                        <select
                            value={formData.payment_method}
                            onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                            className={inputClass}
                        >
                            <option value="Cash">{t("orderDetails.cash") || "Cash"}</option>
                            <option value="Bank Transfer">{t("orderDetails.bankTransfer") || "Bank Transfer"}</option>
                            <option value="Cheque">{t("orderDetails.check") || "Cheque"}</option>
                            <option value="Card">Card</option>
                        </select>
                    </div>

                    {/* Invoice Amount */}
                    <div>
                        <label className={labelClass}>{t("orderDetails.invoiceAmount")}</label>
                        <input type="text" readOnly value={payment.invoice_amount || order.grand_total} className={readOnlyClass} />
                    </div>

                    {/* Receivable Payment */}
                    <div>
                        <label className={labelClass}>{t("orderDetails.receivablePayment")}</label>
                        <input type="text" readOnly value={payment.receivable_payment || order.receivable_payment} className={readOnlyClass} />
                    </div>

                    {/* Paid Payment */}
                    <div>
                        <label className={labelClass}>{t("orderDetails.paidPayment")}</label>
                        <input
                            type="number"
                            value={formData.paid_payment}
                            onChange={(e) => setFormData({ ...formData, paid_payment: e.target.value })}
                            className={inputClass}
                        />
                    </div>

                    {/* Receiver Name */}
                    <div>
                        <label className={labelClass}>{t("orderDetails.receiverName")}</label>
                        <input
                            type="text"
                            value={formData.receiver_name}
                            onChange={(e) => setFormData({ ...formData, receiver_name: e.target.value })}
                            className={inputClass}
                        />
                    </div>

                    {/* Proof Upload */}
                    <div>
                        <label className={labelClass}>{t("orderDetails.uploadProof")}</label>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-3">
                                <label className="inline-flex items-center px-3 py-1 rounded-sm bg-gray-100 hover:bg-gray-200 text-black/80 text-label font-bold cursor-pointer transition-colors">
                                    {t("orderDetails.chooseFile")}
                                    <input type="file" onChange={handleFileChange} className="hidden" />
                                </label>
                                <span className="text-label text-black/60 truncate">
                                    {formData.proof?.name || t("orderDetails.noFileChosen")}
                                </span>
                            </div>
                            <p className="text-caption text-black/50">{t("orderDetails.noProofUploaded")}</p>
                        </div>
                    </div>

                    {/* Remarks */}
                    <div>
                        <label className={labelClass}>{t("orderDetails.remarks")}</label>
                        <textarea
                            value={formData.remarks}
                            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                            rows={2}
                            className={`${inputClass} resize-none`}
                        />
                    </div>

                    {/* Comment 1 */}
                    <div>
                        <label className={labelClass}>{t("orderDetails.comment1")}</label>
                        <input
                            type="text"
                            value={formData.comment1}
                            onChange={(e) => setFormData({ ...formData, comment1: e.target.value })}
                            className={inputClass}
                        />
                    </div>

                    {/* Comment 2 */}
                    <div>
                        <label className={labelClass}>{t("orderDetails.comment2")}</label>
                        <input
                            type="text"
                            value={formData.comment2}
                            onChange={(e) => setFormData({ ...formData, comment2: e.target.value })}
                            className={inputClass}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-surfacePage px-4 sm:px-5 md:px-6 py-4 border-t border-gray-100 flex justify-end flex-shrink-0">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-primary hover:bg-primaryHover text-white px-10 py-2.5 rounded-sm font-bold text-body transition-all shadow-md active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        
                        {t("orderDetails.saveChanges")}
                    </button>
                </div>
            </form>
        </Drawer>
    );
};

export default EditPaymentModal;
