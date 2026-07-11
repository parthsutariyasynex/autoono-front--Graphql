"use client";

import { useState, useMemo } from "react";
import { formatPrice } from "@/utils/helpers";
import { toast } from "react-hot-toast";
import { getSession } from "next-auth/react";
import Drawer from "./Drawer";
import Price from "./Price";
import { useTranslation } from "@/hooks/useTranslation";


interface ProductEnquiryModalProps {
    productSku: string;
    productName: string;
    productPrice: number | string;
    isOpen: boolean;
    onClose: () => void;
}

export default function ProductEnquiryModal({
    productSku,
    productName,
    productPrice,
    isOpen,
    onClose,
}: ProductEnquiryModalProps) {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        quantity: "1",
        comment: "",
        notifyStock: true,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Derived product details for display
    const productDetails = useMemo(() => {
        if (!productName) return { brand: "N/A", size: "N/A", pattern: "N/A", year: "N/A" };

        const parts = productName.split(" ");
        if (parts.length < 4) {
            return { brand: parts[0] || "N/A", size: "N/A", pattern: "N/A", year: "N/A" };
        }

        const brand = parts[0];
        const year = parts[parts.length - 1];
        const pattern = parts[parts.length - 2];
        const size = parts.slice(1, parts.length - 2).join(" ");

        return { brand, size, pattern, year };
    }, [productName]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (parseInt(formData.quantity) <= 0) {
            toast.error(t("inquiry.qtyError"));
            return;
        }

        setIsSubmitting(true);

        try {
            const session: any = await getSession();
            const token = session?.accessToken;

            const payload = {
                productSku,
                productName,
                qty: parseInt(formData.quantity),
                comment: formData.comment,
                notifyStock: formData.notifyStock
            };

            const response = await fetch("/api/kleverapi/enquiry", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Something went wrong");
            }

            toast.success(t("inquiry.enquirySuccess"));
            onClose();
            // Reset form
            setFormData({
                quantity: "1",
                comment: "",
                notifyStock: true,
            });
        } catch (error: any) {
            console.error("Enquiry submission error:", error);
            toast.error(error.message || "Failed to submit enquiry.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Drawer isOpen={isOpen} onClose={onClose}>
            <div className="flex flex-col h-full bg-white font-sans">
                {/* HEADER */}
                <div className="bg-primary py-6 flex items-center justify-center relative flex-shrink-0">
                    <h2 className="text-[18px] font-bold text-black uppercase tracking-tight">{t("inquiry.title")}</h2>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1 pb-10">
                    {/* Product Info Section (Matches provided Image Layout) */}
                    <div className="px-1 space-y-5">
                        <div className="space-y-1">
                            <h3 className="text-h3-sm font-bold text-black leading-none">{t("inquiry.name")}</h3>
                            <p className="text-[15px] text-black leading-snug truncate-none">
                                {productName}
                            </p>
                        </div>

                        <div className="space-y-1">
                            <h3 className="text-h3-sm font-bold text-black leading-none">{t("inquiry.price")}</h3>
                            <div className="text-[18px] text-black price currency-riyal">

                                <Price amount={productPrice} />

                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Quantity */}
                        <div className="space-y-2">
                            <label className="text-h3-sm font-bold text-black leading-none">{t("inquiry.orderQuantity")}</label>
                            <input
                                required
                                type="number"
                                min="1"
                                className="w-full px-4 py-3.5 bg-white border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary transition-all text-base font-medium shadow-sm"
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                            />
                        </div>

                        {/* Comment */}
                        <div className="space-y-2">
                            <label className="text-h3-sm font-bold text-black leading-none">{t("inquiry.notesComments")}</label>
                            <textarea
                                rows={4}
                                placeholder={t("inquiry.placeholder")}
                                className="w-full px-4 py-3.5 bg-white border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary transition-all text-base resize-none shadow-sm"
                                value={formData.comment}
                                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                            />
                        </div>

                        {/* Checkbox */}
                        <div className="py-2">
                            <label className="flex items-center gap-4 cursor-pointer group select-none">
                                <div className="relative flex items-center">
                                    <input
                                        type="checkbox"
                                        className="h-6 w-6 cursor-pointer accent-primary rounded-md border-gray-300 transition-all"
                                        checked={formData.notifyStock}
                                        onChange={(e) => setFormData({ ...formData, notifyStock: e.target.checked })}
                                    />
                                </div>
                                <span className="text-[15px] font-bold text-black/80 group-hover:text-black transition-colors">
                                    {t("inquiry.notifyStock")}
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* SUBMIT BUTTON */}
                    <div className="pt-6">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-4.5 px-10 bg-primary hover:bg-primaryHover text-black font-bold rounded-lg transition-all text-sm uppercase tracking-widest shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-h-[56px] cursor-pointer"
                        >
                            <span className={isSubmitting ? "opacity-50" : ""}>{t("inquiry.submitEnquiry")}</span>
                        </button>
                    </div>

                    {/* <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-4 text-center text-xs font-bold text-black/50 hover:text-black uppercase tracking-widest transition-colors mt-2 cursor-pointer"
                    >
                        Close Panel
                    </button> */}
                </form>
            </div>
        </Drawer>
    );
}
