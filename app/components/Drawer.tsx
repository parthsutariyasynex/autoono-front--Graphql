"use client";

import React from "react";
import { X } from "lucide-react";
import Popup from "./Popup";

interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
    scrollable?: boolean;
}

/**
 * Reusable Side Drawer component that slides in from the right.
 * Now powered by Framer Motion for premium smooth animations.
 */
export default function Drawer({ isOpen, onClose, children, title, scrollable = false }: DrawerProps) {
    return (
        <Popup
            isOpen={isOpen}
            onClose={onClose}
            animation="slide-right"
            className="flex flex-col"
            scrollable={scrollable}
        >
            {/* Header if title exists */}
            {title ? (
                <div className="bg-primary px-4 py-4 flex items-center justify-between flex-shrink-0 border-b border-black/5">
                    <h2 className="text-xl font-bold text-black">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-1 bg-white/80 backdrop-blur-sm rounded-full shadow-sm hover:bg-gray-100 transition-colors text-black/60 hover:text-black group flex items-center justify-center cursor-pointer"
                        aria-label="Close drawer"
                    >
                        <X size={16} strokeWidth={2.5} className="transition-transform duration-300 group-hover:rotate-90" />
                    </button>
                </div>
            ) : (
                /* Close Button Overlay if no title */
                <button
                    onClick={onClose}
                    className="absolute ltr:right-4 rtl:left-4 top-4 z-[110] p-1 bg-white/80 backdrop-blur-sm rounded-full shadow-sm hover:bg-gray-100 transition-colors text-black/60 hover:text-black group cursor-pointer"
                    aria-label="Close drawer"
                >
                    <X size={16} strokeWidth={2.5} className="transition-transform duration-300 group-hover:rotate-90" />
                </button>
            )}

            {/* Content Area */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {children}
            </div>
        </Popup>
    );
}
