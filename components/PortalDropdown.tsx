"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

interface PortalDropdownProps {
    value: string | number;
    onChange: (value: string) => void;
    options: { label: string; value: string }[];
    placeholder?: string;
    className?: string;
    buttonClassName?: string;
    minWidth?: number;
}

export default function PortalDropdown({
    value,
    onChange,
    options,
    placeholder = "Select",
    className = "",
    buttonClassName = "",
    minWidth = 70,
}: PortalDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ top: 0, left: 0, width: 0, openUp: false });

    useEffect(() => { setMounted(true); }, []);

    const updatePos = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const openUp = spaceBelow < 200 && rect.top > 200;
        setPos({
            top: openUp ? 0 : rect.bottom + 4,
            left: rect.left,
            width: Math.max(rect.width, minWidth),
            openUp,
        });
    }, [minWidth]);

    // Auto-close on scroll or resize to prevent "floating" dropdowns
    useEffect(() => {
        const handleClose = () => setIsOpen(false);
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsOpen(false);
        };

        if (isOpen) {
            window.addEventListener("keydown", handleKeyDown);
            window.addEventListener('scroll', handleClose, { passive: true });
            window.addEventListener('resize', handleClose);
            return () => {
                window.removeEventListener("keydown", handleKeyDown);
                window.removeEventListener('scroll', handleClose);
                window.removeEventListener('resize', handleClose);
            };
        }
    }, [isOpen]);

    const handleToggle = useCallback(() => {
        if (!isOpen) updatePos();
        setIsOpen(prev => !prev);
    }, [isOpen, updatePos]);

    const selected = options.find(o => String(o.value) === String(value));

    return (
        <div className={`relative ${className}`}>
            <button
                ref={triggerRef}
                type="button"
                onClick={handleToggle}
                className={`flex items-center justify-between gap-2 cursor-pointer transition-all ${buttonClassName || "bg-white border border-gray-200 rounded-md px-3 py-2 text-body font-bold text-black hover:border-gray-300 shadow-sm"} ${isOpen ? "border-primary z-[9999]" : ""}`}
                style={{ minWidth }}
                suppressHydrationWarning
            >
                <span className="truncate flex-1 text-start">{selected ? selected.label : placeholder}</span>
                <ChevronDown size={13} className={`text-black/50 transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && mounted && createPortal(
                <>
                    <div className="fixed inset-0" style={{ zIndex: 9998 }} onClick={() => setIsOpen(false)} />
                    <div
                        ref={dropdownRef}
                        style={{
                            position: "fixed",
                            ...(pos.openUp
                                ? { bottom: window.innerHeight - (triggerRef.current?.getBoundingClientRect().top ?? 0) + 4 }
                                : { top: pos.top }),
                            left: pos.left,
                            width: pos.width,
                            zIndex: 9999,
                        }}
                        className="bg-white border border-gray-200 rounded-md shadow-xl overflow-hidden max-h-[250px] overflow-y-auto"
                    >
                        {options.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                                className={`w-full text-start px-4 py-2 text-xs text-body cursor-pointer transition-colors border-b last:border-0 border-gray-50 whitespace-nowrap ${String(opt.value) === String(value) ? "bg-primary text-white" : "text-black/80 hover:bg-primary hover:text-white"}`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </>,
                document.body
            )}
        </div>
    );
}
