"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { GiftItem } from "@/modules/cart/context/GiftContext";

interface GiftModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectGifts: (selections: Record<string, number>) => void;
    maxGifts: number;
    availableGifts: GiftItem[];
    initialSelections?: Record<string, number>;
    onSelectionsChange?: (selections: Record<string, number>) => void;
    ruleName?: string;
    remaining?: number;
}

const GiftModal: React.FC<GiftModalProps> = ({
    isOpen,
    onClose,
    onSelectGifts,
    maxGifts,
    availableGifts,
    initialSelections = {},
    onSelectionsChange,
    ruleName,
    remaining,
}) => {
    const [selections, setSelections] = useState<Record<string, number>>(initialSelections);

    // Sync initialSelections whenever the modal opens
    // useEffect(() => {
    //     if (isOpen) {
    //         setSelections(initialSelections);
    //     }
    // }, [isOpen, initialSelections]);


    useEffect(() => {
        if (!isOpen) return;

        const sanitized: Record<string, number> = {};

        Object.entries(initialSelections).forEach(([id, qty]) => {
            const gift = availableGifts.find(g => g.id === id);

            if (!gift) return;

            sanitized[id] = Math.min(qty, gift.qty_available);
        });

        const current = JSON.stringify(selections);
        const next = JSON.stringify(sanitized);

        if (current !== next) {
            setSelections(sanitized);
        }

    }, [isOpen]);
    // Notify parent of selection changes for persistence
    useEffect(() => {
        onSelectionsChange?.(selections);
    }, [selections, onSelectionsChange]);

    if (!isOpen) return null;

    // ── helpers ──────────────────────────────────────────────────────────────

    const groups = availableGifts.reduce((acc, gift) => {
        if (!acc[gift.group_name]) acc[gift.group_name] = [];
        acc[gift.group_name].push(gift);
        return acc;
    }, {} as Record<string, GiftItem[]>);

    const getGroupLimit = (groupName: string): number => {
        const match = groupName.match(/\((\d+)\)\s*$/);
        return match ? parseInt(match[1], 10) : maxGifts;
    };

    const getGroupSelectedCount = (groupName: string) =>
        (groups[groupName] || []).reduce((sum, item) => sum + (selections[item.id] || 0), 0);

    const totalSelected = Object.values(selections).reduce((a, b) => a + b, 0);

    const updateSelections = (next: Record<string, number>) => {
        setSelections(next);
    };

    const toggleCheckbox = (id: string, groupName: string) => {
        const current = selections[id] || 0;
        if (current > 0) {
            updateSelections({ ...selections, [id]: 0 });
        } else {
            const groupLimit = getGroupLimit(groupName);
            if (getGroupSelectedCount(groupName) >= groupLimit) return;
            updateSelections({ ...selections, [id]: 1 });
        }
    };

    // const handleQtyInput = (id: string, value: string, groupName: string) => {
    //     const num = Math.max(0, parseInt(value.replace(/\D/g, "") || "0", 10));
    //     const groupLimit = getGroupLimit(groupName);
    //     const current = selections[id] || 0;
    //     const others = getGroupSelectedCount(groupName) - current;
    //     const allowed = Math.min(num, groupLimit - others);
    //     updateSelections({ ...selections, [id]: allowed });
    //     console.log("qty change", selections);
    // };

    const handleQtyInput = (id: string, value: string, groupName: string) => {
        const num = Math.max(0, parseInt(value.replace(/\D/g, "") || "0", 10));

        const groupLimit = getGroupLimit(groupName);

        const current = selections[id] || 0;

        const others = getGroupSelectedCount(groupName) - current;

        const gift = availableGifts.find(g => g.id === id);

        const maxAllowedForItem = gift?.qty_available || 0;

        const allowed = Math.min(
            num,
            groupLimit - others,
            maxAllowedForItem
        );

        updateSelections({
            ...selections,
            [id]: allowed
        });
    };

    const handleConfirm = () => {
        if (totalSelected === 0) return;
        onSelectGifts(selections);
    };

    const displayLabel = (groupName: string) => groupName.replace(/\s*\(\d+\)\s*$/, "");

    // ── RENDER ───────────────────────────────────────────────────────────────

    return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
            <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 fade-in duration-300">

                {/* Header */}
                <div className="bg-[#5b7fcf] px-4 sm:px-6 py-4 flex items-center justify-between relative">
                    <h2 className="flex-1 text-center text-base sm:text-lg font-bold text-white uppercase tracking-wider">
                        {ruleName || "Choose your free gift"}
                        {remaining !== undefined && (
                            <span className="ml-2 text-sm font-semibold normal-case tracking-normal opacity-80">
                                ({remaining} left)
                            </span>
                        )}
                    </h2>
                    <button
                        onClick={onClose}
                        className="absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 w-7 h-7 bg-black rounded-full flex items-center justify-center text-white hover:opacity-80 transition-opacity shadow-md"
                        aria-label="Close"
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-y-auto">
                    <table className="w-full border-collapse text-sm">
                        <thead className="sticky top-0 z-10">
                            <tr className="border-b border-gray-200 bg-white">
                                <th className="px-3 sm:px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-10 sm:w-14">Select</th>
                                <th className="px-2 sm:px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-14 sm:w-20">Image</th>
                                <th className="px-2 sm:px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-3 sm:px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-24 sm:w-28">Qty</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(groups).map(([groupName, items]) => {
                                const groupLimit = getGroupLimit(groupName);
                                const groupCount = getGroupSelectedCount(groupName);
                                const isGroupFull = groupCount >= groupLimit;

                                return (
                                    <React.Fragment key={groupName}>
                                        {/* Group header row */}
                                        <tr className="bg-gray-100 border-t border-gray-200">
                                            <td colSpan={4} className="px-3 sm:px-4 py-2">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-xs font-bold text-gray-700 uppercase tracking-widest truncate">
                                                        Free Items ({groupLimit - groupCount})
                                                    </span>
                                                    {/* <span className={`
                                                        flex-shrink-0 text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider
                                                        ${isGroupFull
                                                            ? "bg-green-100 text-green-700"
                                                            : "bg-blue-100 text-blue-600"}
                                                    `}>
                                                        {groupCount}/{groupLimit} selected
                                                    </span> */}
                                                </div>
                                            </td>
                                        </tr>

                                        {items.map((item) => {
                                            const qty = selections[item.id] || 0;
                                            const isSelected = qty > 0;
                                            const isDisabled = isGroupFull && !isSelected;
                                            if (item.qty_available === 0) {
                                                console.log("item..qty_available::", item.qty_available);
                                                return null;
                                            }

                                            return (
                                                <tr
                                                    key={item.id}
                                                    onClick={() => !isDisabled && toggleCheckbox(item.id, groupName)}
                                                    className={`
                                                        border-b border-gray-100 transition-colors
                                                        ${isSelected
                                                            ? "bg-blue-50 hover:bg-blue-100 cursor-pointer"
                                                            : isDisabled
                                                                ? "bg-gray-50/70 cursor-not-allowed"
                                                                : "hover:bg-gray-50 cursor-pointer"}
                                                    `}
                                                >
                                                    {/* Checkbox */}
                                                    <td
                                                        className="px-3 sm:px-4 py-3 text-center"
                                                        onClick={e => e.stopPropagation()}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            disabled={isDisabled}
                                                            onChange={() => toggleCheckbox(item.id, groupName)}
                                                            className="w-4 h-4 cursor-pointer accent-[#5b7fcf] disabled:cursor-not-allowed"
                                                        />
                                                    </td>

                                                    {/* Image */}
                                                    <td
                                                        className="px-2 sm:px-3 py-3"
                                                        onClick={e => e.stopPropagation()}
                                                    >
                                                        <div className={`
                                                            w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center overflow-hidden rounded bg-white border
                                                            ${isSelected ? "ring-2 ring-[#5b7fcf] ring-offset-0 border-[#5b7fcf]" : "border-gray-100"}
                                                            ${isDisabled ? "opacity-40" : ""}
                                                        `}>
                                                            <img
                                                                src={item.image}
                                                                alt={item.name}
                                                                className="max-w-full max-h-full object-contain"
                                                                onError={(e) => { (e.target as HTMLImageElement).src = "/logo/auttono-logo.jpg"; }}
                                                            />
                                                        </div>
                                                    </td>

                                                    {/* Name + SKU */}
                                                    <td className="px-2 sm:px-3 py-3">
                                                        <p className={`text-[13px] font-bold leading-snug uppercase tracking-tight ${isDisabled ? "text-gray-400" : "text-black"}`}>
                                                            {item.name}
                                                        </p>
                                                        {item.sku && (
                                                            <p className={`text-[10px] font-medium mt-1 uppercase tracking-widest ${isDisabled ? "text-gray-300" : "text-gray-400"}`}>
                                                                {item.sku}
                                                            </p>
                                                        )}
                                                    </td>

                                                    {/* Qty input + "X left" */}
                                                    <td
                                                        className="px-3 sm:px-4 py-3"
                                                        onClick={e => e.stopPropagation()}
                                                    >
                                                        <div className="flex items-center justify-center gap-1 sm:gap-2">
                                                            <input
                                                                type="text"
                                                                inputMode="numeric"
                                                                value={qty}
                                                                onChange={(e) => handleQtyInput(item.id, e.target.value, groupName)}
                                                                disabled={isDisabled}
                                                                className="w-9 sm:w-10 h-8 border border-gray-300 rounded text-center text-sm font-bold text-black outline-none focus:border-[#5b7fcf] disabled:bg-gray-100 disabled:cursor-not-allowed"
                                                            />
                                                            <span className={`text-[10px] font-bold uppercase tracking-widest whitespace-nowrap hidden sm:inline ${isDisabled ? "text-gray-300" : "text-black/40"}`}>
                                                                {item.qty_available}
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Footer — sticky at bottom on mobile */}
                <div className="bg-black p-4 flex items-center justify-center gap-4 safe-area-bottom">

                    <button
                        onClick={handleConfirm}
                        disabled={totalSelected === 0}
                        className="bg-primary text-white px-10 sm:px-16 py-3 text-body md:text-base rounded-lg font-bold uppercase tracking-wider hover:bg-primaryHover transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-1 sm:flex-none shadow-lg"
                    >
                        ADD TO CART
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GiftModal;
