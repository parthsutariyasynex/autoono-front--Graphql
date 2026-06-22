"use client";

import React, { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import { useTranslation } from "@/hooks/useTranslation";

/**
 * Highly reusable Popup component using Framer Motion for smooth transitions.
 * Supports center modals (fade + scale) and sliding panels (side drawers / bottom sheets).
 */

type AnimationType = "fade-scale" | "slide-right" | "slide-left" | "slide-bottom";

interface PopupProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
    animation?: AnimationType;
    maxWidth?: string;
    size?: "sm" | "md" | "lg" | "xl" | "full";
    showOverlay?: boolean;
    closeOnOverlayClick?: boolean;
    className?: string;
    scrollable?: boolean;
}

const Popup: React.FC<PopupProps> = ({
    isOpen,
    onClose,
    children,
    title,
    animation = "fade-scale",
    maxWidth = "max-w-md",
    size = "md",
    showOverlay = true,
    closeOnOverlayClick = true,
    className = "",
    scrollable = true,
}) => {
    const { isRtl } = useTranslation();

    // Handle ESC key
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        },
        [isOpen, onClose]
    );

    // Apply global body scroll lock
    useLockBodyScroll(isOpen);

    useEffect(() => {
        if (isOpen) {
            window.addEventListener("keydown", handleKeyDown);
        }
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen, handleKeyDown]);

    // Animation variants
    const backdropVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
    };

    const getVariants = () => {
        // Adjust side-slide animations for RTL
        // LTR: slide-right slides to x: "100%" (off screen right)
        // RTL: slide-right (usually on the left) slides to x: "-100%" (off screen left)
        const slideRightX = isRtl ? "-100%" : "100%";
        const slideLeftX = isRtl ? "100%" : "-100%";

        switch (animation) {
            case "fade-scale":
                return {
                    hidden: { opacity: 0, scale: 0.9, y: 10 },
                    visible: { opacity: 1, scale: 1, y: 0 },
                    exit: { opacity: 0, scale: 0.9, y: 10 },
                };
            case "slide-right":
                return {
                    hidden: { x: slideRightX },
                    visible: { x: 0 },
                    exit: { x: slideRightX },
                };
            case "slide-left":
                return {
                    hidden: { x: slideLeftX },
                    visible: { x: 0 },
                    exit: { x: slideLeftX },
                };
            case "slide-bottom":
                return {
                    hidden: { y: "100%" },
                    visible: { y: 0 },
                    exit: { y: "100%" },
                };
            default:
                return {
                    hidden: { opacity: 0 },
                    visible: { opacity: 1 },
                    exit: { opacity: 0 },
                };
        }
    };

    const contentVariants = getVariants();

    // Layout classes based on animation type
    const getLayoutClasses = () => {
        switch (animation) {
            case "slide-right":
                return "justify-end items-stretch";
            case "slide-left":
                return "justify-start items-stretch";
            case "slide-bottom":
                return "justify-center items-end";
            default: // fade-scale (centered)
                return "justify-center items-center p-4";
        }
    };

    const getContentClasses = () => {
        switch (animation) {
            case "slide-right":
            case "slide-left":
                // Use h-screen so the panel always fills the full viewport height.
                // h-full alone doesn't resolve to viewport height reliably inside
                // a fixed-positioned flex container in all browser/CSS contexts.
                return "h-screen w-full md:w-[400px] overflow-x-hidden flex flex-col";
            case "slide-bottom":
                return "w-full sm:max-w-2xl rounded-t-2xl";
            default: // centered modal
                return `w-full ${maxWidth} rounded-2xl`;
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="popup-container"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`fixed inset-0 z-[1000] flex ${getLayoutClasses()}`}
                >
                    {/* Overlay */}
                    {showOverlay && (
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            variants={backdropVariants}
                            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-[2px] cursor-pointer"
                            onClick={closeOnOverlayClick ? onClose : undefined}
                        />
                    )}

                    {/* Popup Content */}
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        variants={contentVariants}
                        transition={{
                            duration: 0.5,
                            ease: [0.22, 1, 0.36, 1],
                        }}
                        className={`relative bg-white shadow-2xl overflow-hidden pointer-events-auto flex flex-col ${getContentClasses()} ${className}`}
                    >
                        {title && (
                            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                                <h3 className="text-lg font-bold text-black">{title}</h3>
                            </div>
                        )}
                        <div className={`flex-1 min-h-0 ${scrollable ? "overflow-y-auto" : "flex flex-col"}`}>
                            {children}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Popup;

