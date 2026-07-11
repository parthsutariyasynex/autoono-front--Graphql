"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { api } from "@/lib/api/api-client";
import { useTranslation } from "@/hooks/useTranslation";
import { useLocalePath } from "@/hooks/useLocalePath";
import { RootState } from "@/store/store";
import { useAction } from "@/hooks/useAction";

interface AddressFormProps {
  mode?: "new" | "edit";
  /** Required for edit mode; pass "new" to fall back to new-address creation. */
  addressId?: string;
  /** Override the heading. Defaults to "ADD NEW ADDRESS" for new, "EDIT ADDRESS" for edit. */
  title?: string;
}

/**
 * Shared address form — used by Address Book page, /customer/address/new,
 * and /customer/address-book/edit/[id].
 * Does NOT include Sidebar or page layout; the parent page provides those.
 */
export default function Addresses(props: AddressFormProps = {}) {
  return (
    <Suspense fallback={<AddressSkeleton />}>
      <AddressFormContent {...props} />
    </Suspense>
  );
}

function AddressSkeleton() {
  return (
    <>
      <div className="flex items-center gap-4 mb-5">
        <div className="h-7 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-[2px] flex-1 bg-gray-200" />
      </div>
      <div className="max-w-full space-y-4 animate-pulse">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-10 bg-gray-200 rounded" />
        ))}
      </div>
    </>
  );
}

function AddressFormContent({ mode = "new", addressId, title }: AddressFormProps) {
  const router = useRouter();
  const lp = useLocalePath();
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const { data: customer } = useSelector((state: RootState) => state.customer);

  const isEditMode = mode === "edit" && addressId !== "new";
  const [loading, setLoading] = useState(isEditMode);
  const { loading: saving, run: runSave } = useAction("save-address");
  const [addressData, setAddressData] = useState<any>(null);

  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    company: "",
    telephone: "",
    fax: "",
    street: "",
    city: "",
    postcode: "",
    country_id: "SA",
    region: "",
  });

  const [errors, setErrors] = useState({
    firstname: "",
    lastname: "",
    telephone: "",
    street: "",
    city: "",
  });

  // For new mode: prefill name from Redux customer store
  useEffect(() => {
    if (!isEditMode && customer) {
      setFormData(prev => ({
        ...prev,
        firstname: prev.firstname || customer.firstname || "",
        lastname: prev.lastname || customer.lastname || "",
      }));
    }
  }, [customer, isEditMode]);

  // For edit mode: fetch existing address data
  useEffect(() => {
    if (!isEditMode || !addressId) return;

    const fetchAddress = async () => {
      try {
        setLoading(true);
        let data: any = null;

        // Sub-account: check localStorage first
        const isSubAccount =
          typeof window !== "undefined" &&
          localStorage.getItem("isSubAccount") === "true";
        if (isSubAccount) {
          const storedData = localStorage.getItem("subAccountData");
          if (storedData) {
            const parsed = JSON.parse(storedData);
            const subCustomer = parsed.customer || parsed;
            const subAddresses = subCustomer.addresses || [];
            data = subAddresses.find(
              (a: any) => String(a.id) === String(addressId)
            );
          }
        }

        // Fallback: fetch from API
        if (!data) {
          const addresses = await api.get(`/kleverapi/addresses`);
          data = Array.isArray(addresses)
            ? addresses.find((a: any) => String(a.id) === String(addressId))
            : null;
        }

        if (!data) throw new Error("Address not found");

        setAddressData(data);
        setFormData({
          firstname: data.firstname || "",
          lastname: data.lastname || "",
          company: data.company || "",
          telephone: data.telephone || "",
          fax: data.fax || "",
          street: Array.isArray(data.street) ? data.street[0] || "" : data.street || "",
          city: data.city || "",
          postcode: data.postcode || "",
          country_id: data.country_id || "SA",
          region: typeof data.region === "string" ? data.region : (data.region?.region || data.region?.region_code || ""),
        });
      } catch (err: any) {
        toast.error(err?.message || t("addressBook.addressFetchFailed"));
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAddress();
  }, [addressId, isEditMode]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (value.trim() && name in errors) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const validate = (): boolean => {
    const next = {
      firstname: !formData.firstname.trim() ? t("addressBook.firstNameRequired") : "",
      lastname: !formData.lastname.trim() ? t("addressBook.lastNameRequired") : "",
      telephone: !formData.telephone.trim() ? t("addressBook.phoneRequired") : "",
      street: !formData.street.trim() ? t("addressBook.streetRequired") : "",
      city: !formData.city.trim() ? t("addressBook.cityRequired") : "",
    };
    setErrors(next);
    return Object.values(next).every(v => !v);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await runSave(async () => {
      try {
        if (isEditMode) {
          await api.put(`/kleverapi/addresses/${addressId}`, {
            address: {
              ...addressData,
              firstname: formData.firstname.trim(),
              lastname: formData.lastname.trim(),
              company: formData.company.trim(),
              telephone: formData.telephone.trim(),
              fax: formData.fax.trim(),
              street: [formData.street.trim()],
              city: formData.city.trim(),
              postcode: formData.postcode.trim() || addressData?.postcode || "00000",
              country_id: formData.country_id || "SA",
              region: formData.region.trim() || undefined,
            },
          });
          toast.success(t("addressBook.addressUpdated"));
        } else {
          await api.post("/kleverapi/addresses", {
            address: {
              firstname: formData.firstname.trim(),
              lastname: formData.lastname.trim(),
              company: formData.company.trim(),
              telephone: formData.telephone.trim(),
              fax: formData.fax.trim(),
              street: [formData.street.trim()],
              city: formData.city.trim(),
              postcode: formData.postcode.trim() || "00000",
              country_id: formData.country_id || "SA",
              region: formData.region.trim() || undefined,
              default_shipping: true,
              default_billing: true,
            },
          });
          toast.success(t("addressBook.addressAdded"));
        }

        const redirectUrl =
          searchParams.get("redirect") || lp("/customer/address-book");
        router.push(redirectUrl);
      } catch (err: any) {
        console.error("[Addresses] Save error:", err);
        toast.error(
          err?.message ||
          (isEditMode
            ? t("addressBook.addressUpdateFailed")
            : t("addressBook.addressAddFailed"))
        );
      }
    });
  };

  const field = (
    name: keyof typeof formData,
    labelKey: string,
    required = false,
    placeholder = "",
    type: "text" | "tel" | "select" = "text",
  ) => {
    const error = name in errors ? errors[name as keyof typeof errors] : "";
    const baseInput =
      "w-full h-[38px] px-3 border text-sm text-black bg-white focus:outline-none focus:border-[#3b71a8] rounded-[3px] ltr:text-left rtl:text-right";
    return (
      <div key={name}>
        <label className="block text-xs font-semibold text-black mb-1.5 ltr:text-left rtl:text-right">
          {t(labelKey)}
          {required && (
            <span className="text-red-600 font-bold ltr:ml-0.5 rtl:mr-0.5"> *</span>
          )}
        </label>
        {type === "select" ? (
          <select
            name={name}
            value={formData[name]}
            onChange={handleChange}
            className={`${baseInput} ${error ? "border-red-500" : "border-gray-300"}`}
          >
            <option value="SA">{t("addressBook.saudiArabia")}</option>
          </select>
        ) : (
          <input
            type={type}
            name={name}
            value={formData[name]}
            onChange={handleChange}
            placeholder={placeholder}
            dir={type === "tel" ? "ltr" : undefined}
            className={`${baseInput} ${error ? "border-red-500" : "border-gray-300"}`}
          />
        )}
        {error && (
          <p className="mt-1 text-[11px] text-red-500 ltr:text-left rtl:text-right">
            {error}
          </p>
        )}
      </div>
    );
  };

  const heading =
    title ??
    (isEditMode
      ? t("addressBook.editAddress")
      : t("addressBook.addNewAddress"));

  if (loading) {
    return <AddressSkeleton />;
  }

  return (
    <>
      {/* Page Title */}
      <div className="flex items-center gap-4 mb-5">
        <h1 className="text-h3 md:text-h1-sm font-semibold text-black uppercase tracking-tight">
          {heading}
        </h1>
      </div>
      {/* Narrow form container — matches Magento's ~600px form width */}
      <div className="w-full">
          <form onSubmit={onSubmit} noValidate>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* ── Section 1: CONTACT INFORMATION ── */}
            <div className="bg-white border border-[#ddd] shadow-sm">
            <div className="bg-surfaceHover px-4 py-3 border-b border-[#ddd] text-black font-bold uppercase text-body">
              <h2 className="text-black uppercase tracking-widest ltr:text-left rtl:text-right">
                {t("addressBook.contactInformation")}
              </h2>
            </div>
            <div className="p-3 md:p-4 space-y-4">
              {field("firstname", "addressBook.firstName", true)}
              {field("lastname", "addressBook.lastName", true)}
              {field("company", "addressBook.company")}
              {field("telephone", "addressBook.phoneNumber", true, "966 xxxxxxxxx", "tel")}
              {field("fax", "addressBook.fax")}
            </div>
            </div>
            {/* ── Section 2: ADDRESS ── */}
            <div className="bg-white border border-[#ddd] shadow-sm">
            <div className="bg-surfaceHover px-4 py-3 border-b border-[#ddd] text-black font-bold uppercase text-body">
              <h2 className="text-black uppercase tracking-widest ltr:text-left rtl:text-right">
                {t("addressBook.address")}
              </h2>
            </div>
            <div className="p-3 md:p-4 space-y-4">
              {field("street", "addressBook.streetAddress", true)}
              {field("city", "addressBook.city", true)}
              {field("postcode", "addressBook.zipCode")}
              {field("country_id", "addressBook.country", true, "", "select")}
              {field("region", "addressBook.region")}
              {/* Save Button */}
              <div className="action-button">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#3b71a8] hover:bg-black disabled:opacity-50 text-white text-xs font-bold px-8 py-2.5 uppercase tracking-wider rounded-sm shadow-sm transition-colors min-w-[150px] flex items-center justify-center gap-2"
                >
                  {saving && (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                  )}
                  {t("addressBook.saveAddress")}
                </button>
              </div>
            </div>
            </div>
            </div>
          </form>
      </div>
    </>
  );
}
