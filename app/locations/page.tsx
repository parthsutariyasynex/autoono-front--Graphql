"use client";
import { useTranslation } from "@/hooks/useTranslation";
import React from "react";
import ContactForm from "./components/ContactForm";
import MapSection from "./components/MapSection";
import { MapPin } from "lucide-react";

export default function ContactPage() {
    const { t, isRtl } = useTranslation();

    return (
        <div className="min-h-screen bg-white text-black overflow-x-hidden" dir={isRtl ? "rtl" : "ltr"}>

            {/* Full-width Map */}
            <div className="w-full h-[300px] sm:h-[420px] border-b border-gray-100">
                <MapSection />
            </div>

            <div className="max-w-[1170px] mx-auto px-3 py-10 sm:py-12 md:py-14">

                {/* Title */}
                <h1 className="text-2xl sm:text-3xl md:text-[2rem] font-black text-center mb-4 md:mb-6 text-black uppercase font-bold tracking-[0.6px]">
                    {t("contact.getInTouch")}
                </h1>

                {/* Address + Form — stack vertically below lg so each takes the
                    full main-area width on tablet portrait (Tab A9 800px would
                    otherwise squeeze the address card to ~243px). At lg+ go
                    side-by-side at 4/12 + 8/12. */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8">

                    {/* Address Card */}
                    <div className="lg:col-span-4">
                        <div className="border border-gray-100 p-6 sm:p-8 shadow-sm">
                            <h5 className="text-base font-bold uppercase tracking-wide text-black mb-3">
                                {t("locations.westRegion")}
                            </h5>
                            <p className="text-sm text-black/70 font-medium leading-relaxed mb-6 whitespace-pre-line">
                                {t("locations.westAddress")}
                            </p>
                            <a
                                href="https://goo.gl/maps/5pjGk1qLgGv8AdRL7"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm font-semibold text-black hover:text-primary transition-colors"
                            >
                                <MapPin className="w-4 h-4 flex-shrink-0" />
                                <span className="border-b border-black/20 hover:border-primary transition-colors">
                                    {t("locations.googleMap")}
                                </span>
                            </a>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="lg:col-span-8">
                        <ContactForm />
                    </div>
                </div>
            </div>
        </div>
    );
}
