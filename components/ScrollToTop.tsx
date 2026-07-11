"use client";

import React, { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

/**
 * ScrollToTop Component
 * Listens to the main layout scroll container instead of window.
 */
export default function ScrollToTop() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const container = document.getElementById('main-scroll-container');
        if (!container) return;

        const handleScroll = () => {
            if (container.scrollTop > 300) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        container.addEventListener("scroll", handleScroll);
        return () => container.removeEventListener("scroll", handleScroll);
    }, []);

    const scrollToTop = () => {
        const container = document.getElementById('main-scroll-container');
        if (container) {
            container.scrollTo({
                top: 0,
                behavior: "smooth",
            });
        }
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-24 right-8 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300">
            <button
                onClick={scrollToTop}
                className="w-12 h-12 bg-white border border-gray-200 rounded-full shadow-lg flex items-center justify-center text-black/50 hover:text-black hover:border-black transition-all group active:scale-90"
                aria-label="Scroll to top"
            >
                <ArrowUp size={24} strokeWidth={1.5} className="group-hover:-translate-y-1 transition-transform" />
            </button>
        </div>
    );
}
