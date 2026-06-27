"use client";
import React from "react";

interface AddToCartOverlayProps {
    isProcessing: boolean;
}

export default function AddToCartOverlay({ isProcessing }: AddToCartOverlayProps) {
    if (!isProcessing) return null;
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-2xl border border-gray-100 px-10 py-8 flex flex-col items-center gap-4 min-w-[240px]">
                <div className="w-10 h-10 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-[13px] font-bold text-black uppercase tracking-widest whitespace-nowrap">
                    Processing Add to Cart...
                </p>
            </div>
        </div>
    );
}
