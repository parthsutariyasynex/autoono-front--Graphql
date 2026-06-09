"use client";

import React from "react";
import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";
import { useLocalePath } from "@/hooks/useLocalePath";

/**
 * Global Site Footer
 * Matches the design requested by the user: 2-column center-aligned layout.
 */
const Footer: React.FC = () => {
    const { t } = useTranslation();
    const lp = useLocalePath();
    const pathname = usePathname();
    const isProductsPage = pathname.includes("/products");

    return (
        <footer className={`bg-black text-white py-9 sm:py-9 md:py-9 ${isProductsPage ? "" : ""}`}>
            <div className="w-full max-w-[1200px] mx-auto px-3">
                <div className="grid grid-cols-2 gap-6 md:gap-0 text-center items-start">

                    {/* Left: Call Section */}
                    <div className="flex flex-col items-center group">
                        <div className="mb-4 text-white">
                            <Phone className="w-10 h-10" strokeWidth={1} />
                        </div>
                        <h3 className="text-[18px] md:text-[20px] font-semibold mb-3 tracking-tight">{t("footer.call")}</h3>
                        <a
                            href="tel:8003040001"
                            dir="ltr"
                            className="text-white text-[15px] font-medium tracking-wider inline-block"
                        >
                            800 304 0001
                        </a>
                    </div>

                    {/* Right: Email Section */}
                    <div className="flex flex-col items-center group">
                        <div className="mb-4 text-white">
                            <Mail className="w-10 h-10" strokeWidth={1} />
                        </div>
                        <h3 className="text-[18px] md:text-[20px] font-semibold mb-3 tracking-tight">{t("footer.email")}</h3>
                        <a
                            href="mailto:info@autoono.sa"
                            className="text-white text-[15px] font-medium tracking-wider"
                        >
                            info@autoono.sa
                        </a>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="mt-7 md:mt-9 pt-6 md:pt-8 border-t border-white/10">
                    <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-[13px] font-medium text-center uppercase tracking-wide">
                        <Link href={lp("/privacy-policy")} className="text-white hover:text-primary transition-colors">{t("footer.privacyPolicy")}</Link>
                        <Link href={lp("/return-exchange-policy")} className="text-white hover:text-primary transition-colors">{t("footer.returnExchangePolicy")}</Link>
                        <Link href={lp("/terms-conditions")} className="text-white hover:text-primary transition-colors">{t("footer.termsConditions")}</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
