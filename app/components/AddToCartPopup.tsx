"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import Popup from "./Popup";
import { useTranslation } from "@/hooks/useTranslation";
import { useLocalePath } from "@/hooks/useLocalePath";

interface ProductDetails {
    name: string;
    sku: string;
}

interface AddToCartPopupProps {
    isOpen: boolean;
    onClose: () => void;
    product: ProductDetails | null;
}

const AddToCartPopup: React.FC<AddToCartPopupProps> = ({ isOpen, onClose, product }) => {
    const router = useRouter();
    const { t, isRtl } = useTranslation();
    const lp = useLocalePath();

    const handleProceedToCart = () => {
        onClose();
        router.push(lp("/cart"));
    };

    if (!product) return null;

    return (
        <Popup
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="max-w-[540px]"
            className="!rounded-2xl overflow-hidden !border-none"
            closeOnOverlayClick={false}
        >
            <div className="flex flex-col bg-white font-sans" dir={isRtl ? "rtl" : "ltr"}>
                {/* Yellow Header */}
                <div className="bg-primary py-3 flex items-center justify-center relative">
                    <h2 className="text-xl font-bold text-black uppercase tracking-wider">
                        {t("cart.added_to_cart") || "ADDED TO CART"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 bg-black rounded-full flex items-center justify-center text-white hover:opacity-80 transition-opacity shadow-md"
                    >
                        <X size={18} strokeWidth={3} />
                    </button>
                </div>

                {/* Content Section */}
                <div className="p-2 md:p-6 flex flex-col items-center">
                    <p className="text-h3-sm font-medium text-black mb-1 text-center leading-relaxed">
                        {t("cart.recently_added_msg") || "You have recently added this product to your Cart"}
                    </p>
                    <h3 className="text-[16px] md:text-[18px] font-bold text-black mb-3 md:mb-6 text-center leading-tight">
                        {product.name}
                    </h3>

                    {/* Buttons Row */}
                    <div className="flex w-full gap-2 md:gap-5">
                        <button
                            onClick={handleProceedToCart}
                            className="flex-1 h-[36px] md:h-[46px] bg-primary text-black font-bold text-body md:text-base uppercase tracking-wider rounded-lg hover:opacity-90 transition-opacity active:scale-[0.98]"
                        >
                            {t("cart.proceed_to_cart") || "PROCEED TO CART"}
                        </button>
                        <button
                            onClick={onClose}
                            className="flex-1 h-[36px] md:h-[46px] bg-black text-white font-bold text-body md:text-base uppercase tracking-wider rounded-lg hover:opacity-90 transition-opacity active:scale-[0.98]"
                        >
                            {t("cart.continue_shopping") || "CONTINUE SHOPPING"}
                        </button>
                    </div>
                </div>
            </div>
        </Popup>
    );
};

export default AddToCartPopup;
