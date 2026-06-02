"use client";
import { useLocalePath } from "@/hooks/useLocalePath";
import { useTranslation } from "@/hooks/useTranslation";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { fetchAddresses, deleteAddress, setDefaultAddress } from "@/store/actions/addressActions";
import { RootState } from "@/store/store";
import toast from "react-hot-toast";
import Pagination from "@/components/Pagination";
import PortalDropdown from "@/components/PortalDropdown";

type Address = {
  id: number | string;
  firstname?: string;
  lastname?: string;
  company?: string;
  street?: string[];
  city?: string;
  country_id?: string;
  region?: {
    region?: string;
  };
  postcode?: string;
  telephone?: string;
  default_billing?: boolean;
  default_shipping?: boolean;
};

type AddressCardProps = {
  title: string;
  address?: Address;
  onEdit?: (id: number | string) => void;
  buttonLabel?: string;
  t: (key: string) => string;
  isRtl: boolean;
};

function AddressCard({ title, address, onEdit, buttonLabel, t, isRtl }: AddressCardProps) {
  return (
    <div className="bg-white border border-border rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col h-full group">
      <div className="bg-primary px-5 py-4 border-b border-border uppercase text-label font-bold text-black tracking-widest ltr:text-left rtl:text-right group-hover:bg-primary/50 transition-colors">
        {title}
      </div>
      <div className="p-6 flex-grow ltr:text-left rtl:text-right">
        {address ? (
          <div className="space-y-1.5 text-body text-black/70">
            <p className="font-bold text-black uppercase mb-3 text-sm tracking-tight leading-tight">
              {address.firstname} {address.lastname}
            </p>
            {address.company && <p className="font-medium">{address.company}</p>}
            <p className="font-medium">{Array.isArray(address.street) ? address.street.join(", ") : address.street}</p>
            <p className="font-medium text-black">
              {address.city}{isRtl ? "،" : ","} <span dir="ltr">{address.postcode}</span>
            </p>
            <p className="font-medium">{address.country_id === 'SA' ? t("addressBook.saudiArabia") : address.country_id}</p>
            <div className="pt-3 flex items-center gap-2">
              <span className="text-label font-bold text-black uppercase tracking-wider">{t("addressBook.phone")}:</span>
              <span className="text-black/70 font-bold hover:text-primary cursor-pointer transition-colors duration-200" dir="ltr">{address.telephone}</span>
            </div>
            {buttonLabel && (
              <div className="pt-8 mt-auto">
                <button
                  type="button"
                  className="bg-primary hover:bg-primaryHover text-black text-label font-bold px-10 py-3.5 uppercase transition-all rounded-lg shadow-sm tracking-widest active:scale-95 flex items-center gap-2"
                  onClick={() => onEdit?.(address.id)}
                >
                  {buttonLabel}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-10 text-black/50">
            <p className="italic text-xs font-semibold uppercase tracking-widest bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
              {t("addressBook.noDefaultAddress")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


export default function Addresses() {
  const router = useRouter();
  const lp = useLocalePath();
  const { t, isRtl } = useTranslation();
  const dispatch = useDispatch();
  const { addresses, loading, error } = useSelector((state: RootState) => state.address);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  useEffect(() => {
    // @ts-ignore
    dispatch(fetchAddresses());
  }, [dispatch]);

  useEffect(() => {
    if (loading) {
      setHasLoadedOnce(true);
    }
  }, [loading]);


  const handleAddressAction = async (action: string, addressId: number | string) => {
    if (action === "edit") {
      router.push(lp(`/customer/address-book/edit/${addressId}`));
      return;
    }

    if (action === "delete") {
      const confirmed = window.confirm(t("addressBook.deleteConfirm"));
      if (!confirmed) return;

      setActionLoading(true);
      // @ts-ignore
      dispatch(deleteAddress(addressId, (err) => {
        if (!err) {
          toast.success(t("addressBook.deleted"));
        } else {
          toast.error(err || t("addressBook.deleteFailed"));
        }
        setActionLoading(false);
      }));
      return;
    }

    if (action === "set_default_billing") {
      setActionLoading(true);
      // @ts-ignore
      dispatch(setDefaultAddress({ addressId, type: "billing" }, (err) => {
        if (!err) {
          toast.success(t("addressBook.defaultBillingSet"));
        } else {
          toast.error(err || t("addressBook.defaultBillingFailed"));
        }
        setActionLoading(false);
      }));
      return;
    }

    if (action === "set_default_shipping") {
      setActionLoading(true);
      // @ts-ignore
      dispatch(setDefaultAddress({ addressId, type: "shipping" }, (err) => {
        if (!err) {
          toast.success(t("addressBook.defaultShippingSet"));
        } else {
          toast.error(err || t("addressBook.defaultShippingFailed"));
        }
        setActionLoading(false);
      }));
    }
  };

  const additionalAddresses = addresses.filter((address: any) => !address.default_billing && !address.default_shipping);
  const filteredAddresses = additionalAddresses;

  const defaultBilling = addresses.find((address: any) => address.default_billing);
  const defaultShipping = addresses.find((address: any) => address.default_shipping);

  if ((loading || !hasLoadedOnce) && addresses.length === 0) {
    // Inline loading state — mirrors the real Addresses layout (header,
    // Default-Addresses section with 2 cards, Additional-Addresses section
    // with a table) so the swap-in to real data causes no layout shift.
    return (
      <div className="w-full space-y-12 animate-pulse" dir={isRtl ? "rtl" : "ltr"}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-gray-200">
          <div className="h-7 md:h-9 w-48 md:w-56 bg-gray-200 rounded" />
        </div>

        {/* Section 1: Default Addresses */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <div className="h-7 w-52 bg-gray-200 rounded" />
            <div className="h-[2px] flex-1 bg-gradient-to-r from-primary to-transparent" />
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="bg-white border border-border rounded-xl shadow-sm overflow-hidden flex flex-col h-full"
              >
                <div className="bg-primary px-5 py-4 border-b border-border">
                  <div className="h-4 w-48 bg-black/10 rounded" />
                </div>
                <div className="p-6 flex-grow flex flex-col">
                  <div className="space-y-1.5">
                    <div className="h-4 w-40 bg-gray-200 rounded mb-3" />
                    <div className="h-3.5 w-36 bg-gray-200 rounded" />
                    <div className="h-3.5 w-full max-w-[280px] bg-gray-200 rounded" />
                    <div className="h-3.5 w-3/5 bg-gray-200 rounded" />
                    <div className="h-3.5 w-28 bg-gray-200 rounded" />
                    <div className="pt-3 flex items-center gap-2">
                      <div className="h-3 w-12 bg-gray-200 rounded" />
                      <div className="h-3 w-32 bg-gray-200 rounded" />
                    </div>
                  </div>
                  {i === 1 && (
                    <div className="pt-8 mt-auto">
                      <div className="h-11 w-48 bg-gray-200 rounded-lg" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Additional Addresses */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <div className="h-7 w-60 bg-gray-200 rounded" />
            <div className="h-[2px] flex-1 bg-gradient-to-r from-primary to-transparent" />
          </div>
          <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4">
                  <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
                  <div className="space-y-1.5">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <div key={j} className="flex items-start gap-2">
                        <div className="h-3 w-16 bg-gray-200 rounded" />
                        <div className="h-3 flex-1 max-w-[180px] bg-gray-200 rounded" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-gray-100 border-b border-border h-[60px]">
                    {["w-16", "w-16", "w-24", "w-12", "w-12", "w-14"].map((w, i) => (
                      <th key={i} className="px-6 py-4 text-left">
                        <div className={`h-3 ${w} bg-gray-200 rounded`} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-50">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="h-[70px]">
                      <td className="px-6 py-4"><div className="h-3 w-20 bg-gray-200 rounded" /></td>
                      <td className="px-6 py-4"><div className="h-3 w-20 bg-gray-200 rounded" /></td>
                      <td className="px-6 py-4"><div className="h-3 w-32 bg-gray-200 rounded" /></td>
                      <td className="px-6 py-4"><div className="h-3 w-16 bg-gray-200 rounded" /></td>
                      <td className="px-6 py-4"><div className="h-3 w-14 bg-gray-200 rounded" /></td>
                      <td className="px-6 py-4"><div className="h-3 w-24 bg-gray-200 rounded" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="w-full space-y-12" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header with Add Address Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-gray-100">
        <div>
          <h1 className="text-h3 md:text-h1-sm font-bold text-black uppercase tracking-tight">
            {t("addressBook.title") || "ADDRESS BOOK"}
          </h1>
          {/* <p className="text-body text-black/60 mt-1 font-medium">
            {t("addressBook.subtitle") || "Manage your shipping and billing addresses"}
          </p> */}
        </div>
        {/* <button
          onClick={() => router.push(lp("/customer/address-book/edit/new"))}
          className="bg-primary hover:bg-primaryHover text-black text-label font-bold px-8 py-3.5 uppercase transition-all rounded-lg shadow-sm tracking-widest active:scale-95 flex items-center gap-2 cursor-pointer"
        >
          <span className="text-lg leading-none">+</span> {t("addressBook.addAddress") || "ADD NEW ADDRESS"}
        </button> */}
      </div>

      {/* Section 1: Default Addresses */}
      <section>
        <div className="flex items-center gap-4 mb-8">
          <h2 className="text-xl font-bold text-black uppercase tracking-tight">{t("addressBook.defaultAddresses")}</h2>
          <div className="h-[2px] flex-1 bg-gradient-to-r from-primary to-transparent"></div>
        </div>

        {/* 1 col through tablet so cards have full width next to the account
            sidebar; 2 cols only at xl (≥1280px) where there's space. */}
        <div className="grid xl:grid-cols-2 gap-8">
          <AddressCard
            title={t("addressBook.defaultBillingAddress")}
            address={defaultBilling}
            t={t}
            isRtl={isRtl}
          />
          <AddressCard
            title={t("addressBook.defaultShippingAddress")}
            address={defaultShipping}
            onEdit={(id) => handleAddressAction("edit", id)}
            buttonLabel={t("addressBook.editShippingAddress")}
            t={t}
            isRtl={isRtl}
          />
        </div>
      </section>

      {/* Section 2: Additional Addresses */}
      <section>
        <div className="flex items-center gap-4 mb-8">
          <h2 className="text-xl font-bold text-black uppercase tracking-tight">{t("addressBook.additionalAddresses")}</h2>
          <div className="h-[2px] flex-1 bg-gradient-to-r from-primary to-transparent"></div>
        </div>

        {filteredAddresses.length > 0 ? (
          <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
            {/* MOBILE CARDS — below md (768px) the 6-col table forces horizontal
                scroll, so render the same fields as a stacked card per address. */}
            <div className="md:hidden divide-y divide-gray-100">
              {error && (
                <div className="px-4 py-16 text-center flex flex-col items-center gap-2">
                  <span className="text-red-500 text-xs font-bold uppercase tracking-widest">{t("common.error")}</span>
                  <p className="text-black/60 text-body">{error}</p>
                </div>
              )}
              {filteredAddresses.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((address: any) => (
                <div key={address.id} className="p-4 hover:bg-primary/5 transition-colors">
                  <div className="flex flex-wrap items-baseline gap-x-2 mb-2">
                    <span className="text-body font-bold text-black uppercase">{address.firstname} {address.lastname}</span>
                  </div>
                  <div className="space-y-1.5 text-body-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-label font-bold text-black/40 uppercase tracking-widest min-w-[64px] mt-0.5">{t("addressBook.streetAddress")}</span>
                      <span className="text-black/70 font-medium flex-1">{Array.isArray(address.street) ? address.street.join(", ") : address.street || "-"}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-label font-bold text-black/40 uppercase tracking-widest min-w-[64px] mt-0.5">{t("addressBook.city")}</span>
                      <span className="text-black font-bold uppercase flex-1">{address.city}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-label font-bold text-black/40 uppercase tracking-widest min-w-[64px] mt-0.5">{t("addressBook.zipCode")}</span>
                      <span dir="ltr" className="text-black/80 font-bold flex-1">{address.postcode}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-label font-bold text-black/40 uppercase tracking-widest min-w-[64px] mt-0.5">{t("addressBook.phone")}</span>
                      <span dir="ltr" className="text-black/70 font-bold flex-1">{address.telephone}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP TABLE — md (768px) and up, where 6 cols fit without scroll. */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-gray-100 border-b border-border text-black text-label font-bold uppercase tracking-widest h-[60px]">
                    <th className="px-6 py-4 ltr:text-left rtl:text-right">{t("addressBook.firstName")}</th>
                    <th className="px-6 py-4 ltr:text-left rtl:text-right">{t("addressBook.lastName")}</th>
                    <th className="px-6 py-4 ltr:text-left rtl:text-right">{t("addressBook.streetAddress")}</th>
                    <th className="px-6 py-4 ltr:text-left rtl:text-right">{t("addressBook.city")}</th>
                    <th className="px-6 py-4 ltr:text-left rtl:text-right">{t("addressBook.zipCode")}</th>
                    <th className="px-6 py-4 ltr:text-left rtl:text-right">{t("addressBook.phone")}</th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-50">
                  {error && (
                    <tr>
                      <td colSpan={6} className="px-6 py-24 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-red-500 text-xs font-bold uppercase tracking-widest">{t("common.error")}</span>
                          <p className="text-black/60 text-body">{error}</p>
                        </div>
                      </td>
                    </tr>
                  )}

                  {filteredAddresses.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((address: any, idx: number) => (
                    <tr key={address.id} className="hover:bg-primary/5 transition-colors text-body group h-[70px]">
                      <td className="px-6 py-4 font-bold text-black uppercase ltr:text-left rtl:text-right">{address.firstname}</td>
                      <td className="px-6 py-4 font-bold text-black uppercase ltr:text-left rtl:text-right">{address.lastname}</td>
                      <td className="px-6 py-4 text-black/60 font-medium ltr:text-left rtl:text-right">{Array.isArray(address.street) ? address.street.join(", ") : address.street || "-"}</td>
                      <td className="px-6 py-4 uppercase font-bold text-black ltr:text-left rtl:text-right">{address.city}</td>
                      <td className="px-6 py-4 font-bold text-black/80 ltr:text-left rtl:text-right group-hover:text-black transition-colors"><span dir="ltr">{address.postcode}</span></td>
                      <td className="px-6 py-4 ltr:text-left rtl:text-right">
                        <span dir="ltr" className="text-black/70 font-bold hover:text-primary cursor-pointer transition-colors duration-200">
                          {address.telephone}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-2 border-t border-gray-50 bg-gray-50/30">
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredAddresses.length / pageSize)}
                totalItems={filteredAddresses.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(val) => { setPageSize(val); setCurrentPage(1); }}
              />
            </div>
          </div>
        ) : (
          <p className="text-black/60 text-body ltr:text-left rtl:text-right font-medium">
            {t("addressBook.noAdditionalAddresses") !== "addressBook.noAdditionalAddresses"
              ? t("addressBook.noAdditionalAddresses")
              : "You have no other address entries in your address book."}
          </p>
        )}
      </section>
    </div>
  );
}
