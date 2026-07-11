"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { formatPrice } from "@/utils/helpers";
import { toast } from "react-hot-toast";
import Drawer from "./Drawer";
import Price from "./Price";
import { useTranslation } from "@/hooks/useTranslation";


interface InquiryModalProps {
    product: any;
    isOpen: boolean;
    onClose: () => void;
}

export default function InquiryModal({ product, isOpen, onClose }: InquiryModalProps) {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        message: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!product) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            toast.success(t("inquiry.success"));
            onClose();
        } catch (error) {
            toast.error(t("inquiry.failed"));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Drawer isOpen={isOpen} onClose={onClose}>
            <div className="flex flex-col h-full bg-white overflow-hidden">
                {/* Header - Keeps same styling but fits in drawer */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
                    <h2 className="text-xl font-bold text-black">{t("inquiry.title")}</h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1 pb-10">
                    {/* Product Summary */}
                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 mb-2">
                        <div className="flex gap-4">
                            {product.image_url && (
                                <img
                                    src={product.image_url}
                                    alt={product.name}
                                    className="w-20 h-20 object-cover rounded-lg border bg-white shadow-sm"
                                />
                            )}
                            <div className="flex-1">
                                <h3 className="font-bold text-black text-base mb-2 italic uppercase">{product.name || "Product Inquiry"}</h3>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                    <div className="space-y-0.5">
                                        <p className="text-caption text-black/50 uppercase font-bold tracking-widest">Brand</p>
                                        <p className="text-xs font-bold text-black/80">{product?.name ? product.name.split(' ')[0] : "N/A"}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-caption text-black/50 uppercase font-bold tracking-widest">Size</p>
                                        <p className="text-xs font-bold text-black/80">{product.tyre_size}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-caption text-black/50 uppercase font-bold tracking-widest">Pattern</p>
                                        <p className="text-xs font-bold text-black/80">{product.pattern || "N/A"}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-sm font-bold text-primary price currency-riyal"><Price amount={product.final_price || product.price} /></p>


                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-black/80 uppercase tracking-widest mb-2 ml-0.5">{t("inquiry.fullName")}</label>
                            <input
                                required
                                type="text"
                                placeholder={t("inquiry.fullNamePlaceholder")}
                                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white outline-none transition-all text-sm font-medium"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-black/80 uppercase tracking-widest mb-2 ml-0.5">{t("inquiry.emailAddress")}</label>
                            <input
                                required
                                type="email"
                                placeholder={t("inquiry.emailPlaceholder")}
                                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white outline-none transition-all text-sm font-medium"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-black/80 uppercase tracking-widest mb-2 ml-0.5">{t("inquiry.mobileNumber")}</label>
                            <input
                                required
                                type="tel"
                                placeholder={t("inquiry.mobilePlaceholder")}
                                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white outline-none transition-all text-sm font-medium"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-black/80 uppercase tracking-widest mb-2 ml-0.5">{t("inquiry.yourMessage")}</label>
                            <textarea
                                required
                                rows={4}
                                placeholder={t("inquiry.messagePlaceholder")}
                                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white outline-none transition-all text-sm font-medium resize-none shadow-sm"
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 pt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 px-4 rounded-lg border border-gray-300 text-sm font-bold text-black/70 hover:bg-gray-50 transition-colors uppercase tracking-widest shadow-sm"
                        >
                            {t("inquiry.cancel")}
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-[2] py-4 px-6 bg-primary hover:bg-primary text-black font-bold rounded-lg transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 uppercase tracking-widest text-sm"
                        >
                            <Send size={18} strokeWidth={3} className={isSubmitting ? "opacity-40" : ""} />
                            <span className={isSubmitting ? "opacity-50" : ""}>{t("inquiry.submit")}</span>
                        </button>
                    </div>
                </form>
            </div>
        </Drawer>
    );
}
