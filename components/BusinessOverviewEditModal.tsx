"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api/api-client";
import toast from "react-hot-toast";
import { useTranslation } from "@/hooks/useTranslation";
import Drawer from "@/components/Drawer";

interface BusinessOverviewData {
    total_employees: string;
    trucks: string;
    annual_revenue: string;
    business_model: string;
    products_offered: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    initialData: any;
    onSuccess: () => void;
}

export default function BusinessOverviewEditModal({ isOpen, onClose, initialData, onSuccess }: Props) {
    const { t, isRtl } = useTranslation();

    const [formData, setFormData] = useState<BusinessOverviewData>({
        total_employees: "",
        trucks: "",
        annual_revenue: "",
        business_model: "",
        products_offered: "",
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData({
                total_employees: initialData.total_employees || "",
                trucks: initialData.trucks || "",
                annual_revenue: initialData.annual_revenue || "",
                business_model: initialData.business_model || "",
                products_offered: initialData.products_offered || "",
            });
        }
    }, [initialData, isOpen]);

    // const handleSave = async () => {
    //     setIsSaving(true);
    //     const toastId = toast.loading(t("m.business-overview-updating"));

    //     try {
    //         await api.put("/kleverapi/business-overview", formData);

    //         toast.success(t("m.business-overview-updated"), { id: toastId });
    //         onSuccess();
    //         onClose();
    //     } catch (error: any) {
    //         console.error("Save Error:", error);
    //         toast.error(t("m.something-went-wrong"), { id: toastId });
    //     } finally {
    //         setIsSaving(false);
    //     }
    // };

    const inputClass = "w-full border border-gray-200 px-4 py-3 text-body-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all rounded-sm bg-white font-medium text-black placeholder:text-black/40";
    const labelClass = "block text-body-sm font-bold text-black mb-1.5 uppercase tracking-wider";

    return (
        <Drawer isOpen={isOpen} onClose={onClose}>
            <div className="flex flex-col h-full bg-white" dir={isRtl ? "rtl" : "ltr"}>
                {/* Header */}
                <div className="bg-primary px-6 md:px-8 py-4 md:py-6 flex-shrink-0">
                    {/* <h2 className="text-[16px] md:text-[18px] font-bold uppercase tracking-widest text-center">
                        {t("m.edit-business-overview")}
                    </h2> */}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label className={labelClass}>{t("m.total-employee")}</label>
                            <input
                                type="text"
                                className={inputClass}
                                value={formData.total_employees}
                                onChange={(e) => setFormData({ ...formData, total_employees: e.target.value })}
                                placeholder={t("m.enter-total-employee")}
                                dir={isRtl ? "rtl" : "ltr"}
                            />
                        </div>

                        <div>
                            <label className={labelClass}>{t("m.total-trucks")}</label>
                            <input
                                type="text"
                                className={inputClass}
                                value={formData.trucks}
                                onChange={(e) => setFormData({ ...formData, trucks: e.target.value })}
                                placeholder={t("m.enter-total-trucks")}
                                dir={isRtl ? "rtl" : "ltr"}
                            />
                        </div>

                        <div>
                            <label className={labelClass}>{t("m.annual-revenue")}</label>
                            <input
                                type="text"
                                className={inputClass}
                                value={formData.annual_revenue}
                                onChange={(e) => setFormData({ ...formData, annual_revenue: e.target.value })}
                                placeholder={t("m.enter-annual-revenue")}
                                dir={isRtl ? "rtl" : "ltr"}
                            />
                        </div>

                        <div>
                            <label className={labelClass}>{t("m.business-model")}</label>
                            <input
                                type="text"
                                className={inputClass}
                                value={formData.business_model}
                                onChange={(e) => setFormData({ ...formData, business_model: e.target.value })}
                                placeholder={t("m.enter-business-model")}
                            />
                        </div>

                        <div>
                            <label className={labelClass}>{t("m.products-services-offered")}</label>
                            <input
                                type="text"
                                className={inputClass}
                                value={formData.products_offered}
                                onChange={(e) => setFormData({ ...formData, products_offered: e.target.value })}
                                placeholder={t("m.enter-products-services")}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-surfacePage px-6 md:px-8 py-5 border-t border-gray-100 flex justify-end gap-4 flex-shrink-0">
                    <button
                        // onClick={handleSave}
                        disabled={isSaving}
                        className="bg-primary hover:bg-black hover:text-white text-body font-bold px-10 py-2.5 uppercase transition-all shadow-lg shadow-primary/10 tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? t("account.saving") : t("common.save")}
                    </button>
                </div>
            </div>
        </Drawer>
    );
}
