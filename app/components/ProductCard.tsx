"use client";

import { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Star, Info, Check } from "lucide-react";
import Price from "./Price";
import { useTranslation } from "@/hooks/useTranslation";
import { ButtonSpinner } from "@/components/GlobalLoadingOverlay";

export function stockColorClass(color?: string) {
    const c = (color || "").toLowerCase();
    if (c === "green") return "bg-green-500";
    if (c === "yellow" || c === "orange") return "bg-primary";
    if (c === "red") return "bg-red-500";
    return "bg-gray-400";
}

export function StockBadge({ product }: { product: any }) {
    const { t } = useTranslation();
    const rawLabel = product.stock_label || "";
    const _tKey = `data.${rawLabel}`;
    const displayLabel = rawLabel && t(_tKey) !== _tKey ? t(_tKey) : rawLabel;
    return (
        <div className="flex flex-col items-center justify-center text-center gap-1">
            <span className={`w-4 h-4 rounded-full border border-gray-100 shadow-sm ${stockColorClass(product.stock_color)}`} />
            <span className="text-caption font-semibold text-black/80 uppercase leading-none">
                {displayLabel}
            </span>
        </div>
    );
}

function resolveProductPath(product: any): string {
    if (!product.product_url) return "#";
    try { return new URL(product.product_url).pathname; }
    catch { return product.product_url; }
}

export interface ProductCardProps {
    product: any;
    variant: "card" | "row";
    priority?: boolean;
    qty: number;
    isAdding: boolean;
    isJustAdded: boolean;
    isFavorite: boolean;
    showActionColumn?: boolean;
    canOrder?: boolean;
    onAddToCart: (product: any) => void;
    onToggleFavorite: (product: any) => void;
    onInquiry: (product: any) => void;
    onQtyChange: (sku: string, qty: number) => void;
    onImagePreview?: (product: any) => void;
}

function ProductCardImpl({
    product,
    variant,
    priority,
    qty,
    isAdding,
    isJustAdded,
    isFavorite,
    showActionColumn,
    canOrder = true,
    onAddToCart,
    onToggleFavorite,
    onInquiry,
    onQtyChange,
    onImagePreview,
}: ProductCardProps) {
    const { t } = useTranslation();
    const showActions = canOrder && product.is_action === "Yes";
    const showOldPrice = product.show_old_price !== false && product.original_price > product.final_price;
    const isOutOfStock = product.is_in_stock === false || product.stock_label === "Not Available";
    const productPath = resolveProductPath(product);
    const _slKey = `data.${product.stock_label || ""}`;
    const translatedStockLabel = product.stock_label && t(_slKey) !== _slKey ? t(_slKey) : (product.stock_label || "");

    if (variant === "card") {
        return (
            <div className="bg-white rounded-sm border border-[#ddd] shadow-sm p-2.5 sm:p-3 flex flex-col gap-1.5 hover:border-primary/30 transition-colors">
                <Link href={productPath} className="flex gap-2.5 group/card">
                    <div className="flex-1 min-w-0">
                        <p className="text-caption font-semibold text-black/50 uppercase tracking-wider">{product.brand || "—"}</p>
                        <p className="text-body-sm md:text-body font-semibold text-black leading-tight mt-0.5 truncate group-hover/card:text-primary transition-colors">{product.name || "—"}</p>
                        {product.item_code && (
                            <p className="text-caption text-black/40 font-medium mt-0.5 truncate">{product.item_code}</p>
                        )}
                        <div className="flex items-center gap-1.5 mt-1.5">
                            <span className={`w-2 h-2 rounded-full ${stockColorClass(product.stock_color)}`} />
                            <span className="text-caption font-semibold text-black/70 uppercase">{translatedStockLabel}</span>
                        </div>
                    </div>
                    <div className="w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 rounded-lg border border-gray-100 overflow-hidden bg-gray-50 flex items-center justify-center group-hover/card:border-primary/20 transition-colors relative">
                        {product.image_url
                            ? <Image src={product.image_url} alt={product.name} fill sizes="56px" priority={priority} className="object-contain" />
                            : <span className="text-[8px] text-black/40 font-semibold uppercase">No Img</span>}
                    </div>
                </Link>

                <div className="flex items-center justify-between border-t border-gray-100 pt-2 gap-2">
                    <div className="flex flex-col min-w-0">
                        {showOldPrice && (
                            <span className="text-caption font-semibold text-black/50">
                                <Price amount={product.original_price} className="font-semibold line-through" />
                            </span>
                        )}
                        <span className="text-body font-semibold text-black rubik-sans truncate">
                            <Price amount={product.final_price} />
                        </span>
                    </div>

                    {showActions && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                            {!isOutOfStock ? (
                                <>
                                    <input
                                        type="text"
                                        value={qty || 1}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, "");
                                            onQtyChange(product.sku, parseInt(val) || 0);
                                        }}
                                        className="w-9 h-8 flex-shrink-0 border border-gray-300 rounded-sm text-label font-semibold text-black bg-white shadow-sm text-center outline-none focus:border-primary transition-colors"
                                        onFocus={(e) => { const inp = e.target; setTimeout(() => inp.select(), 0); }}
                                        onClick={(e) => (e.target as HTMLInputElement).select()}
                                        onKeyDown={(e) => { if (e.key === "Enter") onAddToCart(product); }}
                                    />
                                    <button
                                        onClick={() => onAddToCart(product)}
                                        disabled={isAdding}
                                        className={`w-8 h-8 flex-shrink-0 rounded-sm flex items-center justify-center shadow-sm active:scale-95 cursor-pointer ${isJustAdded ? "bg-green-500 text-white" : "bg-primary text-black"}`}
                                    >
                                        {isJustAdded
                                            ? <Check size={14} strokeWidth={3} />
                                            : isAdding
                                                ? <ButtonSpinner size={14} />
                                                : <ShoppingCart size={14} strokeWidth={2.5} />}
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => onInquiry(product)}
                                    className="w-8 h-8 flex-shrink-0 bg-primary text-black rounded-sm flex items-center justify-center shadow-sm active:scale-95 cursor-pointer"
                                >
                                    <Info size={14} strokeWidth={2.5} />
                                </button>
                            )}
                            <button
                                onClick={() => onToggleFavorite(product)}
                                className={`w-8 h-8 flex-shrink-0 rounded-sm flex items-center justify-center active:scale-95 cursor-pointer ${isFavorite ? "bg-primary text-black" : "bg-gray-100 text-black/50"}`}
                            >
                                <Star size={15} fill={isFavorite ? "currentColor" : "none"} strokeWidth={2.5} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // variant === "row"
    return (
        <tr className="hover:bg-primary/5 transition-colors group h-auto md:h-[52px]">
            <td className="px-2 md:px-4 text-body font-normal text-black/80 text-center">
                {product.brand || "—"}
            </td>
            <td className="px-2 md:px-4 text-center">
                <span className="text-body font-normal text-black block leading-tight">{product.name || "—"}</span>
            </td>
            <td className="px-2 md:px-4 text-center">
                <div className="w-10 h-10 mx-auto">
                    {product.image_url ? (
                        <div className="relative w-10 h-10 group/img cursor-pointer" onClick={() => onImagePreview?.(product)}>
                            <Image src={product.image_url} alt={product.name} fill sizes="40px" priority={priority} className="object-contain rounded border border-gray-100 shadow-sm" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-all duration-300 flex items-center justify-center rounded">
                                <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center text-black font-semibold text-caption shadow-lg transform scale-50 group-hover/img:scale-100 transition-transform duration-300">+</div>
                            </div>
                        </div>
                    ) : <span className="text-caption text-black/40 font-semibold uppercase leading-[40px]">No Image</span>}
                </div>
            </td>
            <td className="px-2 md:px-4 text-center"><StockBadge product={product} /></td>
            <td className="px-2 md:px-4 text-center whitespace-nowrap">
                <div className="flex flex-col items-center justify-center">
                    {showOldPrice && (
                        <span className="text-caption font-semibold text-black/50 mb-0.5">
                            <Price amount={product.original_price} className="font-semibold line-through" />
                        </span>
                    )}
                    <span className="text-body-sm font-semibold text-black tracking-tight rubik-sans">
                        <Price amount={product.final_price} />
                    </span>
                </div>
            </td>
            {showActionColumn && (
                <td className="px-2 text-center align-middle min-w-[150px] whitespace-nowrap">
                    {showActions && (
                        <div className="flex flex-row items-center justify-center gap-1.5">
                            {!isOutOfStock ? (
                                <input
                                    type="text"
                                    value={qty || 1}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, "");
                                        onQtyChange(product.sku, parseInt(val) || 0);
                                    }}
                                    className="w-10 h-8 flex-shrink-0 border border-gray-300 rounded-sm text-label font-semibold text-black bg-white shadow-sm text-center outline-none focus:border-primary transition-colors"
                                    onFocus={(e) => { const t = e.target; setTimeout(() => t.select(), 0); }}
                                    onClick={(e) => (e.target as HTMLInputElement).select()}
                                    onKeyDown={(e) => { if (e.key === "Enter") onAddToCart(product); }}
                                />
                            ) : <div className="w-10 h-8 flex-shrink-0" />}

                            {!isOutOfStock ? (
                                <button onClick={() => onAddToCart(product)} disabled={isAdding} className={`w-9 h-8 flex-shrink-0 rounded-sm flex items-center justify-center shadow-md transition-all cursor-pointer ${isJustAdded ? "bg-green-500 text-white" : "bg-primary text-black"}`}>
                                    {isJustAdded
                                        ? <Check size={15} strokeWidth={3} />
                                        : isAdding
                                            ? <ButtonSpinner size={15} />
                                            : <ShoppingCart size={15} strokeWidth={2.5} />}
                                </button>
                            ) : (
                                <button onClick={() => onInquiry(product)} className="w-9 h-8 flex-shrink-0 bg-primary text-black rounded-sm flex items-center justify-center shadow-md active:scale-95 cursor-pointer">
                                    <Info size={15} strokeWidth={2.5} />
                                </button>
                            )}

                            <button onClick={() => onToggleFavorite(product)} className={`w-9 h-8 flex-shrink-0 rounded-sm flex items-center justify-center shadow-md cursor-pointer ${isFavorite ? "bg-primary text-black" : "bg-white text-black/50 border border-[#ddd]"}`}>
                                <Star size={15} fill={isFavorite ? "currentColor" : "none"} strokeWidth={2.5} />
                            </button>
                        </div>
                    )}
                </td>
            )}
        </tr>
    );
}

export const ProductCard = memo(ProductCardImpl);
