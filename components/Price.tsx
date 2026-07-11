
"use client";

import { formatPrice } from "@/utils/helpers";
import { useLocale } from "@/lib/i18n/client";

interface PriceProps {
    amount: number | string | null | undefined;
    className?: string;
    symbolClassName?: string;
}

export default function Price({ amount, className = "", symbolClassName = "" }: PriceProps) {
    const locale = useLocale();
    const formatted = formatPrice(amount, locale);

    // The formatPrice utility returns "SAR 1,234.56"
    // We want to replace the text "SAR" with the custom font character mapping (Unicode E900)
    const parts = formatted.split(" ");
    const value = parts.length > 1 ? parts.slice(1).join(" ") : formatted;

    // Mapping for the Saudi Riyal custom font icon
    const riyalIcon = "\uE900";

    // If className doesn't specify a font weight, default to font-bold
    const weightClass = className.includes("font-") ? "" : "font-bold";

    return (
        <span dir="ltr" className={`inline-flex items-center gap-1 ${weightClass} ${className}`}>
            <span className={`currency-riyal ${symbolClassName}`}>{riyalIcon}</span>
            <span>{value}</span>
        </span>
    );
}

