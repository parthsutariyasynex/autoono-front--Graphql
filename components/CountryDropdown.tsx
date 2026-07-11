"use client";

import React, { useState, useRef, useEffect } from 'react';

export interface Country {
    code: string;
    country: string;
    nativeName: string;
    iso: string;
    flagClass: string;
}

export const COUNTRY_CODES: Country[] = [
    {
        code: "+966",
        country: "Saudi Arabia",
        nativeName: "المملكة العربية السعودية",
        iso: "sa",
        flagClass: "iti__flag iti__sa"
    },
    {
        code: "+91",
        country: "India",
        nativeName: "भारत",
        iso: "in",
        flagClass: "iti__flag iti__in"
    },
    {
        code: "+971",
        country: "United Arab Emirates",
        nativeName: "الإمارات العربية المتحدة",
        iso: "ae",
        flagClass: "iti__flag iti__ae"
    },
];

interface CountryDropdownProps {
    selectedCountryCode: string;
    onSelect: (code: string) => void;
}

const CountryDropdown: React.FC<CountryDropdownProps> = ({ selectedCountryCode, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedCountry = COUNTRY_CODES.find(c => c.code === selectedCountryCode) || COUNTRY_CODES[0];

    // Use `click` (not `mousedown`) so touch-scroll / wheel-scroll events
    // do NOT close the dropdown — only a real tap/click outside does.
    // The dropdown is positioned absolute against the input field, so it
    // already follows the input as the page scrolls.
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    return (
        // Force LTR for the whole country selector (trigger + dropdown).
        // In RTL documents, flex + justify-between reverses the visual
        // order, which made the dropdown show `+CODE` on the far left and
        // flag/name on the right — inconsistent with the selected
        // trigger. Forcing LTR gives the same layout in both languages:
        // [flag] [code] [▼]   |   [flag + name] ... [+code]
        <div dir="ltr" className="contents" ref={dropdownRef}>
            <div
                className="flex items-center gap-2 px-3 sm:px-4 min-w-[100px] sm:min-w-[128px] h-full border-r border-gray-300 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={`${selectedCountry.flagClass} flex-shrink-0`}></span>
                <span
                    className="font-semibold text-[14px] sm:text-[15px] whitespace-nowrap leading-none"
                    style={{ color: 'var(--color-danger)' }}
                >
                    {selectedCountry.code}
                </span>
                <span className="text-[10px] text-black/40 ml-auto leading-none">▼</span>
            </div>

            {isOpen && (
                <div
                    dir="ltr"
                    className="absolute top-full left-0 right-0 bg-white border border-t-0 border-gray-300 shadow-[0_15px_35px_rgba(0,0,0,0.12)] z-[100] max-h-[min(320px,calc(100vh-200px))] overflow-y-auto overscroll-contain scrollbar-hide [touch-action:pan-y]"
                >
                    {COUNTRY_CODES.map((item) => (
                        <div
                            key={item.code}
                            onClick={() => {
                                onSelect(item.code);
                                setIsOpen(false);
                            }}
                            className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 sm:py-4 hover:bg-gray-50 cursor-pointer border-b last:border-0 border-gray-100 transition-colors group"
                        >
                            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                                <span className={`${item.flagClass} scale-110 flex-shrink-0`}></span>
                                <span className="text-[13px] sm:text-body font-semibold text-danger group-hover:text-black transition-colors truncate">
                                    {item.country} ({item.nativeName})
                                </span>
                            </div>
                            <span className="text-body font-bold text-black group-hover:text-danger transition-colors flex-shrink-0">
                                {item.code}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CountryDropdown;
