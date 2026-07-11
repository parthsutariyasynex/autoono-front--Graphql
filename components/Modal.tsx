"use client";

import React, { useEffect, useState, useCallback } from "react";
import { X } from "lucide-react";

import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "full";
}

const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    maxWidth = "2xl",
}) => {
    const [isRendered, setIsRendered] = useState(false);

    // Apply global body scroll lock
    useLockBodyScroll(isOpen);

    useEffect(() => {
        if (isOpen) {
            setIsRendered(true);
        } else {
            // Keep rendered for exit animation, then remove
            const timer = setTimeout(() => setIsRendered(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // ESC key
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === "Escape" && isOpen) onClose();
    }, [isOpen, onClose]);

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    if (!isRendered) return null;

    const maxWidthClasses: Record<string, string> = {
        sm: "max-w-sm",
        md: "max-w-md",
        lg: "max-w-lg",
        xl: "max-w-xl",
        "2xl": "max-w-2xl",
        "3xl": "max-w-3xl",
        "4xl": "max-w-4xl",
        "5xl": "max-w-5xl",
        full: "max-w-[95vw]",
    };

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 transition-all duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            role="dialog"
            aria-modal="true"
        >
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`}
                onClick={onClose}
            />

            {/* Modal Content */}
            <div
                className={`relative w-full ${maxWidthClasses[maxWidth]} bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 transform ${isOpen ? "scale-100 translate-y-0" : "scale-95 translate-y-4"}`}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                    <h3 className="text-lg font-bold text-black">
                        {title || ""}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 text-black/50 hover:text-black transition-colors cursor-pointer"
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
