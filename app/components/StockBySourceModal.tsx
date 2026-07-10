"use client";

import React, { useState, useEffect } from "react";
import Drawer from "./Drawer";
import { useTranslation } from "@/hooks/useTranslation";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";

interface StockBySourceItem {
  source_code: string;
  quantity: number;
}

interface StockBySourceModalProps {
  sku: string | null;
  productName?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

function StockBySourceSkeleton() {
  return (
    <div className="w-full animate-pulse divide-y divide-gray-100">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="py-3 flex justify-between items-center">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-10"></div>
        </div>
      ))}
    </div>
  );
}

export default function StockBySourceModal({ sku, productName, isOpen, onClose }: StockBySourceModalProps) {
  const { t, isRtl } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<StockBySourceItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Lock body scroll when modal is open
  useLockBodyScroll(isOpen);

  useEffect(() => {
    if (!isOpen || !sku) {
      setItems([]);
      setError(null);
      return;
    }

    const fetchStock = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/kleverapi/stock-by-source?sku=${encodeURIComponent(sku)}`);
        if (!response.ok) {
          throw new Error("Failed to fetch stock information");
        }
        const data = await response.json();

        if (data.items && Array.isArray(data.items)) {
          setItems(data.items);
        } else if (data.success === false && data.message) {
          setError(data.message);
        } else {
          setItems([]);
        }
      } catch (err: any) {
        console.error("Error fetching stock by source:", err);
        setError(err.message || "Failed to load stock details.");
      } finally {
        setLoading(false);
      }
    };

    fetchStock();
  }, [sku, isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const translateWarehouse = (code: string) => {
    const key = `data.${code}`;
    const translated = t(key);
    return translated !== key ? translated : code;
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col h-full w-full min-w-full bg-white font-sans" dir={isRtl ? "rtl" : "ltr"}>
        {/* Header */}
        <div className="bg-[#4E81C2] px-4 md:px-8 py-5 flex items-center justify-center relative flex-shrink-0 w-full">
          <h2 className="text-lg md:text-xl font-bold text-white text-center tracking-tight leading-none">
            {t("stockBySource.title")}
          </h2>
        </div>

        {/* Body Section */}
        <div className="bg-white px-6 py-5 md:py-2 flex-1 overflow-y-auto w-full">
          {loading ? (
            <StockBySourceSkeleton />
          ) : error ? (
            <div className="text-center py-8 text-red-500 font-medium text-body-sm">
              {error}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-10 text-gray-400 italic text-body-sm">
              {t("stockBySource.noStock")}
            </div>
          ) : (
            <div className="w-full">
              <table className="w-full text-left border-collapse rtl:text-right">
                <tbody className="divide-y divide-gray-100 text-body font-medium text-gray-900">
                  {items.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 text-sm font-semibold text-gray-600 uppercase tracking-wide">
                        {translateWarehouse(item.source_code)}
                      </td>
                      <td className="py-3.5 text-right rtl:text-left text-sm font-semibold text-gray-800">
                        {item.quantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
