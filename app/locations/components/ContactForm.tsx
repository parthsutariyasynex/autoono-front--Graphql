"use client";
import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

const ContactForm: React.FC = () => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        email: "",
        comment: ""
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) newErrors.name = t("contact.nameRequired");
        if (!formData.phone.trim()) newErrors.phone = t("contact.phoneRequired");
        if (!formData.email.trim()) {
            newErrors.email = t("contact.emailRequired");
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = t("contact.emailInvalid");
        }
        if (!formData.comment.trim()) newErrors.comment = t("contact.messageRequired");

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setIsLoading(true);
        try {
            const res = await fetch("/api/kleverapi/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    comment: formData.comment,
                    telephone: formData.phone,
                }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setErrors({ comment: data?.message || t("contact.sendFailed") });
            } else {
                setIsSubmitted(true);
                setFormData({ name: "", phone: "", email: "", comment: "" });
                setTimeout(() => setIsSubmitted(false), 8000);
            }
        } catch {
            setErrors({ comment: "Network error. Please try again." });
        } finally {
            setIsLoading(false);
        }
    };

    if (isSubmitted) {
        return (
            <div className="w-full bg-green-50 border border-green-200 p-8 sm:p-12 text-center rounded-sm shadow-inner">
                <div className="flex justify-center mb-6">
                    <CheckCircle2 className="w-16 h-16 text-green-500 animate-bounce" />
                </div>
                <h3 className="text-h3 font-bold text-green-800 mb-3 uppercase tracking-tight">{t("contact.success")}</h3>
                <p className="text-green-700 font-medium text-body">{t("contact.successDesc")}</p>
                <button
                    onClick={() => setIsSubmitted(false)}
                    className="mt-8 px-8 py-2.5 bg-green-800 text-white font-bold rounded-sm hover:bg-green-900 transition-all uppercase text-sm tracking-widest"
                >
                    {t("contact.sendAnother")}
                </button>
            </div>
        );
    }

    return (
        <section className="w-full">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Row 1: Name and Phone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                        <input
                            name="name"
                            type="text"
                            placeholder={t("contact.namePlaceholder")}
                            value={formData.name}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 border ${errors.name ? 'border-red-400' : 'border-gray-200'} focus:outline-none focus:border-primary bg-white text-black text-body-lg rounded-sm transition-colors`}
                        />
                        {errors.name && <span className="text-red-500 text-label font-semibold mt-1 block uppercase pl-1">{errors.name}</span>}
                    </div>
                    <div className="relative">
                        <input
                            name="phone"
                            type="tel"
                            placeholder={t("contact.phonePlaceholder")}
                            value={formData.phone}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 border ${errors.phone ? 'border-red-400' : 'border-gray-200'} focus:outline-none focus:border-primary bg-white text-black text-body-lg rounded-sm transition-colors`}
                        />
                        {errors.phone && <span className="text-red-500 text-label font-semibold mt-1 block uppercase pl-1">{errors.phone}</span>}
                    </div>
                </div>

                {/* Row 2: Email */}
                <div className="relative">
                    <input
                        name="email"
                        type="email"
                        placeholder={t("contact.emailPlaceholder")}
                        value={formData.email}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 border ${errors.email ? 'border-red-400' : 'border-gray-200'} focus:outline-none focus:border-primary bg-white text-black text-body-lg rounded-sm transition-colors`}
                    />
                    {errors.email && <span className="text-red-500 text-label font-semibold mt-1 block uppercase pl-1">{errors.email}</span>}
                </div>

                {/* Row 3: Message / Comment */}
                <div className="relative border border-gray-200 rounded-sm">
                    <textarea
                        name="comment"
                        placeholder={t("contact.messagePlaceholder")}
                        rows={6}
                        value={formData.comment}
                        onChange={handleChange}
                        className={`w-full px-4 pt-1 pb-4 bg-white text-black text-body-lg focus:outline-none resize-none rounded-b-sm`}
                    ></textarea>
                    {errors.comment && <span className="text-red-500 text-label font-semibold px-4 pb-2 block uppercase">{errors.comment}</span>}
                </div>

                {/* Submit Button */}
                <div className="submit-button">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="bg-primary text-white font-semibold px-12 py-3.5 uppercase tracking-widest hover:bg-primaryHover transition-all duration-300 text-body-lg shadow-sm flex items-center justify-center gap-3 min-w-[200px]"
                    >
                        {isLoading ? (
                            <>
                                
                                {t("contact.processing")}
                            </>
                        ) : (
                            t("contact.sendMessage")
                        )}
                    </button>
                </div>
            </form>
        </section>
    );
};

export default ContactForm;
