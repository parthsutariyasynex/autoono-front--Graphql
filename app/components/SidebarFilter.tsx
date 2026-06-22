"use client";

import { useEffect, useState, useCallback, useRef, memo, useMemo } from "react";
import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight, Filter, X, FileText } from "lucide-react";
import { useLocalePath } from "@/hooks/useLocalePath";
import { useTranslation } from "@/hooks/useTranslation";

export interface FilterOption {
    value: string;
    label: string;
    count: number;
}

export interface FilterGroupData {
    code: string;
    label: string;
    options: FilterOption[];
}

const FilterItem = memo(({
    option,
    groupCode,
    isChecked,
    onCheckboxChange
}: {
    option: FilterOption;
    groupCode: string;
    isChecked: boolean;
    onCheckboxChange: (code: string, value: string, checked: boolean) => void
}) => {
    const { t } = useTranslation();
    // Translate known filter values (brand, origin, stock) using data.* keys
    const translatedLabel = t(`data.${option.label}`) !== `data.${option.label}` ? t(`data.${option.label}`) : option.label;
    return (
        <label className="flex items-center justify-between cursor-pointer group/label">
            <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center">
                    <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => onCheckboxChange(groupCode, option.value, e.target.checked)}
                        className="peer appearance-none outline-none shadow-none w-4 h-4 border-2 border-gray-300 rounded-[3px] checked:bg-primary checked:border-primary focus:outline-none focus:ring-0 focus:ring-primary/50 focus:ring-offset-0 transition-all cursor-pointer"
                    />
                    <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 14 10" fill="none">
                        <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <span className={`text-body transition-colors leading-tight ${isChecked ? 'text-black font-medium' : 'text-black/70 font-medium group-hover/label:text-black'}`}>
                    {translatedLabel}
                </span>
            </div>
            <span className="text-xs font-semibold text-black/70 bg-gray-30 rounded border border-gray-300 group-hover/label:bg-gray-100 transition-colors w-5 h-5 text-center content-center">
                {option.count ?? 0}
            </span>
        </label>
    );
});

FilterItem.displayName = "FilterItem";

const FilterGroup = memo(({
    group,
    isExpanded,
    onToggle,
    selectedValues,
    onCheckboxChange
}: {
    group: FilterGroupData;
    isExpanded: boolean;
    onToggle: () => void;
    selectedValues: string[];
    onCheckboxChange: (code: string, value: string, checked: boolean) => void;
}) => {
    const { t, isRtl } = useTranslation();
    const [searchTerm, setSearchTerm] = useState("");

    const translatedLabel = t(`filter.${group.code}`) !== `filter.${group.code}` ? t(`filter.${group.code}`) : group.label;

    const filteredOptions = useMemo(() =>
        group.options.filter(opt =>
            opt.label.toLowerCase().includes(searchTerm.toLowerCase())
        ), [group.options, searchTerm]
    );

    return (
        <div className="border-b border-gray-100 last:border-b-0">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors focus:outline-none focus:bg-gray-50 group-btn cursor-pointer"
                aria-expanded={isExpanded}
            >
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-black text-[15px]">{translatedLabel}</span>
                </div>
                <div className={`text-black/50 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-4 h-4" strokeWidth={2.5} />
                </div>
            </button>

            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-6 pb-5 flex flex-col gap-3">
                    {group.options.length > 5 && (
                        <div className="relative mb-1">
                            <input
                                type="text"
                                placeholder={isRtl ? `${t("m.search")}...` : `${t("m.search")} ${translatedLabel}...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-3 pr-3 py-1.5 text-xs border border-[#ddd] rounded-sm outline-none focus:border-primary" />
                            <X className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-black/50 cursor-pointer" onClick={() => setSearchTerm("")} />
                        </div>
                    )}

                    <div className="overflow-y-auto max-h-[300px] custom-scrollbar pr-1 flex flex-col gap-2.5">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <FilterItem
                                    key={option.value}
                                    option={option}
                                    groupCode={group.code}
                                    isChecked={selectedValues.includes(option.value)}
                                    onCheckboxChange={onCheckboxChange}
                                />
                            ))
                        ) : (
                            <div className="text-label text-black/50 italic py-2 text-center">No matches found</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

FilterGroup.displayName = "FilterGroup";

function SidebarFilter({
    categoryId = "",
    selectedFilters = {},
    onFilterChange,
    isCollapsed: externalIsCollapsed,
    setIsCollapsed: setExternalIsCollapsed,
    initialFilters = null
}: {
    categoryId?: string;
    selectedFilters?: Record<string, string[]>;
    onFilterChange?: (filters: Record<string, string[]>, filterLabels: Record<string, { value: string; label: string }[]>) => void;
    isCollapsed?: boolean;
    setIsCollapsed?: (collapsed: boolean) => void;
    initialFilters?: any[] | null;
}) {
    const [filterGroups, setFilterGroups] = useState<FilterGroupData[]>([]);
    const lp = useLocalePath();
    const { t, isRtl } = useTranslation();
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    const [internalIsCollapsed, setInternalIsCollapsed] = useState(false);
    const isCollapsed = externalIsCollapsed !== undefined ? externalIsCollapsed : internalIsCollapsed;
    const setIsCollapsed = setExternalIsCollapsed !== undefined ? setExternalIsCollapsed : setInternalIsCollapsed;

    // ✅ Sync filterGroups from initialFilters prop immediately
    useEffect(() => {
        if (!initialFilters || !Array.isArray(initialFilters)) return;

        const mapped = initialFilters.map((g: any) => ({
            code: g.code || g.attribute_code || "",
            label: g.label || g.name || "",
            options: (g.options || []).map((o: any) => ({
                value: String(o.value ?? ""),
                label: String(o.label ?? o.value ?? ""),
                count: Number(o.count ?? 0),
            })),
        }));

        setFilterGroups(mapped);

        // Keep them closed by default unless they have an active selection
        setExpandedGroups(prev => {
            const init: Record<string, boolean> = { ...prev };
            mapped.forEach(g => {
                const hasSelection = selectedFilters[g.code] && selectedFilters[g.code].length > 0;
                if (hasSelection) {
                    init[g.code] = true;
                }
            });
            return init;
        });

        setLoading(false);
    }, [initialFilters]);

    // ✅ Fetch filters only if initialFilters not provided
    useEffect(() => {
        if (initialFilters) return;

        let cancelled = false;
        const fetchFilters = async () => {
            try {
                setLoading(true);
                const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                const fetchLocale = typeof window !== 'undefined' && window.location.pathname.startsWith("/ar") ? "ar" : "en";
                const headers: any = { 'Content-Type': 'application/json', 'x-locale': fetchLocale };
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const res = await fetch(`/api/filters?categoryId=${categoryId}&lang=${fetchLocale}`, { headers });
                if (cancelled) return;
                if (res.status === 401) {
                    localStorage.removeItem("token");
                    window.location.href = lp("/login");
                    return;
                }
                if (!res.ok) throw new Error("Failed to load filters");
                const data = await res.json();
                if (cancelled) return;

                const raw = Array.isArray(data) ? data : (data.filters || data.items || []);
                const mapped: FilterGroupData[] = raw.map((g: any) => ({
                    code: g.code || g.attribute_code || "",
                    label: g.label || g.name || "",
                    options: (g.options || []).map((o: any) => ({
                        value: String(o.value ?? ""),
                        label: String(o.label ?? o.value ?? ""),
                        count: Number(o.count ?? 0),
                    })),
                }));

                setFilterGroups(mapped);

                // Start all groups closed unless they have an active selection
                const initialExpanded: Record<string, boolean> = {};
                mapped.forEach(g => {
                    const hasSelection = selectedFilters[g.code] && selectedFilters[g.code].length > 0;
                    if (hasSelection) {
                        initialExpanded[g.code] = true;
                    }
                });
                setExpandedGroups(initialExpanded);
            } catch (err: any) {
                if (!cancelled) setError(err.message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchFilters();
        return () => { cancelled = true; };
    }, [categoryId, initialFilters]);

    const handleCheckboxChange = useCallback((code: string, value: string, checked: boolean) => {
        const currentValues = selectedFilters[code] || [];
        let newValues: string[];

        if (checked) {
            newValues = currentValues.includes(value) ? currentValues : [...currentValues, value];
        } else {
            newValues = currentValues.filter((v) => v !== value);
        }

        const nextState = { ...selectedFilters, [code]: newValues };
        if (newValues.length === 0) delete nextState[code];

        const nextLabels: Record<string, { value: string; label: string }[]> = {};
        Object.entries(nextState).forEach(([c, vals]) => {
            const group = filterGroups.find((g) => g.code === c);
            if (group) {
                nextLabels[c] = vals.map(v => {
                    const opt = group.options.find(o => o.value === v);
                    const rawLabel = opt ? opt.label : v;
                    // Apply the same data.* translation that the checkbox row
                    // uses, so the selected-filter chip in the products listing
                    // shows the localized name (e.g. "Automotive Lubricants" →
                    // its Arabic equivalent when the page is in AR mode).
                    const translatedLabel = t(`data.${rawLabel}`) !== `data.${rawLabel}` ? t(`data.${rawLabel}`) : rawLabel;
                    return { value: v, label: translatedLabel };
                });
            }
        });

        onFilterChange?.(nextState, nextLabels);
    }, [onFilterChange, filterGroups, selectedFilters, t]);

    const toggleGroup = useCallback((code: string) => {
        setExpandedGroups(prev => ({ [code]: !prev[code] }));
    }, []);

    // Always show every filter group — previously we hid "irrelevant"
    // groups once the user selected anything, which made the sidebar
    // suddenly shrink and shifted the whole layout on every click.
    const visibleFilterGroups = filterGroups;

    return (
        <aside
            className={`flex-shrink-0 flex flex-col sticky top-[108px] h-fit z-30 transition-all duration-300 ease-in-out bg-white overflow-hidden ${isCollapsed ? 'w-[50px]' : 'w-[300px] border-r border-gray-200'}`}
        >
            {/* Header — title + arrow inline */}
            <div className="flex items-center w-full h-[60px] border-b border-gray-200 bg-white shadow-sm flex-shrink-0">
                {!isCollapsed && (
                    <div className="flex-1 px-6 flex items-center overflow-hidden min-w-0">
                        <h2 className="font-semibold text-black text-h3-sm whitespace-nowrap">{t("m.filter-options")}</h2>
                    </div>
                )}
                <div
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="w-[50px] min-w-[50px] rtl:rotate-180 h-full flex items-center justify-center bg-gray-50 cursor-pointer hover:bg-gray-100 transition-all duration-300"
                >
                    {isCollapsed
                        ? <ChevronRight className="w-[18px] h-[18px]" />
                        : <ChevronLeft className="w-[18px] h-[18px]" />
                    }
                </div>
            </div>

            {/* Content panel */}
            <div className={`flex flex-col flex-1 transition-opacity duration-300 overflow-hidden ${isCollapsed ? 'opacity-0 h-0' : 'opacity-100'}`}>

                {/* Content area: stabilized width */}
                <div className={`flex-1 flex flex-col bg-white transition-opacity duration-300 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>
                    <div className="w-full">
                        {loading ? (
                            // Mirrors real FilterGroup rows pixel-for-pixel so the swap-in
                            // doesn't shift layout: same px-6 py-4 padding, same h-[15px]
                            // label rendered height, same chevron position, same border.
                            <div>
                                {Array.from({ length: 6 }).map((_, i) => {
                                    const widths = ["w-20", "w-24", "w-16", "w-28", "w-20", "w-24"];
                                    return (
                                        <div key={i} className="border-b border-gray-100 last:border-b-0">
                                            <div className="w-full flex items-center justify-between px-6 py-4">
                                                <div className={`h-[15px] bg-gray-200 rounded animate-pulse ${widths[i]}`} />
                                                <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : error ? (
                            <div className="p-5 text-red-500 text-xs">{error}</div>
                        ) : (
                            visibleFilterGroups.map((group) => (
                                <FilterGroup
                                    key={group.code}
                                    group={group}
                                    isExpanded={!!expandedGroups[group.code]}
                                    onToggle={() => toggleGroup(group.code)}
                                    selectedValues={selectedFilters[group.code] || []}
                                    onCheckboxChange={handleCheckboxChange}
                                />
                            ))
                        )}
                    </div>
                </div>
            </div>
        </aside>
    );
}

export default memo(SidebarFilter);