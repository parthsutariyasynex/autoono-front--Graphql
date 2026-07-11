"use client";

import type { Product } from "@/modules/types/product";
import Drawer from "./Drawer";
import { useTranslation } from "@/hooks/useTranslation";

interface ProductDialogProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductDialog({ product, isOpen, onClose }: ProductDialogProps) {
  const { t, isRtl } = useTranslation();
  const p = (product || {}) as any;

  const getAttr = (code: string) => {
    if (p[code] !== undefined && p[code] !== null && p[code] !== "") return p[code];
    const labelKey = `${code}_label`;
    if (p[labelKey] !== undefined && p[labelKey] !== null && p[labelKey] !== "") return p[labelKey];
    const attr = p.custom_attributes?.find((a: any) => a.attribute_code === code);
    if (attr) return attr.value;
    return null;
  };

  const translateValue = (val: any) => {
    if (val === undefined || val === null || val === "") return "-";
    const key = `data.${val}`;
    const translated = t(key);
    return translated !== key ? translated : val;
  };

  const details = [
    { label: t("productDialog.itemCode"), value: getAttr("item_code") || p.sku || p.id },
    { label: t("productDialog.brand"), value: translateValue(getAttr("brand") || p.manufacturer || (p.name ? p.name.split(' ')[0] : "")) },
    { label: t("productDialog.size"), value: getAttr("tyre_size") || p.size },
    { label: t("productDialog.pattern"), value: getAttr("pattern") || p.pattern },
    { label: t("productDialog.year"), value: getAttr("year") || p.model_year },
    { label: t("productDialog.origin"), value: translateValue(getAttr("origin") || p.country_of_manufacture) },
    {
      label: t("productDialog.productGroup"),
      value: translateValue(getAttr("product_group") || getAttr("category_name") || getAttr("types") || getAttr("type") || p.product_group)
    },
    {
      label: t("productDialog.tyreType"),
      value: translateValue(getAttr("tyre_type") || getAttr("types") || getAttr("type_of_tyre") || getAttr("construction_type") || p.tyre_type)
    },
    {
      label: t("productDialog.oemMarking"),
      value: translateValue(getAttr("oem_marking") || getAttr("marking") || getAttr("oem") || p.oem_marking)
    },
  ];

  return (
    <Drawer isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col h-full bg-white" dir={isRtl ? "rtl" : "ltr"}>
        {/* Yellow Header */}
        <div className="bg-primary px-4 md:px-8 py-4 md:py-6 flex items-center justify-center relative flex-shrink-0">
          <h2 className="text-body-lg md:text-[17px] font-semibold text-black text-center tracking-tight">
            {p.tyre_size || ""} {p.pattern || p.name ? ` - ${p.pattern || p.name}` : ""}
          </h2>
        </div>

        {/* Body Section */}
        <div className="bg-white px-4 md:px-8 py-5 md:py-8 font-sans flex-1 overflow-y-auto">
          <div className="space-y-0">
            {details.map((row, index) => (
              <div
                key={index}
                className="flex justify-between items-center py-3 md:py-4 border-b border-gray-100 last:border-0 gap-4"
              >
                <span className="text-body-sm md:text-body-lg font-bold text-black flex-shrink-0">
                  {row.label}
                </span>
                <span className="text-body-sm md:text-body-lg font-semibold text-black ltr:text-right rtl:text-left truncate">
                  {row.value || "-"}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 md:mt-10 py-4 md:py-6 border-t border-gray-100">
            <button
              onClick={onClose}
              className="w-full py-3 md:py-4 bg-gray-900 text-white text-body-sm md:text-body-lg font-semibold uppercase tracking-widest rounded shadow-lg hover:bg-black transition-all"
            >
              {t("productDialog.closeDetails")}
            </button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
