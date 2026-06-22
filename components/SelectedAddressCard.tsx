"use client";

import React from "react";
import { Check } from "lucide-react";
import { Address } from "@/modules/checkout/hooks/useCheckout";
import { useTranslation } from "@/hooks/useTranslation";

interface SelectedAddressCardProps {
    address: Address;
    onEdit: () => void;
}

const SelectedAddressCard: React.FC<SelectedAddressCardProps> = ({ address, onEdit }) => {
    const { t } = useTranslation();
    return (
        <div className="relative flex flex-col md:flex-row items-start gap-2 md:gap-0 md:items-center justify-between w-full p-4 bg-surfacePanel border-1 border-[#ddd] rounded-sm transition-all duration-300">
            {/* Green Square Box with Check Icon at Top-Right */}
            <div className="absolute top-0 right-0 bg-success w-4 h-4 flex items-center justify-center bg-black rounded-sm">
                <Check className="text-white w-3 h-3" strokeWidth={3} />
            </div>

            {/* Left side: Address Text */}
            <div className="flex-1 pr-4">
                <p className="text-sm text-black leading-relaxed font-medium">
                    <span className="font-bold text-black">{address.firstname} {address.lastname}</span>{" "}
                    {address.street} <bdi dir="ltr">{address.city}, {address.postcode}</bdi>{" "}
                    {address.country_id === 'SA' ? t("data.Saudi Arabia") : address.country_id}{" "}
                    <bdi dir="ltr">{address.telephone}</bdi>
                    {[
                        address.custom_attributes?.find(ca => ca.attribute_code === 'store_view')?.value,
                        address.custom_attributes?.find(ca => ca.attribute_code === 'region_ship_to_party')?.value
                    ].filter(Boolean).map(val => ` ${val}`).join("")}
                </p>
            </div>

            {/* Right side: EDIT ADDRESS Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                }}
                className="bg-primary text-caption font-bold px-6 py-2 uppercase tracking-widest hover:bg-black hover:text-white transition-all duration-300 flex-shrink-0 rounded-sm"
            >
                {t("addressBook.editAddress")}
            </button>
        </div>
    );
};

export default SelectedAddressCard;
