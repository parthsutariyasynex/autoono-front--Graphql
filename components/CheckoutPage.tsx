"use client";
import { useTranslation } from "@/hooks/useTranslation";
import { useLocalePath } from "@/hooks/useLocalePath";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import Navbar from "@/app/components/Navbar";
import { useCart } from "@/modules/cart/hooks/useCart";
import { useCheckout, Address } from "@/modules/checkout/hooks/useCheckout";
import {
    Search,
    Plus,
    Edit2,
    ChevronDown,
    Upload,
    Truck,
    Warehouse,
    CreditCard,
    Check,
    MapPin,
    Phone,
    User,
    ShoppingBag,
    ArrowLeft,
    Trash2,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useGift } from "@/modules/cart/context/GiftContext";
import { CheckoutSkeleton, CheckoutSuccessSkeleton } from "@/components/skeletons";
import SelectedAddressCard from "./SelectedAddressCard";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Price from "@/app/components/Price";


// --- Sub-components ---

const SectionHeader = ({ title, step }: { title: string; step?: number }) => (
    <div className="bg-gray-50/80 px-4 md:px-5 lg:px-6 py-3 border-b border-border flex items-center justify-between h-[50px]">
        <div className="flex items-center gap-2.5">
            {step && (
                <span className="w-5 h-5 rounded-full bg-black text-white text-micro font-bold flex items-center justify-center shadow-sm">
                    {step}
                </span>
            )}
            <h3 className="text-caption font-bold text-black uppercase tracking-[0.15em]">
                {title}
            </h3>
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent mx-4 hidden sm:block"></div>
    </div>
);

const CheckoutPageUI: React.FC = () => {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { t, isRtl } = useTranslation();
    const lp = useLocalePath();
    const { availableGifts, openGiftModal, hasGifts } = useGift();

    // Hooks
    const { cart, isLoading: isCartLoading, isCartSyncing, updateCartItem, clearCart } = useCart();
    const {
        addresses,
        shippingMethods,
        paymentMethods,
        totals,
        isLoading: isCheckoutLoading,
        isTotalsLoading,
        error,
        sourcePermission,
        setShippingAddress,
        addAddress,
        placeOrder,
        savePoNumber,
        uploadPoFile,
        getPoUpload,
        deletePoFile,
        setShippingMethod,
        setShippingExtras,
        stores,
        refetchPickupStores,
        fetchPickupTimeSlots,
        saveOrderComment,
        getOrderComment,
    } = useCheckout();

    // --- State ---
    const [selectedAddressId, setSelectedAddressId] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");
    const [poNumber, setPoNumber] = useState("");
    const [comment, setComment] = useState("");
    const [shippingType, setShippingType] = useState<"delivery" | "pickup">("delivery");
    const [selectedWarehouse, setSelectedWarehouse] = useState("");
    const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
    const [selectedShippingMethodCode, setSelectedShippingMethodCode] = useState("");
    const [isAddressSetOnBackend, setIsAddressSetOnBackend] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState("checkmo");
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [isPoUploadOpen, setIsPoUploadOpen] = useState(false);
    const [uploadedPOs, setUploadedPOs] = useState<{ fileName: string; backendRef: string }[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [dragActivePC, setDragActivePC] = useState(false);
    const [isPaymentCommitmentOpen, setIsPaymentCommitmentOpen] = useState(false);
    const [isItemsListOpen, setIsItemsListOpen] = useState(true);
    const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
    const [uploadedPaymentCommitments, setUploadedPaymentCommitments] = useState<{ fileName: string; backendRef: string }[]>([]);
    const [isPaymentCommitmentUploading, setIsPaymentCommitmentUploading] = useState(false);
    const [tempSelectedWarehouse, setTempSelectedWarehouse] = useState<{ id: string; name: string } | null>(null);

    // Pickup Form States
    const [isPickupFormOpen, setIsPickupFormOpen] = useState(false);
    const [pickupName, setPickupName] = useState("");
    const [pickupId, setPickupId] = useState("");
    const [pickupMobile, setPickupMobile] = useState("");
    const [pickupDate, setPickupDate] = useState<Date | null>(null);
    const [pickupTime, setPickupTime] = useState("");
    const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
    const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);
    const [availableDates, setAvailableDates] = useState<Date[]>([]);
    const [availableTimeSlots, setAvailableTimeSlots] = useState<{ time: string; label: string; enabled: boolean }[]>([]);
    const [isLoadingTimeSlots, setIsLoadingTimeSlots] = useState(false);
    const timeRef = useRef<HTMLDivElement>(null);
    const dateRef = useRef<HTMLDivElement>(null);
    const datePickerRef = useRef<any>(null);
    const isCompletingOrderRef = useRef(false);
    // Tracks whether the payment method was explicitly chosen (from localStorage restore
    // or a user click). Prevents background API refreshes from overriding the choice.
    const paymentMethodSetRef = useRef(false);

    // New Address Form State
    const [showNewAddressForm, setShowNewAddressForm] = useState(false);
    const [newAddress, setNewAddress] = useState({
        firstname: "",
        lastname: "",
        street: "",
        city: "",
        country_id: "SA",
        telephone: "",
        postcode: "",
        region_ship_to_party: "",
        store_view: "",
    });
    const [isAddingAddress, setIsAddingAddress] = useState(false);

    // Close dropdowns on click outside
    // Restore selected payment method from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem("checkout_payment_method");
        if (stored) {
            paymentMethodSetRef.current = true;
            setPaymentMethod(stored);
        }
    }, []);

    // Persist payment method to localStorage whenever it changes
    useEffect(() => {
        if (paymentMethod) {
            localStorage.setItem("checkout_payment_method", paymentMethod);
        }
    }, [paymentMethod]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (timeRef.current && !timeRef.current.contains(event.target as Node)) {
                setIsTimeDropdownOpen(false);
            }
            if (dateRef.current && !dateRef.current.contains(event.target as Node)) {
                setIsDateDropdownOpen(false);
            }
        };
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, []);

    // Generate next 45 days — runs once on mount
    useEffect(() => {
        const dates: Date[] = [];
        for (let i = 0; i < 45; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            dates.push(date);
        }
        setAvailableDates(dates);
        setPickupDate(prev => prev ?? dates[0]);
    }, []);
    // Fetch stores if pickup is selected
    useEffect(() => {
        if (shippingType === "pickup" && stores.length === 0) {
            refetchPickupStores();
        }
    }, [shippingType, stores.length, refetchPickupStores]);
    // Fetch dynamic time slots
    useEffect(() => {
        const getSlots = async () => {
            if (shippingType === "pickup" && selectedWarehouseId && pickupDate) {
                setIsLoadingTimeSlots(true);
                try {
                    const year = pickupDate.getFullYear();
                    const month = String(pickupDate.getMonth() + 1).padStart(2, '0');
                    const day = String(pickupDate.getDate()).padStart(2, '0');
                    const formattedDate = `${year}-${month}-${day}`;

                    let slots = await fetchPickupTimeSlots(selectedWarehouseId, formattedDate);

                    // If API returns empty or we want to ensure "this type proper" intervals as per user image
                    if (!slots || slots.length === 0) {
                        const generatedSlots = [];
                        for (let h = 0; h < 24; h++) {
                            for (let m = 0; m < 60; m += 30) {
                                let hh = h % 12;
                                if (hh === 0) hh = 12;
                                const ampm = h < 12 ? 'am' : 'pm';
                                const mm = m === 0 ? '00' : '30';
                                const h24 = String(h).padStart(2, '0');
                                const m24 = String(m).padStart(2, '0');
                                generatedSlots.push({
                                    time: `${h24}:${m24}`,
                                    label: `${hh}:${mm}${ampm}`,
                                    enabled: true
                                });
                            }
                        }
                        slots = generatedSlots;
                    }

                    setAvailableTimeSlots(slots);
                } catch (error) {
                    console.error("Failed to fetch time slots:", error);
                    toast.error(t("checkout.fetchSlotsFailed"));
                } finally {
                    setIsLoadingTimeSlots(false);
                }
            }
        };
        getSlots();
    }, [shippingType, selectedWarehouseId, pickupDate, fetchPickupTimeSlots]);

    // Reset selected time ONLY if we have new slots and the selection is invalid
    useEffect(() => {
        if (availableTimeSlots.length > 0 && pickupTime) {
            const currentSlot = availableTimeSlots.find((s) => s.time === pickupTime);
            if (!currentSlot || !currentSlot.enabled) {
                setPickupTime("");
            }
        }
    }, [availableTimeSlots, pickupTime]);

    // File inputs refs
    const poUploadRef = useRef<HTMLInputElement>(null);
    const paymentCommitmentRef = useRef<HTMLInputElement>(null);

    // Auth Guard
    useEffect(() => {
        if (status === "unauthenticated") {
            router.push(lp("/login?callback=/checkout"));
        }
    }, [status, router]);

    // Redirect if cart is empty (skip during order completion — clearCart sets items:[] before navigation)
    useEffect(() => {
        if (isCompletingOrderRef.current) return;
        if (!isCartLoading && cart && cart.items.length === 0) {
            toast.error(t("checkout.yourOrderIsEmpty"));
            router.push(lp("/cart"));
        }
    }, [cart, isCartLoading, router]);


    // Pre-fill form from totals if available
    useEffect(() => {
        if (totals?.shipping_address) {
            const addr = totals.shipping_address;
            const regionAttr = addr.custom_attributes?.find((ca: any) => ca.attribute_code === 'region_ship_to_party')?.value || "";
            const storeAttr = addr.custom_attributes?.find((ca: any) => ca.attribute_code === 'store_view')?.value || "";

            setNewAddress(prev => ({
                ...prev,
                firstname: addr.firstname || prev.firstname,
                lastname: addr.lastname || prev.lastname,
                street: Array.isArray(addr.street) ? addr.street[0] : (addr.street || prev.street),
                city: addr.city || prev.city,
                telephone: addr.telephone || prev.telephone,
                postcode: addr.postcode || prev.postcode,
                country_id: addr.country_id || prev.country_id,
                region_ship_to_party: regionAttr || prev.region_ship_to_party,
                store_view: storeAttr || prev.store_view,
            }));
        }
    }, [totals]);

    // Defaults
    useEffect(() => {
        if (addresses.length > 0 && !selectedAddressId) {
            const defaultAddr = addresses.find((a) => a.isDefault) || addresses[0];
            setSelectedAddressId(defaultAddr.id);
            setShippingAddress(defaultAddr.id)
                .then(() => setIsAddressSetOnBackend(true))
                .catch(() => { });
        }
    }, [addresses, selectedAddressId, setShippingAddress]);

    // ── No-address guard: single source of truth for all checkout entry points ──
    // If the customer has no saved shipping address, send them to the address book
    // (which returns here via ?redirect=/checkout after they add one). Gated on a
    // ref so it only fires AFTER the address fetch has actually run: isCheckoutLoading
    // starts false, so an unguarded check would redirect on the very first render —
    // before addresses are ever fetched — and bounce customers who DO have addresses.
    const addressFetchRanRef = useRef(false);
    useEffect(() => {
        if (isCheckoutLoading) {
            addressFetchRanRef.current = true;
            return;
        }
        if (!addressFetchRanRef.current) return; // fetch hasn't completed a cycle yet
        if (addresses.length === 0) {
            router.replace(`${lp("/customer/address-book")}?redirect=/checkout`);
        }
    }, [isCheckoutLoading, addresses, router, lp]);

    // Auto-select a payment method when the list loads.
    // Auto-select a default payment method when the list first loads.
    // Never override when the user (or localStorage restore) has already made a choice —
    // background refreshes from setShippingAddress / fetchPaymentMethods can return
    // partial lists that temporarily exclude a valid method like banktransfer.
    useEffect(() => {
        if (paymentMethods.length > 0) {
            const isValid = paymentMethods.some(m => m.code === paymentMethod);
            if (!isValid && !paymentMethodSetRef.current) {
                const credit = paymentMethods.find(m => m.code === 'creditaccount' || m.code === 'credit_account');
                setPaymentMethod(credit ? credit.code : paymentMethods[0].code);
            }
        }
    }, [paymentMethods, paymentMethod]);

    const handlePaymentCommitmentUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
        let files: File[] = [];
        if ("files" in e.target && e.target.files) {
            files = Array.from(e.target.files);
        } else if ("dataTransfer" in e && e.dataTransfer.files) {
            files = Array.from(e.dataTransfer.files);
        }
        if (files.length === 0) return;
        const validFiles = files.filter(validateFile);
        if (validFiles.length === 0) return;

        setIsPaymentCommitmentUploading(true);
        const justUploadedFileNames = new Set<string>();
        try {
            for (const file of validFiles) {
                if (uploadedPaymentCommitments.some(p => p.fileName === file.name)) {
                    toast.error(t("checkout.fileAlreadyUploaded").replace("{0}", file.name));
                    continue;
                }
                const base64Content = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve((reader.result as string).split(",")[1]);
                    reader.onerror = reject;
                });
                const result = await (uploadPoFile as any)({ fileContent: base64Content, fileName: file.name });
                if (result && result.success === false) {
                    throw new Error(result.message || t("checkout.uploadFailed"));
                }
                const backendRef: string = result?.backendRef || file.name;
                justUploadedFileNames.add(file.name);
                // Persist the type-marker so this file is restored to the Bank Transfer
                // section (not the PO section) after a page refresh.
                // Store both file.name and backendRef — Magento may sanitize/rename the
                // file so having multiple aliases ensures the match succeeds on reload.
                try {
                    const raw = localStorage.getItem('checkout_pc_file_names');
                    const pcNames: string[] = raw ? JSON.parse(raw) : [];
                    let lsChanged = false;
                    for (const marker of [file.name, backendRef]) {
                        if (marker && !pcNames.includes(marker)) {
                            pcNames.push(marker);
                            lsChanged = true;
                        }
                    }
                    if (lsChanged) localStorage.setItem('checkout_pc_file_names', JSON.stringify(pcNames));
                } catch { /* ignore */ }
                setUploadedPaymentCommitments(prev => [...prev, { fileName: file.name, backendRef }]);
                toast.success(t("checkout.uploaded").replace("{0}", file.name));
            }

            // Refresh from Magento to normalize backendRef for just-uploaded files
            if (justUploadedFileNames.size > 0) {
                try {
                    const freshData = await getPoUpload();
                    let filesArray: any[] = [];
                    if (Array.isArray(freshData)) filesArray = freshData;
                    else if (freshData?.files && Array.isArray(freshData.files)) filesArray = freshData.files;
                    else if (freshData?.data && Array.isArray(freshData.data)) filesArray = freshData.data;
                    else if (freshData && (freshData.fileName || freshData.filename || freshData.file)) filesArray = [freshData];
                    if (filesArray.length > 0) {
                        const normalized: { fileName: string; backendRef: string }[] = filesArray.map((item: any) => {
                            if (typeof item === "string") return { fileName: item, backendRef: item };
                            const fn = item.fileName || item.filename || item.file_name || item.name || t("checkout.unknownFile");
                            const br = item.file || item.path || item.stored_name || item.file_path ||
                                item.file_name || item.filename || item.fileName || item.name || fn;
                            return { fileName: fn, backendRef: br };
                        });
                        // Sync localStorage with Magento's canonical identifiers so that
                        // page-refresh matching is reliable even if Magento prefixes a path
                        // (e.g. returns "/media/klever/po_files/receipt.pdf" for "receipt.pdf").
                        // Use basename matching so a path-prefixed name still links to the
                        // original plain filename that was written to localStorage at upload time.
                        const pcBn = (s: string) => (s.split('/').pop() ?? s).split('?')[0];
                        try {
                            const raw = localStorage.getItem('checkout_pc_file_names');
                            const pcNames: string[] = raw ? JSON.parse(raw) : [];
                            let lsChanged = false;
                            for (const originalName of justUploadedFileNames) {
                                const origBn = pcBn(originalName);
                                const magentoEntry = normalized.find(
                                    n => n.fileName === originalName || n.backendRef === originalName
                                        || pcBn(n.fileName) === origBn || pcBn(n.backendRef) === origBn
                                );
                                if (magentoEntry) {
                                    // Store all aliases: the path, the basename, and the backendRef
                                    for (const alias of [
                                        magentoEntry.fileName,
                                        magentoEntry.backendRef,
                                        pcBn(magentoEntry.fileName),
                                        pcBn(magentoEntry.backendRef),
                                    ]) {
                                        if (alias && !pcNames.includes(alias)) {
                                            pcNames.push(alias);
                                            lsChanged = true;
                                        }
                                    }
                                }
                            }
                            if (lsChanged) localStorage.setItem('checkout_pc_file_names', JSON.stringify(pcNames));
                        } catch { /* ignore */ }
                        setUploadedPaymentCommitments(prev => {
                            // Update backendRef for just-uploaded files using Magento data; keep other files as-is.
                            // Use basename matching in case Magento returned a path-prefixed name.
                            const updated = prev.map(p => {
                                if (justUploadedFileNames.has(p.fileName)) {
                                    const pBn = pcBn(p.fileName);
                                    const magentoEntry = normalized.find(
                                        n => n.fileName === p.fileName || n.backendRef === p.backendRef
                                            || pcBn(n.fileName) === pBn || pcBn(n.backendRef) === pBn
                                    );
                                    // Keep the user-visible fileName unchanged; only update backendRef
                                    // to Magento's canonical path (used for the delete call).
                                    if (magentoEntry) return { fileName: p.fileName, backendRef: magentoEntry.backendRef };
                                }
                                return p;
                            });
                            // Deduplicate by backendRef
                            const seen = new Set<string>();
                            return updated.filter(f => {
                                if (seen.has(f.backendRef)) return false;
                                seen.add(f.backendRef);
                                return true;
                            });
                        });
                    }
                } catch {
                    console.warn("[handlePaymentCommitmentUpload] failed to refresh payment commitment file list");
                }
            }
        } catch (error: any) {
            toast.error(error.message || t("checkout.uploadFailed"));
        } finally {
            setIsPaymentCommitmentUploading(false);
            if (paymentCommitmentRef.current) paymentCommitmentRef.current.value = "";
        }
    };

    const removePaymentCommitment = async (backendRef: string) => {
        // Capture the display fileName before any async work so the localStorage
        // marker can be cleaned up regardless of when the finally block runs.
        const entryToRemove = uploadedPaymentCommitments.find(f => f.backendRef === backendRef);
        setIsPaymentCommitmentUploading(true);
        try {
            await deletePoFile(backendRef);
        } catch (err: any) {
            // Log the Magento error but do not block the UI removal —
            // the file may already be gone or the identifier may be mismatched.
            console.warn("[removePaymentCommitment] Magento delete error:", err?.message);
        } finally {
            if (entryToRemove) {
                try {
                    const raw = localStorage.getItem('checkout_pc_file_names');
                    const pcNames: string[] = raw ? JSON.parse(raw) : [];
                    // Remove all aliases (fileName and backendRef) stored for this file
                    const updated = pcNames.filter(
                        n => n !== entryToRemove.fileName && n !== entryToRemove.backendRef
                    );
                    localStorage.setItem('checkout_pc_file_names', JSON.stringify(updated));
                } catch { /* ignore */ }
            }
            setUploadedPaymentCommitments(prev => prev.filter(f => f.backendRef !== backendRef));
            setIsPaymentCommitmentUploading(false);
            toast.success(t("checkout.fileRemoveSuccess"));
        }
    };

    // Auto-select shipping method when they become available or when type changes
    useEffect(() => {
        if (shippingMethods.length > 0) {
            const method = shippingMethods.find(m =>
                shippingType === "pickup" ? m.code.includes("pickup") : !m.code.includes("pickup")
            );

            // Validate current selection
            const currentSelectedMethod = shippingMethods.find(m => m.code === selectedShippingMethodCode);
            const isCorrectType = currentSelectedMethod ?
                (shippingType === "pickup" ? currentSelectedMethod.code.includes("pickup") : !currentSelectedMethod.code.includes("pickup")) :
                false;

            if (method && (!selectedShippingMethodCode || !isCorrectType)) {
                // Do not auto-set shipping while cart sync is in progress — Magento
                // rejects "set shipping method" on an empty quote (mid-warehouse-switch).
                if (isAddressSetOnBackend && !isTotalsLoading && !isCartSyncing && cart && cart.items.length > 0) {
                    console.log("DEBUG: Auto-selecting shipping method:", method.code, "for type:", shippingType);
                    setSelectedShippingMethodCode(method.code);

                    setShippingMethod(method.carrierCode, method.methodCode).catch(err => {
                        console.error("Auto-sync shipping method failed:", err);
                    });
                }
            }
        }
    }, [shippingMethods, shippingType, selectedShippingMethodCode, setShippingMethod, isAddressSetOnBackend, isTotalsLoading, isCartSyncing, cart]);


    // Fetch existing PO Upload
    useEffect(() => {
        const fetchPoUpload = async () => {
            try {
                const data = await getPoUpload();
                console.log("DEBUG: PO Upload Data:", data);

                // Handle common response formats
                let filesArray: any[] = [];
                if (Array.isArray(data)) {
                    filesArray = data;
                } else if (data && Array.isArray(data.files)) {
                    filesArray = data.files;
                } else if (data && Array.isArray(data.data)) {
                    filesArray = data.data;
                } else if (data && (data.fileName || data.filename || data.file)) {
                    filesArray = [data];
                }

                const normalized: { fileName: string; backendRef: string }[] = filesArray.map((item: any) => {
                    if (typeof item === 'string') return { fileName: item, backendRef: item };
                    const fileName = item.fileName || item.filename || item.file_name || item.name || t("checkout.unknownFile");
                    const backendRef =
                        item.file || item.path || item.stored_name || item.file_path ||
                        item.file_name || item.filename || item.fileName || item.name || fileName;
                    return { fileName, backendRef };
                });

                // Both PO and Payment Commitment files are stored in the same Magento
                // field (kleverCheckoutPoFiles). We use a localStorage type-marker written
                // at upload time to route each file to its correct section on refresh.
                // Files whose name is in checkout_pc_file_names → Bank Transfer section.
                // Everything else (including legacy files) → PO Number section.
                let storedPcNames: Set<string> = new Set();
                try {
                    const raw = localStorage.getItem('checkout_pc_file_names');
                    storedPcNames = raw ? new Set(JSON.parse(raw) as string[]) : new Set();
                } catch { /* ignore */ }

                // Helper: extract the plain filename from a path like
                // "/media/klever/po_files/receipt.pdf" → "receipt.pdf".
                // This lets the split work even when Magento returns full paths but
                // localStorage only stored the original plain filename at upload time.
                const bn = (s: string) => (s.split('/').pop() ?? s).split('?')[0];

                const poFiles: { fileName: string; backendRef: string }[] = [];
                const pcFiles: { fileName: string; backendRef: string }[] = [];
                for (const file of normalized) {
                    if (
                        storedPcNames.has(file.fileName) ||
                        storedPcNames.has(file.backendRef) ||
                        storedPcNames.has(bn(file.fileName)) ||
                        storedPcNames.has(bn(file.backendRef))
                    ) {
                        pcFiles.push(file);
                    } else {
                        poFiles.push(file);
                    }
                }

                setUploadedPOs(poFiles);
                setUploadedPaymentCommitments(pcFiles);

                // Prune stale localStorage entries (e.g. files removed externally from Magento).
                // Include basenames alongside full paths so aliases written as plain filenames
                // are not incorrectly pruned when Magento returns path-prefixed identifiers.
                const liveIdentifiers = new Set([
                    ...normalized.map(f => f.fileName),
                    ...normalized.map(f => f.backendRef),
                    ...normalized.map(f => bn(f.fileName)),
                    ...normalized.map(f => bn(f.backendRef)),
                ]);
                const cleanPcNames = new Set([...storedPcNames].filter(n => liveIdentifiers.has(n)));
                if (cleanPcNames.size !== storedPcNames.size) {
                    try {
                        localStorage.setItem('checkout_pc_file_names', JSON.stringify([...cleanPcNames]));
                    } catch { /* ignore */ }
                }
            } catch (err) {
                console.error("Failed to fetch PO upload:", err);
            }
        };

        if (status === "authenticated") {
            fetchPoUpload();
        }
    }, [status, getPoUpload]);

    // Fetch existing Order Comment
    useEffect(() => {
        const fetchOrderComment = async () => {
            try {
                const data = await getOrderComment();
                if (data) setComment(data);
            } catch (err) {
                console.error("Failed to fetch order comment:", err);
            }
        };

        if (status === "authenticated") {
            fetchOrderComment();
        }
    }, [status, getOrderComment]);

    // Memoized filtered addresses
    const filteredAddresses = useMemo(() => {
        return addresses.filter(addr =>
            `${addr.firstname} ${addr.lastname} ${addr.street} ${addr.city}`
                .toLowerCase()
                .includes(searchQuery.toLowerCase())
        );
    }, [addresses, searchQuery]);

    // Handlers
    const handleAddressSelect = async (id: string) => {
        setSelectedAddressId(id);
        try {
            await setShippingAddress(id);
            setIsAddressSetOnBackend(true);
        } catch (err) {
            setIsAddressSetOnBackend(false);
            const msg = err instanceof Error ? err.message : t("checkout.updateAddressFailed");
            console.error("handleAddressSelect failed:", msg);
            if (msg === "Not authenticated") {
                router.push(lp("/login?callback=/checkout"));
                return;
            }
            toast.error(msg);
        }
    };

    const handlePlaceOrder = async () => {
        // 0. Cart sync guard — don't proceed while warehouse switch is in progress
        if (isCartSyncing) {
            toast.error(t("checkout.cartSyncingPleaseWait") || "Your cart is syncing. Please wait a moment and try again.");
            return;
        }

        // 0. Cart Validation — empty cart or no valid quote ID
        if (!cart || cart.items.length === 0 || !cart.cart_id) {
            toast.error(t("checkout.emptyCartMessage") || "Your cart is empty. Please add items before checkout.");
            router.push(lp("/cart"));
            return;
        }

        // 0b. Shipping address required — bounce to the address book if none exists.
        // Defensive: the page-load guard already redirects address-less customers,
        // but this prevents placing an order with no address in any edge case.
        if (addresses.length === 0) {
            toast.error(t("checkout.addShippingAddressFirst"));
            router.push(`${lp("/customer/address-book")}?redirect=/checkout`);
            return;
        }

        // 1. Validations with Auto-Repair
        if (!selectedAddressId || !isAddressSetOnBackend) {
            const idToSet = selectedAddressId || (addresses.length > 0 ? (addresses.find(a => a.isDefault)?.id || addresses[0].id) : "");

            if (idToSet) {
                try {
                    console.log("Syncing address to backend before order placement:", idToSet);
                    await setShippingAddress(idToSet);
                    setSelectedAddressId(idToSet);
                    setIsAddressSetOnBackend(true);
                    toast.success(t("checkout.saveBillingInfo"));
                } catch (err) {
                    const msg = err instanceof Error ? err.message : t("checkout.syncAddressFailed");
                    if (msg === "Not authenticated") {
                        router.push(lp("/login?callback=/checkout"));
                        return;
                    }
                    // Server-side error (e.g. API permission issue) — log and continue;
                    // placeOrder will surface the real error if the order also fails.
                    console.warn("Address sync failed, continuing to place order:", msg);
                    setSelectedAddressId(idToSet);
                }
            } else {
                toast.error(t("checkout.selectShippingAddress"));
                document.getElementById('step-1')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
        }

        // 2. Ensure Shipping Method is selected and SYNCED
        if (!selectedShippingMethodCode) {
            if (shippingMethods.length > 0) {
                const method = shippingMethods.find(m =>
                    shippingType === "pickup" ? m.code.includes("pickup") : !m.code.includes("pickup")
                ) || shippingMethods[0];
                setSelectedShippingMethodCode(method.code);
                try {
                    await setShippingMethod(method.carrierCode, method.methodCode);
                } catch (err: any) {
                    const msg = err?.message || t("checkout.shippingMethodUpdateFailed");
                    console.error("Auto-repair shipping method failed:", msg);
                    toast.error(msg);
                    document.getElementById('step-3')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return;
                }
                toast.success(t("checkout.selectedShipping").replace("{0}", method.title));
            } else {
                toast.error(t("checkout.selectShippingMethod"));
                document.getElementById('step-3')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
        } else {
            // Re-sync to backend before placing order.
            const method = shippingMethods.find(m => m.code === selectedShippingMethodCode);
            if (method) {
                try {
                    console.log("[handlePlaceOrder] syncing shipping method:", method.code);
                    await setShippingMethod(method.carrierCode, method.methodCode);
                } catch (err: any) {
                    const msg = err?.message || t("checkout.shippingMethodUpdateFailed");
                    console.error("[handlePlaceOrder] shipping method sync failed:", msg);
                    toast.error(msg);
                    document.getElementById('step-3')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return;
                }
            }
        }

        if (shippingType === "pickup") {
            if (!selectedWarehouseId) {
                toast.error(t("checkout.selectWarehouse"));
                document.getElementById('step-pickup')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            if (!pickupName || !pickupId || !pickupMobile || !pickupDate || !pickupTime) {
                toast.error(t("checkout.fillPickupDetails"));
                setIsPickupFormOpen(true);
                return;
            }
        }

        if (uploadedPOs.length > 0 && !poNumber) {
            toast.error(t("checkout.poNumberRequired"));
            const element = document.getElementById('step-2');
            element?.scrollIntoView({ behavior: 'smooth' });
            return;
        }

        setIsPlacingOrder(true);
        try {
            // 2. Call Shipping Extras if Pickup
            if (shippingType === "pickup") {
                const year = pickupDate!.getFullYear();
                const month = String(pickupDate!.getMonth() + 1).padStart(2, '0');
                const day = String(pickupDate!.getDate()).padStart(2, '0');
                const formattedDate = `${year}-${month}-${day}`;

                await setShippingExtras({
                    pickupPersonName: pickupName,
                    pickupPersonId: pickupId,
                    pickupMobileNumber: pickupMobile,
                    pickupDate: formattedDate,
                    pickupTime: pickupTime,
                    pickupStore: selectedWarehouseId
                });
            }


            // 4. Call Place Order
            const result = await placeOrder({
                address_id: Number(selectedAddressId),
                shipping_method: selectedShippingMethodCode,
                payment_method: paymentMethod,
                cart_id: cart?.cart_id,
                po_number: poNumber,
                comment: comment
            });

            // 4. Handle Success
            toast.success(t("common.success"));

            // Normalize: API may return a plain value or an object with various field names
            const orderId = typeof result === 'object' && result !== null
                ? (result.order_id ?? result.entity_id ?? result.increment_id ?? result)
                : result;
            const orderIncrementId = typeof result === 'object' && result !== null
                ? (result.order_increment_id ?? result.increment_id ?? String(orderId))
                : String(result);

            const orderSummary = {
                order_id: orderId,
                order_increment_id: orderIncrementId,
                grand_total: result?.grand_total,
                currency_code: result?.currency_code,
                status: result?.status
            };

            localStorage.setItem('last_order_summary', JSON.stringify(orderSummary));
            // Order placed — clear upload type-markers so the next checkout starts clean.
            try { localStorage.removeItem('checkout_pc_file_names'); } catch { /* ignore */ }

            // Set flag so the empty-cart guard does not redirect to /cart while we navigate to success
            isCompletingOrderRef.current = true;

            // Clear cart after successful order
            try { await clearCart(); } catch { /* cart will refresh on next visit */ }

            router.push(lp(`/checkout/success?order_id=${orderId}`));
        } catch (error: any) {
            console.error("Place Order Error:", error);
            toast.error(error.message || t("checkout.placeOrderFailed"));
        } finally {
            setIsPlacingOrder(false);
        }
    };

    const handlePoNumberBlur = async () => {
        if (!poNumber) return;
        try {
            await savePoNumber(poNumber);
            toast.success(t("checkout.poNumberSaved"));
        } catch (error: any) {
            toast.error(error.message || t("checkout.poSaveFailed"));
        }
    };

    const handleCommentBlur = async () => {
        if (!comment) return;
        try {
            await saveOrderComment(comment);
            toast.success(t("checkout.commentSaved"));
        } catch (error: any) {
            toast.error(error.message || t("checkout.commentSaveFailed"));
        }
    };


    const ALLOWED_TYPES = [
        "image/jpeg", "image/png", "application/zip", "application/x-rar-compressed",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword", "application/pdf", "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/csv", "application/vnd.ms-outlook"
    ];

    const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".zip", ".rar", ".docx", ".doc", ".pdf", ".xls", ".xlsx", ".csv", ".msg"];

    const validateFile = (file: File) => {
        const extension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(extension)) {
            toast.error(t("checkout.invalidFileType").replace("{0}", file.name).replace("{1}", ALLOWED_EXTENSIONS.join(", ")));
            return false;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error(t("checkout.fileTooLarge").replace("{0}", file.name));
            return false;
        }
        return true;
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
        let files: File[] = [];
        if ("files" in e.target && e.target.files) {
            files = Array.from(e.target.files);
        } else if ("dataTransfer" in e && e.dataTransfer.files) {
            files = Array.from(e.dataTransfer.files);
        }

        if (files.length === 0) return;

        const validFiles = files.filter(validateFile);
        if (validFiles.length === 0) return;

        setIsUploading(true);
        // Track only the files uploaded in this batch so the Magento refresh
        // never replaces uploadedPOs with the full Magento list — payment
        // commitment files live in the same kleverCheckoutPoFiles field and
        // must never bleed into the PO section.
        const justUploadedPoFileNames = new Set<string>();
        try {
            for (const file of validFiles) {
                // Check for duplicates in UI
                if (uploadedPOs.some(p => p.fileName === file.name)) {
                    toast.error(t("checkout.fileAlreadyUploaded").replace("{0}", file.name));
                    continue;
                }

                const base64Content = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => {
                        const result = reader.result as string;
                        resolve(result.split(",")[1]);
                    };
                    reader.onerror = error => reject(error);
                });

                const result = await (uploadPoFile as any)({
                    fileContent: base64Content,
                    fileName: file.name
                });

                if (result && result.success === false) {
                    throw new Error(result.message || t("checkout.uploadFailed"));
                }

                const backendRef: string = result?.backendRef || file.name;
                console.log("[handleFileUpload] optimistic backendRef:", backendRef, "for file:", file.name);

                justUploadedPoFileNames.add(file.name);
                setUploadedPOs(prev => [...prev, { fileName: file.name, backendRef }]);
                toast.success(t("checkout.uploaded").replace("{0}", file.name));
            }

            // Refresh from Magento to normalise backendRef for ONLY the files just
            // uploaded in this batch. Never replace the whole uploadedPOs list with
            // the full Magento response — that list includes payment commitment files
            // (same storage field) which must stay isolated in uploadedPaymentCommitments.
            if (justUploadedPoFileNames.size > 0) {
                try {
                    const freshData = await getPoUpload();
                    let filesArray: any[] = [];
                    if (Array.isArray(freshData)) filesArray = freshData;
                    else if (freshData?.files && Array.isArray(freshData.files)) filesArray = freshData.files;
                    else if (freshData?.data && Array.isArray(freshData.data)) filesArray = freshData.data;
                    else if (freshData && (freshData.fileName || freshData.filename || freshData.file)) filesArray = [freshData];
                    if (filesArray.length > 0) {
                        const normalized: { fileName: string; backendRef: string }[] = filesArray.map((item: any) => {
                            if (typeof item === 'string') return { fileName: item, backendRef: item };
                            const fn = item.fileName || item.filename || item.file_name || item.name || t("checkout.unknownFile");
                            const br = item.file || item.path || item.stored_name || item.file_path ||
                                item.file_name || item.filename || item.fileName || item.name || fn;
                            return { fileName: fn, backendRef: br };
                        });
                        console.log("[handleFileUpload] Magento refresh (all files):", normalized);
                        setUploadedPOs(prev => {
                            // Update backendRef only for files uploaded in this batch;
                            // leave all other PO entries untouched and ignore any
                            // payment commitment entries present in the Magento response.
                            const updated = prev.map(p => {
                                if (justUploadedPoFileNames.has(p.fileName)) {
                                    const magentoEntry = normalized.find(
                                        n => n.fileName === p.fileName || n.backendRef === p.backendRef
                                    );
                                    if (magentoEntry) return magentoEntry;
                                }
                                return p;
                            });
                            const seen = new Set<string>();
                            return updated.filter(f => {
                                if (seen.has(f.backendRef)) return false;
                                seen.add(f.backendRef);
                                return true;
                            });
                        });
                    }
                } catch {
                    console.warn("[handleFileUpload] failed to refresh PO file list after upload");
                }
            }
        } catch (error: any) {
            toast.error(error.message || t("checkout.uploadFailed"));
        } finally {
            setIsUploading(false);
            if (poUploadRef.current) poUploadRef.current.value = "";
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        handleFileUpload(e);
    };

    const handleDeletePo = async (fileName: string, backendRef: string) => {
        if (!cart?.cart_id) {
            toast.error(t("checkout.emptyCartMessage") || "Your cart is empty. Please add items before checkout.");
            router.push(lp("/cart"));
            return;
        }
        try {
            setIsUploading(true);
            // Use the backend reference (may differ from display name after page refresh)
            await deletePoFile(backendRef);
            setUploadedPOs(prev => prev.filter(p => p.fileName !== fileName));
            toast.success(t("checkout.fileRemoveSuccess"));
        } catch (error: any) {
            toast.error(error.message || t("checkout.removeFileFailed"));
        } finally {
            setIsUploading(false);
        }
    };

    const handleShippingMethodSelect = async (code: string) => {
        const method = shippingMethods.find(m => m.code === code);
        if (!method) return;

        setSelectedShippingMethodCode(code);
        try {
            await setShippingMethod(method.carrierCode, method.methodCode);
        } catch (error: any) {
            toast.error(error.message || t("checkout.shippingMethodUpdateFailed"));
        }
    };

    const handleAddNewAddress = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAddingAddress(true);
        try {
            const addressData: any = {
                firstname: newAddress.firstname,
                lastname: newAddress.lastname,
                street: [newAddress.street],
                city: newAddress.city,
                country_id: newAddress.country_id,
                telephone: newAddress.telephone,
                postcode: newAddress.postcode,
                custom_attributes: [
                    { attribute_code: 'region_ship_to_party', value: newAddress.region_ship_to_party },
                    { attribute_code: 'store_view', value: newAddress.store_view }
                ].filter(attr => attr.value)
            };

            const result = await addAddress(addressData);
            toast.success(t("addressBook.addressAdded"));
            setShowNewAddressForm(false);
            setNewAddress({
                firstname: "",
                lastname: "",
                street: "",
                city: "",
                country_id: "SA",
                telephone: "",
                postcode: "",
                region_ship_to_party: "",
                store_view: "",
            });
            // Automatically select the new address
            if (result && result.id) {
                handleAddressSelect(result.id.toString());
            }
        } catch (error: any) {
            toast.error(error.message || t("addressBook.addAddressFailed"));
        } finally {
            setIsAddingAddress(false);
        }
    };
    // Include `cart === null` so the initial mount (before the cart fetch
    // resolves) keeps showing the skeleton instead of flashing the "empty
    // cart" UI for one frame.
    //
    // While the place-order flow is mid-transition (cart cleared, navigating
    // to /checkout/success), swap to the success-page skeleton so the user
    // sees the destination's skeleton rather than the cart-checkout one.
    if (isCartLoading || status === "loading" || cart === null) {
        if (isCompletingOrderRef.current) return <CheckoutSuccessSkeleton />;
        return <CheckoutSkeleton />;
    }

    if (cart.items.length === 0) {
        // During the place-order flow we call clearCart() before router.push to
        // /checkout/success, so cart.items briefly becomes empty. Without this
        // guard, the user sees "YOUR CART IS EMPTY" for a frame before the
        // navigation completes. Show the destination's skeleton instead.
        if (isCompletingOrderRef.current) {
            return <CheckoutSuccessSkeleton />;
        }
        return (
            <div className="min-h-screen bg-white">
                <div className="w-full py-24 px-6 text-center">
                    <ShoppingBag size={64} className="mx-auto text-black/30 mb-6" />
                    <h1 className="text-2xl font-bold text-black uppercase tracking-widest mb-4">{t("cart.empty")}</h1>
                    {/* <p className="text-black/60 mb-8 max-w-md mx-auto">{t("common.loading")}</p> */}
                    <Link href={lp("/products")} className="inline-flex items-center gap-2 bg-primary font-bold px-8 py-4 text-body-sm uppercase tracking-widest hover:bg-black hover:text-white transition-all">
                        {t("m.products")}
                    </Link>
                </div>
            </div>
        );
    }

    // Use kleverCheckoutTotals when the API returns meaningful non-zero values.
    // The ?? operator does NOT catch 0 — if Magento returns subtotal/grand_total as 0
    // (common for some store configurations before a shipping address is fully committed),
    // we must fall back to cart values so the Order Summary never shows 0.00 when
    // the cart has products.
    const totalsHaveData = totals != null && (
        Number(totals.grand_total) > 0 || Number(totals.subtotal) > 0
    );

    // Item-sum fallback: recalculate subtotal from cart items when both the totals
    // API and cart.subtotal come back as 0 (e.g. Magento pricing module issue for a
    // specific warehouse on initial load).
    const itemsFallbackSubtotal = cart.items.reduce(
        (sum, i) => sum + i.row_total, 0
    );
    const cartSubtotal = cart.subtotal > 0 ? cart.subtotal : itemsFallbackSubtotal;
    const cartGrandTotal = cart.grand_total > 0
        ? cart.grand_total
        : cartSubtotal + (cart.tax_amount ?? 0);

    const dtSubtotal = totalsHaveData ? totals!.subtotal : cartSubtotal;
    const dtTax = totalsHaveData ? totals!.tax_amount : (cart.tax_amount ?? 0);
    const dtShipping = totalsHaveData ? (totals!.shipping_amount ?? 0) : (cart.shipping_amount ?? 0);
    const dtDiscount = totalsHaveData ? (totals!.discount_amount ?? 0) : (cart.discount_amount ?? 0);
    // grand_total from totals can be 0 even when subtotal is valid (e.g. pre-shipping-selection).
    // Compute from the other display fields in that case so it's never shown as 0.
    const dtGrandFromApi = totalsHaveData ? totals!.grand_total : null;
    const dtGrand = (dtGrandFromApi != null && dtGrandFromApi > 0)
        ? dtGrandFromApi
        : dtSubtotal > 0
        ? dtSubtotal + dtTax + dtShipping - dtDiscount
        : cartGrandTotal;

    const displayTotals = {
        subtotal: dtSubtotal,
        tax_amount: dtTax,
        shipping_amount: dtShipping,
        grand_total: dtGrand,
        discount_amount: dtDiscount,
    };

    return (
        <div className="min-h-screen flex flex-col w-full bg-surfacePage text-xs italic-none">
            <main className="flex-1 w-full px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-10 pt-2 md:pt-4">
                {/* Header Section */}
                <div className="flex flex-col items-center justify-center text-center gap-4 mb-12 relative">
                    {/* Back link — left-aligned overlay at md+ (tablet portrait and up),
                        inline-centered on mobile/phones to stack above the title. */}
                    <Link href={lp("/cart")} className="md:absolute left-0 top-1/2 md:-translate-y-1/2 flex items-center gap-2 text-black hover:text-primary transition-all text-caption font-bold uppercase tracking-[0.2em] group mb-4 md:mb-0">
                        <div className="w-8 h-8 rounded-full border border-black flex items-center justify-center group-hover:border-primary transition-all">
                            <ArrowLeft size={14} strokeWidth={3} className="group-hover:-translate-x-1 transition-transform" />
                        </div>
                        <span className="hidden sm:inline">{t("m.back-to-shopping-cart")}</span>
                    </Link>

                    <div className="flex flex-col items-center gap-4">
                        <h1 className="text-h3 sm:text-h2 md:text-[26px] font-bold text-black uppercase tracking-tight">{t("checkout.title")}</h1>
                        <div className="h-[2px] w-full max-w-[400px] bg-gradient-to-r from-transparent via-primary to-transparent"></div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 lg:gap-8 items-start">

                    {/* ═══════════ Left Column ═══════════ */}
                    <div className="lg:col-span-8 space-y-6">

                        <div className="bg-white border border-border shadow-sm rounded-xl overflow-hidden transition-all duration-300 hover:shadow-md">
                            <SectionHeader title={t("checkout.shippingAddress")} step={1} />
                            <div className="p-4 md:p-5 lg:p-6">
                                {/* Search */}
                                {/* <div className="mb-6 flex gap-3">
                                    <input
                                        type="text"
                                        placeholder={t("m.search")}
                                        className="flex-1 px-4 py-2.5 bg-gray-50/50 border border-border rounded-xl outline-none text-body-sm font-medium transition-all placeholder:text-black/50 focus:bg-white focus:border-primary shadow-sm focus:ring-4 focus:ring-primary/10"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewAddressForm(!showNewAddressForm)}
                                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold uppercase tracking-widest transition-all active:scale-95 shadow-sm border ${showNewAddressForm ? "bg-primary text-black border-primary" : "bg-white text-black border-border hover:bg-gray-50"}`}
                                    >
                                        <Plus size={18} />
                                        <span className="hidden sm:inline">{t("m.add-new")}</span>
                                    </button>
                                </div> */}

                                {/* Address List Container */}
                                <div className="max-h-[300px] sm:max-h-[380px] md:max-h-[460px] overflow-y-auto pr-1 card-scrollbar space-y-4">
                                    {filteredAddresses.map((addr) => (
                                        selectedAddressId === addr.id ? (
                                            <SelectedAddressCard
                                                key={addr.id}
                                                address={addr}
                                                onEdit={() => {
                                                    router.push(lp(`/customer/address-book/edit/${addr.id}?redirect=/checkout`));
                                                }}
                                            />
                                        ) : (
                                            <div
                                                key={addr.id}
                                                className="relative flex items-start gap-3 cursor-pointer group p-4 border border-border bg-white hover:bg-primary/20 transition-all duration-300 rounded-xl hover:shadow-sm"
                                                onClick={() => handleAddressSelect(addr.id)}
                                            >
                                                {/* Selection Indicator */}
                                                <div className="relative flex-shrink-0 mt-1">
                                                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 group-hover:border-gray-400 flex items-center justify-center transition-all duration-300">
                                                    </div>
                                                </div>

                                                {/* Details */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-body-sm text-black/70 leading-relaxed mb-3">
                                                        <p className="font-medium text-body-sm sm:text-body text-black">
                                                            <span className="font-bold">{addr.firstname} {addr.lastname}</span>{" "}
                                                            {addr.street} <bdi dir="ltr">{addr.city}, {addr.postcode}</bdi>{" "}
                                                            {addr.country_id === 'SA' ? t("data.Saudi Arabia") : addr.country_id}{" "}
                                                            <bdi dir="ltr">{addr.telephone}</bdi>
                                                            {[
                                                                addr.custom_attributes?.find(ca => ca.attribute_code === 'store_view')?.value,
                                                                addr.custom_attributes?.find(ca => ca.attribute_code === 'region_ship_to_party')?.value
                                                            ].filter(Boolean).map(val => ` ${val}`).join("")}
                                                        </p>
                                                    </div>

                                                    <div className="flex gap-3 pt-2">
                                                        <button
                                                            className="text-micro font-bold uppercase tracking-[0.15em] px-6 py-2 transition-all duration-300 border bg-black text-white border-black hover:bg-primary hover:text-black hover:border-primary rounded-lg active:scale-95 shadow-sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleAddressSelect(addr.id);
                                                            }}
                                                        >
                                                            {t("m.ship-here")}
                                                        </button>
                                                        <button
                                                            className="text-micro font-bold uppercase tracking-[0.15em] px-6 py-2 bg-white text-black/60 border border-border hover:bg-gray-50 hover:text-black hover:border-gray-300 transition-all duration-300 rounded-lg active:scale-95"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                router.push(lp(`/customer/address-book/edit/${addr.id}?redirect=/checkout`));
                                                            }}
                                                        >
                                                            {t("m.edit")}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    ))}


                                    {/* New Address Form as per image */}
                                    {/* {(showNewAddressForm || filteredAddresses.length === 0) && (
                                        <form onSubmit={handleAddNewAddress} className="space-y-6 pt-2">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> */}
                                    {/* First Name */}
                                    {/* <div className="space-y-2">
                                                    <label className="text-caption font-bold text-black/70 uppercase tracking-widest flex items-center gap-1">
                                                        First Name <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        required
                                                        className="w-full px-4 py-3 bg-white border border-border rounded-xl outline-none text-body font-medium transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 shadow-sm"
                                                        value={newAddress.firstname}
                                                        onChange={(e) => setNewAddress(prev => ({ ...prev, firstname: e.target.value }))}
                                                        placeholder="Mohamed"
                                                    />
                                                </div> */}

                                    {/* Last Name */}
                                    {/* <div className="space-y-2">
                                                    <label className="text-caption font-bold text-black/70 uppercase tracking-widest flex items-center gap-1">
                                                        Last Name <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        required
                                                        className="w-full px-4 py-3 bg-white border border-border rounded-xl outline-none text-body font-medium transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 shadow-sm"
                                                        value={newAddress.lastname}
                                                        onChange={(e) => setNewAddress(prev => ({ ...prev, lastname: e.target.value }))}
                                                        placeholder="BinQirat"
                                                    />
                                                </div> */}

                                    {/* Street Address */}
                                    {/* <div className="space-y-2">
                                                    <label className="text-caption font-bold text-black/70 uppercase tracking-widest flex items-center gap-1">
                                                        Street Address <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        required
                                                        className="w-full px-4 py-3 bg-white border border-border rounded-xl outline-none text-body font-medium transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 shadow-sm"
                                                        value={newAddress.street}
                                                        onChange={(e) => setNewAddress(prev => ({ ...prev, street: e.target.value }))}
                                                        placeholder="25 Palestine Streed"
                                                    />
                                                </div> */}

                                    {/* Country */}
                                    {/* <div className="space-y-2">
                                                    <label className="text-caption font-bold text-black/70 uppercase tracking-widest flex items-center gap-1">
                                                        Country <span className="text-red-500">*</span>
                                                    </label>
                                                    <div className="relative">
                                                        <select
                                                            required
                                                            className="w-full px-4 py-3 bg-white border border-border rounded-xl outline-none text-body font-medium transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 shadow-sm appearance-none"
                                                            value={newAddress.country_id}
                                                            onChange={(e) => setNewAddress(prev => ({ ...prev, country_id: e.target.value }))}
                                                        >
                                                            {(totals as any)?.permitted_countries?.map((c: any) => (
                                                                <option key={c.id || c.country_id} value={c.id || c.country_id}>
                                                                    {c.name || c.full_name_english || c.id}
                                                                </option>
                                                            )) || (
                                                                    <>
                                                                        <option value="SA">Saudi Arabia</option>

                                                                    </>
                                                                )}
                                                        </select>
                                                        <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-black/40 pointer-events-none" />
                                                    </div>
                                                </div> */}

                                    {/* Phone Number */}
                                    {/* <div className="space-y-2">
                                                    <label className="text-caption font-bold text-black/70 uppercase tracking-widest flex items-center gap-1">
                                                        Phone Number <span className="text-red-500">*</span>
                                                    </label>
                                                    <div className="flex gap-0 border border-border rounded-xl overflow-hidden focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 shadow-sm">
                                                        <div className="bg-gray-50 px-4 py-3 flex items-center gap-2 border-r border-border min-w-[100px]">
                                                            <img
                                                                src={`https://flagcdn.com/w20/${newAddress.country_id.toLowerCase()}.png`}
                                                                className="w-5 h-auto rounded-sm"
                                                                alt={newAddress.country_id}
                                                                onError={(e: any) => e.target.src = "https://flagcdn.com/w20/sa.png"}
                                                            />
                                                            <span className="text-body font-bold text-black">
                                                                {newAddress.country_id === 'SA' ? '+966' :
                                                                    newAddress.country_id === 'AE' ? '+971' :
                                                                        newAddress.country_id === 'IN' ? '+91' : '+'}
                                                            </span>
                                                            <ChevronDown size={14} className="text-black/40" />
                                                        </div>
                                                        <input
                                                            type="tel"
                                                            required
                                                            className="flex-1 px-4 py-3 bg-white outline-none text-body font-medium"
                                                            value={newAddress.telephone}
                                                            onChange={(e) => setNewAddress(prev => ({ ...prev, telephone: e.target.value }))}
                                                            placeholder="0544472854"
                                                        />
                                                    </div>
                                                </div> */}

                                    {/* Zip Code */}
                                    {/* <div className="space-y-2">
                                                    <label className="text-caption font-bold text-black/70 uppercase tracking-widest flex items-center gap-1">
                                                        Zip/Postal Code
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="w-full px-4 py-3 bg-white border border-border rounded-xl outline-none text-body font-medium transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 shadow-sm"
                                                        value={newAddress.postcode}
                                                        onChange={(e) => setNewAddress(prev => ({ ...prev, postcode: e.target.value }))}
                                                        placeholder="12345"
                                                    />
                                                </div>

                                                {/* Region Ship To Party */}
                                    {/* <div className="space-y-2">
                                                    <label className="text-caption font-bold text-black/70 uppercase tracking-widest flex items-center gap-1">
                                                        Region Ship To Party
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="w-full px-4 py-3 bg-white border border-border rounded-xl outline-none text-body font-medium transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 shadow-sm"
                                                        value={newAddress.region_ship_to_party}
                                                        onChange={(e) => setNewAddress(prev => ({ ...prev, region_ship_to_party: e.target.value }))}
                                                        placeholder="region_ship_to_party..."
                                                    />
                                                </div> */}

                                    {/* City */}
                                    {/* <div className="space-y-2">
                                                    <label className="text-caption font-bold text-black/70 uppercase tracking-widest flex items-center gap-1">
                                                        City <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        required
                                                        className="w-full px-4 py-3 bg-white border border-border rounded-xl outline-none text-body font-medium transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 shadow-sm"
                                                        value={newAddress.city}
                                                        onChange={(e) => setNewAddress(prev => ({ ...prev, city: e.target.value }))}
                                                        placeholder="Jeddah"
                                                    />
                                                </div> */}

                                    {/* Store View */}
                                    {/* <div className="space-y-2 md:col-span-2">
                                                    <label className="text-caption font-bold text-black/70 uppercase tracking-widest flex items-center gap-1">
                                                        Store View
                                                    </label>
                                                    <div className="relative">
                                                        <select
                                                            className="w-full px-4 py-3 bg-white border border-border rounded-xl outline-none text-body font-medium transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 shadow-sm appearance-none"
                                                            value={newAddress.store_view}
                                                            onChange={(e) => setNewAddress(prev => ({ ...prev, store_view: e.target.value }))}
                                                        >
                                                            <option value="">--- Select ---</option>
                                                            {(sourcePermission as any)?.permitted_stores?.map((s: any) => (
                                                                <option key={s.store_code} value={s.store_code}>
                                                                    {s.group_name || s.store_name || s.store_code}
                                                                </option>
                                                            ))}
                                                            {!(sourcePermission as any)?.permitted_stores && (
                                                                <>
                                                                    <option value="default">Default Store View</option>
                                                                    <option value="arabic">Arabic Store View</option>
                                                                </>
                                                            )}
                                                        </select>
                                                        <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-black/40 pointer-events-none" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex gap-4 pt-4"> */}
                                    {/* <button
                                                    type="submit"
                                                    disabled={isAddingAddress}
                                                    className="flex-1 bg-black text-white px-8 py-4 rounded-xl font-bold uppercase tracking-[0.2em] hover:bg-primary hover:text-black transition-all active:scale-95 shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                                                >
                                                    <>
                                                        <Check size={20} className={isAddingAddress ? "opacity-40" : ""} />
                                                        <span className={isAddingAddress ? "opacity-50" : ""}>{t("m.save-and-ship-here")}</span>
                                                    </>
                                                </button> */}
                                    {/* {filteredAddresses.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowNewAddressForm(false)}
                                                        className="px-8 py-4 rounded-xl font-bold uppercase tracking-[0.2em] border border-border hover:bg-gray-50 transition-all active:scale-95"
                                                    >
                                                        {t("m.cancel")}
                                                    </button>
                                                )}
                                            </div>
                                        </form>
                                    )} */}
                                </div>
                            </div>
                        </div>

                        {/* 2. Customer PO Number */}
                        <div className="bg-white border border-border shadow-sm rounded-xl overflow-hidden transition-all duration-300 hover:shadow-md">
                            <SectionHeader title={t("m.po-number")} step={2} />
                            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-caption font-bold text-black/50 uppercase tracking-widest">{t("m.po-number")}</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2.5 bg-gray-50/50 border border-border rounded-xl outline-none text-body font-medium transition-all placeholder:text-black/50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 shadow-sm"
                                        value={poNumber}
                                        onChange={(e) => setPoNumber(e.target.value)}
                                        onBlur={handlePoNumberBlur}
                                        placeholder={t("m.po-number")}
                                    />
                                    {uploadedPOs.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {/* We will hide these as they are now shown in the Upload PO section as per image */}
                                        </div>
                                    )}
                                </div>

                                <div className="border border-gray-200 rounded-sm mx-6 mb-6 overflow-hidden">
                                    <div
                                        className="bg-gray-50 px-5 py-3 flex items-center justify-between border-b border-gray-200 cursor-pointer hover:bg-white transition-colors"
                                        onClick={() => setIsPoUploadOpen(!isPoUploadOpen)}
                                    >
                                        <span className="text-body-lg font-bold text-black capitalize">{t("m.upload-file")}</span>
                                        <ChevronDown
                                            size={18}
                                            className={`text-black/50 transition-transform duration-300 ${isPoUploadOpen ? "rotate-180" : ""}`}
                                        />
                                    </div>
                                    {isPoUploadOpen && (
                                        <div className="p-4 bg-white space-y-4">
                                            {/* Drop Area */}
                                            <div
                                                className={`relative group p-8 border-2 border-dashed rounded-xl transition-all duration-300 flex flex-col items-center justify-center gap-4 cursor-pointer
                                                    ${dragActive ? "border-primary bg-primary/30 scale-[1.01]" : "border-border bg-gray-50/30 hover:bg-white hover:border-gray-300"}`}
                                                onDragEnter={handleDrag}
                                                onDragLeave={handleDrag}
                                                onDragOver={handleDrag}
                                                onDrop={handleDrop}
                                                onClick={() => poUploadRef.current?.click()}
                                            >
                                                <p className="text-[18px] text-black font-medium mb-4">{t("m.drop-files-here")}</p>
                                                <p className="text-body-lg text-black">
                                                    {t("m.allowed-file-types")} : <span className="text-black">jpg,jpeg,png,zip,rar,docx,doc,pdf,xls,xlsx,csv,msg</span>
                                                </p>
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    ref={poUploadRef}
                                                    onChange={handleFileUpload}
                                                    accept=".jpg,.jpeg,.png,.zip,.rar,.docx,.doc,.pdf,.xls,.xlsx,.csv,.msg"
                                                    multiple
                                                />
                                            </div>

                                            {/* Files List - Image Style */}
                                            <div className="flex flex-wrap gap-x-4 gap-y-3">
                                                {uploadedPOs.map((po, idx) => (
                                                    <div key={idx} className="flex border border-border rounded-xl overflow-hidden group shadow-sm bg-white">
                                                        <div className="px-6 py-3 flex-1 flex items-center min-w-0">
                                                            <span className="text-body font-bold text-black truncate ltr:mr-2 rtl:ml-2">
                                                                {po.fileName}
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={() => handleDeletePo(po.fileName, po.backendRef)}
                                                            className="bg-red-50 text-red-600 px-6 py-3 text-label font-bold uppercase tracking-widest transition-all hover:bg-red-600 hover:text-white border-l border-border active:scale-95"
                                                            disabled={isUploading}
                                                        >
                                                            {t("m.remove")}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border border-border shadow-sm rounded-xl overflow-hidden" id="step-3">
                            <SectionHeader title={t("checkout.shippingMethod")} step={3} />
                            <div className="p-6">
                                <div className="space-y-6">
                                    {/* Delivery Option */}
                                    <div
                                        className="flex items-center gap-4 cursor-pointer group"
                                        onClick={() => setShippingType("delivery")}
                                    >
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${shippingType === "delivery" ? "border-black" : "border-gray-400 group-hover:border-gray-600"}`}>
                                            {shippingType === "delivery" && (
                                                <div className="w-2.5 h-2.5 bg-black rounded-full" />
                                            )}
                                        </div>
                                        <span className={`text-body font-bold transition-colors ${shippingType === "delivery" ? "text-black" : "text-black/80"}`}>
                                            {t("m.delivery")}
                                        </span>
                                    </div>

                                    <div className="border-t border-dashed border-gray-300 w-full" />

                                    {/* Pickup Option */}
                                    <div className="space-y-5">
                                        <div
                                            className="flex items-center gap-4 cursor-pointer group"
                                            onClick={() => setShippingType("pickup")}
                                        >
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${shippingType === "pickup" ? "border-black" : "border-gray-400 group-hover:border-gray-600"}`}>
                                                {shippingType === "pickup" && (
                                                    <div className="w-2.5 h-2.5 bg-black rounded-full" />
                                                )}
                                            </div>
                                            <span className={`text-body font-bold transition-colors ${shippingType === "pickup" ? "text-black" : "text-black/80"}`}>
                                                {t("m.pickup-from-warehouse")}
                                            </span>
                                        </div>

                                        {shippingType === "pickup" && (
                                            <div className="ml-9 space-y-4">
                                                <div className="flex flex-col items-start gap-4">
                                                    <button
                                                        className="bg-primary text-black px-6 py-2.5 text-label font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-all active:scale-95 border border-transparent shadow-sm"
                                                        onClick={() => {
                                                            setIsWarehouseModalOpen(true);
                                                            setIsPickupFormOpen(!isPickupFormOpen);
                                                        }}
                                                    >
                                                        {t("m.select-warehouse")}
                                                    </button>

                                                    {selectedWarehouse && (
                                                        <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-sm">
                                                            <span className="text-body-sm font-bold text-black uppercase tracking-widest">
                                                                {t("m.selected")}: <span className="text-black">{selectedWarehouse}</span>
                                                            </span>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setIsWarehouseModalOpen(true);
                                                                }}
                                                                className="text-caption text-primary font-bold hover:underline"
                                                            >
                                                                {t("m.change")}
                                                            </button>
                                                            <div className="w-px h-3 bg-gray-300 mx-1" />
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setIsPickupFormOpen(!isPickupFormOpen);
                                                                }}
                                                                className="text-caption text-black font-bold hover:underline"
                                                            >
                                                                {isPickupFormOpen ? t("m.close") : t("m.edit")} {t("m.details")}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Pickup Details Form */}
                                                {isPickupFormOpen && (
                                                    <div className="p-6 bg-surfacePanel border border-gray-200 rounded-sm space-y-4 animate-in slide-in-from-top-2 duration-300">
                                                        {/* Row 1: Name & ID */}
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="flex items-center gap-3">
                                                                <label className="text-label font-bold text-black/50 uppercase tracking-widest whitespace-nowrap min-w-[110px]">{t("checkout.personName")} *</label>
                                                                <input
                                                                    type="text"
                                                                    value={pickupName}
                                                                    onChange={(e) => setPickupName(e.target.value)}
                                                                    className="flex-1 px-4 py-2 bg-white border border-gray-300 outline-none text-body-lg font-medium transition-all focus:border-black hover:border-gray-400 h-10"
                                                                    placeholder={t("m.name")}
                                                                />
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <label className="text-label font-bold text-black/50 uppercase tracking-widest whitespace-nowrap min-w-[90px] md:min-w-[80px]">{t("checkout.personId")} *</label>
                                                                <input
                                                                    type="text"
                                                                    value={pickupId}
                                                                    onChange={(e) => setPickupId(e.target.value)}
                                                                    className="flex-1 px-4 py-2 bg-white border border-gray-300 outline-none text-body-lg font-medium transition-all focus:border-black hover:border-gray-400 h-10"
                                                                    placeholder={t("m.id")}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Row 2: Mobile Number */}
                                                        <div className="flex items-center gap-3">
                                                            <label className="text-label font-bold text-black/50 uppercase tracking-widest whitespace-nowrap min-w-[110px]">{t("checkout.mobileNumber")} *</label>
                                                            <input
                                                                type="tel"
                                                                value={pickupMobile}
                                                                onChange={(e) => setPickupMobile(e.target.value)}
                                                                className="flex-1 px-4 py-2 bg-white border border-gray-300 outline-none text-body-lg font-medium transition-all focus:border-black hover:border-gray-400 h-10"
                                                                placeholder={t("checkout.enterMobile")}
                                                            />
                                                        </div>

                                                        {/* Row 3: Date & Time */}
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {/* Calendar Date Picker */}
                                                            <div className="flex items-center gap-3">
                                                                <label className="text-label font-bold text-black/50 uppercase tracking-widest whitespace-nowrap min-w-[110px]">{t("checkout.pickUpDate")} *</label>
                                                                <div className="relative flex-1 pickup-datepicker">
                                                                    <DatePicker
                                                                        ref={datePickerRef}
                                                                        selected={pickupDate}
                                                                        onChange={(date: Date | null) => {
                                                                            if (date) setPickupDate(date);
                                                                        }}
                                                                        minDate={new Date()}
                                                                        dateFormat="MM/dd/yyyy"
                                                                        placeholderText={t("m.select")}
                                                                        className="w-full h-10 px-4 py-2 bg-white border border-gray-300 outline-none text-body-lg font-medium transition-all cursor-pointer hover:border-gray-400 focus:border-black"
                                                                        calendarClassName="retro-datepicker"
                                                                        showPopperArrow={false}
                                                                        popperPlacement="bottom-start"
                                                                        renderCustomHeader={({
                                                                            date,
                                                                            decreaseMonth,
                                                                            increaseMonth,
                                                                            prevMonthButtonDisabled,
                                                                            nextMonthButtonDisabled,
                                                                        }) => (
                                                                            <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-gray-100">
                                                                                <button
                                                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); decreaseMonth(); }}
                                                                                    disabled={prevMonthButtonDisabled}
                                                                                    type="button"
                                                                                    className={`p-1.5 rounded-full hover:bg-gray-100 transition-colors ${prevMonthButtonDisabled ? "opacity-30 cursor-not-allowed" : "text-black"}`}
                                                                                >
                                                                                    <ChevronLeft size={18} />
                                                                                </button>
                                                                                <span className="text-body font-bold uppercase tracking-widest text-black">
                                                                                    {date.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                                                                </span>
                                                                                <button
                                                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); increaseMonth(); }}
                                                                                    disabled={nextMonthButtonDisabled}
                                                                                    type="button"
                                                                                    className={`p-1.5 rounded-full hover:bg-gray-100 transition-colors ${nextMonthButtonDisabled ? "opacity-30 cursor-not-allowed" : "text-black"}`}
                                                                                >
                                                                                    <ChevronRight size={18} />
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* Scrollable Time Picker */}
                                                            <div className="flex items-center gap-3">
                                                                <label className="text-label font-bold text-black/50 uppercase tracking-widest whitespace-nowrap min-w-[90px] md:min-w-[80px]">{t("checkout.pickUpTime")} *</label>
                                                                <div className="relative flex-1">
                                                                    {isLoadingTimeSlots ? (
                                                                        <div className="w-full h-10 px-4 py-2 bg-white border border-gray-200 flex items-center animate-pulse">
                                                                            <div className="h-4 bg-gray-200 rounded flex-1" />
                                                                        </div>
                                                                    ) : (
                                                                        <div ref={timeRef} className="relative">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setIsTimeDropdownOpen((prev) => !prev)}
                                                                                className={`w-full h-10 px-4 py-2 bg-white border outline-none text-body font-medium transition-all cursor-pointer hover:border-gray-400 focus:border-black flex items-center justify-between ${isTimeDropdownOpen ? "border-primary" : "border-gray-300"}`}
                                                                            >
                                                                                <span className={pickupTime ? "text-black" : "text-black/50"}>
                                                                                    {pickupTime
                                                                                        ? availableTimeSlots.find((s) => s.time === pickupTime)?.label || pickupTime
                                                                                        : t("m.select")}
                                                                                </span>
                                                                                <ChevronDown size={14} className={`text-black/60 transition-transform ${isTimeDropdownOpen ? "rotate-180" : ""}`} />
                                                                            </button>
                                                                            {isTimeDropdownOpen && createPortal(
                                                                                <>
                                                                                    <div className="fixed inset-0" style={{ zIndex: 9998 }} onClick={() => setIsTimeDropdownOpen(false)} />
                                                                                    <ul
                                                                                        className="bg-white border border-gray-300 rounded-sm shadow-xl max-h-48 overflow-y-auto"
                                                                                        style={{
                                                                                            position: "fixed",
                                                                                            zIndex: 9999,
                                                                                            top: timeRef.current ? timeRef.current.getBoundingClientRect().bottom + 4 : 0,
                                                                                            left: timeRef.current ? timeRef.current.getBoundingClientRect().left : 0,
                                                                                            width: timeRef.current ? timeRef.current.getBoundingClientRect().width : "auto",
                                                                                        }}
                                                                                    >
                                                                                        <li
                                                                                            onClick={() => {
                                                                                                setPickupTime("");
                                                                                                setIsTimeDropdownOpen(false);
                                                                                            }}
                                                                                            className={`px-4 py-2 text-body font-medium cursor-pointer transition-colors ${pickupTime === "" ? "bg-primary text-white" : "hover:bg-gray-100 text-black/50"}`}
                                                                                        >
                                                                                            {t("checkout.selectTime")}
                                                                                        </li>
                                                                                        {availableTimeSlots.map((slot: any) => (
                                                                                            <li
                                                                                                key={slot.time}
                                                                                                onClick={() => {
                                                                                                    if (slot.enabled) {
                                                                                                        setPickupTime(slot.time);
                                                                                                        setIsTimeDropdownOpen(false);
                                                                                                    }
                                                                                                }}
                                                                                                className={`px-4 py-2 text-body font-medium transition-colors ${!slot.enabled ? "opacity-40 cursor-not-allowed text-black/50" : "cursor-pointer"} ${pickupTime === slot.time ? "bg-primary text-white" : slot.enabled ? "hover:bg-gray-100" : ""}`}
                                                                                            >
                                                                                                {slot.label}
                                                                                            </li>
                                                                                        ))}
                                                                                    </ul>
                                                                                </>,
                                                                                document.body
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border border-border shadow-sm rounded-xl overflow-hidden">
                            <SectionHeader title={t("checkout.paymentMethod")} step={4} />

                            <div className="p-5">
                                <div className="space-y-4">
                                    {paymentMethods.map((method) => {
                                        const isSelected = paymentMethod === method.code;
                                        const needsUpload = method.code === 'banktransfer';
                                        return (
                                            <div key={method.code}>
                                                <label className="flex items-center gap-3 cursor-pointer py-1 group">
                                                    <span className="relative flex items-center justify-center">
                                                        <input
                                                            type="radio"
                                                            name="payment_method"
                                                            value={method.code}
                                                            checked={isSelected}
                                                            onChange={() => { paymentMethodSetRef.current = true; setPaymentMethod(method.code); }}
                                                            className="appearance-none w-4 h-4 border-2 border-gray-300 rounded-full checked:border-black focus:outline-none transition-all"
                                                        />
                                                        {isSelected && (
                                                            <span className="absolute w-2 h-2 bg-black rounded-full" />
                                                        )}
                                                    </span>
                                                    <span className="text-body-lg font-bold text-black">
                                                        {t(`payment_method.${method.code}`) !== `payment_method.${method.code}`
                                                            ? t(`payment_method.${method.code}`)
                                                            : method.title}
                                                    </span>
                                                </label>

                                                {isSelected && needsUpload && (
                                                    <div className="mt-3 border border-gray-100 rounded-xl overflow-hidden">
                                                        <div
                                                            className="bg-surfaceMuted px-5 py-4 flex items-center justify-between border-b border-gray-100 cursor-pointer group hover:bg-surfaceDim transition-colors"
                                                            onClick={() => setIsPaymentCommitmentOpen(!isPaymentCommitmentOpen)}
                                                        >
                                                            <span className="text-body-lg font-bold text-black">
                                                                {t("m.payment-commitment-upload") !== "m.payment-commitment-upload"
                                                                    ? t("m.payment-commitment-upload")
                                                                    : t("multi.paymentCommitment")}
                                                            </span>
                                                            <ChevronDown
                                                                size={20}
                                                                className={`text-black/60 transition-transform duration-300 ${isPaymentCommitmentOpen ? "rotate-180" : ""}`}
                                                            />
                                                        </div>

                                                        {isPaymentCommitmentOpen && (
                                                            <div className="p-6 bg-white animate-in slide-in-from-top-2 duration-300">
                                                                <div
                                                                    className={`w-full py-10 border-2 border-dashed border-gray-300 bg-gray-50/50 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:border-black hover:bg-white rounded-xl mb-6 ${dragActivePC ? "border-black bg-white" : ""} ${isPaymentCommitmentUploading ? "opacity-60 pointer-events-none" : ""}`}
                                                                    onClick={() => !isPaymentCommitmentUploading && paymentCommitmentRef.current?.click()}
                                                                    onDragOver={(e) => { e.preventDefault(); setDragActivePC(true); }}
                                                                    onDragLeave={() => setDragActivePC(false)}
                                                                    onDrop={(e) => {
                                                                        e.preventDefault();
                                                                        setDragActivePC(false);
                                                                        handlePaymentCommitmentUpload(e);
                                                                    }}
                                                                >
                                                                    <div className="text-center px-6">
                                                                        <p className="text-h3 text-black font-bold mb-3 tracking-tight">
                                                                            {/* {isPaymentCommitmentUploading ? t("checkout.uploading") || "Uploading..." : t("m.drop-files-here")} */}
                                                                            {/* Placeholder - replace with actual translation key */}
                                                                            {isPaymentCommitmentUploading ? "Drop Files Here" : "Drop Files Here"}

                                                                        </p>
                                                                        <p className="text-body-lg text-black/80 font-medium">
                                                                            {t("m.allowed-file-types")} : jpg,jpeg,png,zip,rar,docx,doc,pdf,xls,xlsx,csv,msg
                                                                        </p>
                                                                    </div>
                                                                    <input
                                                                        type="file"
                                                                        className="hidden"
                                                                        ref={paymentCommitmentRef}
                                                                        onChange={handlePaymentCommitmentUpload}
                                                                        accept=".jpg,.jpeg,.png,.zip,.rar,.docx,.doc,.pdf,.xls,.xlsx,.csv,.msg"
                                                                        multiple
                                                                    />
                                                                </div>

                                                                {uploadedPaymentCommitments.length > 0 && (
                                                                    <div className="flex flex-wrap gap-x-4 gap-y-3">
                                                                        {uploadedPaymentCommitments.map((pc, idx) => (
                                                                            <div key={idx} className="flex border border-border rounded-xl overflow-hidden group shadow-sm bg-white">
                                                                                <div className="px-6 py-3 flex-1 flex items-center min-w-0">
                                                                                    <span className="text-body font-bold text-black truncate ltr:mr-2 rtl:ml-2">
                                                                                        {pc.fileName}
                                                                                    </span>
                                                                                </div>
                                                                                <button
                                                                                    onClick={() => removePaymentCommitment(pc.backendRef)}
                                                                                    disabled={isPaymentCommitmentUploading}
                                                                                    className="bg-red-50 text-red-600 px-6 py-3 text-label font-bold uppercase tracking-widest transition-all hover:bg-red-600 hover:text-white border-l border-border active:scale-95 disabled:opacity-50"
                                                                                >
                                                                                    {t("m.remove")}
                                                                                </button>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ═══════════ Right Column (Order Summary) ═══════════ */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white border border-border shadow-lg rounded-xl sticky top-24 overflow-hidden transition-all duration-300">
                            {/* Header exactly as per image */}
                            <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-2 sm:gap-3 border-b border-border">
                                <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center">
                                    <Check size={12} strokeWidth={4} className="text-white" />
                                </div>
                                <h3 className="text-label font-bold text-black text-center uppercase tracking-widest">
                                    {t("m.order-summary")}
                                </h3>
                            </div>

                            <div className="p-0">
                                {/* Collapsible Item Count Header */}
                                <div
                                    className="px-5 py-3 flex items-center justify-between border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={() => setIsItemsListOpen(!isItemsListOpen)}
                                >
                                    <span className="text-body font-bold text-black">
                                        {cart?.items_count || 0} {t("cart.itemsInCart")}
                                    </span>
                                    <ChevronDown
                                        size={20}
                                        className={`text-black transition-transform duration-300 ${isItemsListOpen ? "rotate-180" : ""}`}
                                    />
                                </div>

                                {/* Collapsible Product List */}
                                <div
                                    className={`overflow-hidden transition-all duration-500 ease-in-out ${isItemsListOpen ? "max-height-none border-b border-gray-100" : "max-h-0"}`}
                                    style={{ maxHeight: isItemsListOpen ? "1000px" : "0" }}
                                >
                                    <div className="space-y-3 sm:space-y-4 md:space-y-6 p-4 sm:p-6">
                                        {cart?.items?.map((item) => (
                                            <div key={item.item_id} className="flex gap-4 items-start pb-6 border-b border-gray-50 last:border-0 last:pb-0">
                                                <div className="w-16 sm:w-20 h-16 sm:h-20 flex-shrink-0 border border-border rounded-xl overflow-hidden bg-gray-50 p-2">
                                                    <img
                                                        src={item.image_url || "/images/tyre-sample.png"}
                                                        alt={item.name}
                                                        className="w-full h-full object-contain"
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0 pt-0.5">
                                                    <h4 className="text-body font-bold text-black leading-tight mb-1.5">
                                                        {item.name}
                                                    </h4>
                                                    <div className="flex items-center gap-1 mb-1.5 text-body">
                                                        <span className="font-bold text-black">{t("m.qty")} :</span>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={item.qty}
                                                            onChange={(e) => {
                                                                const val = parseInt(e.target.value);
                                                                if (val > 0) updateCartItem(item.item_id, val);
                                                            }}
                                                            className="w-10 h-7 border border-border rounded-lg text-center text-body-sm font-bold focus:outline-none focus:border-primary ml-1 bg-gray-50/50"
                                                        />
                                                    </div>
                                                    <div className="text-body font-bold text-black price currency-riyal">
                                                        <Price amount={item.row_total} />
                                                    </div>

                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Totals Section */}
                                <div className="p-4 sm:p-5 space-y-2.5 sm:space-y-3">
                                    <div className="flex justify-between items-center text-body-lg">
                                        <span className="text-black font-[900] uppercase tracking-tight">{t("cart.subtotal") || "SUBTOTAL"}</span>
                                        <span className="font-[900] text-black price currency-riyal">
                                            <Price amount={displayTotals.subtotal} />
                                        </span>
                                    </div>

                                    {displayTotals.discount_amount > 0 && (
                                        <div className="flex justify-between items-center text-body-lg">
                                            <span className="text-[#008a00] font-[900] uppercase tracking-tight">{t("m.discount") || "DISCOUNT"}</span>
                                            <span className="font-[900] text-[#008a00] price currency-riyal">
                                                - <Price amount={displayTotals.discount_amount} />
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center">
                                        <span className="text-[13px] font-[900] text-black uppercase tracking-tight">
                                            {isRtl ? t("m.tax") : "VAT (15%)"}
                                        </span>
                                        <span className="text-[13px] font-[900] text-black">
                                            <Price amount={displayTotals.tax_amount} />
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className="text-[13px] font-[900] text-black uppercase tracking-tight">
                                            {t("m.shipping") || "SHIPPING"}
                                        </span>
                                        <span className="text-[13px] font-[900] text-black">
                                            <Price amount={displayTotals.shipping_amount} />
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                                        <span className="text-[14px] font-[900] text-black uppercase tracking-tight">
                                            {t("common.grandTotal") || "GRAND TOTAL"}
                                        </span>
                                        <span className="text-[14px] font-[900] text-black">
                                            <Price amount={displayTotals.grand_total} />
                                        </span>
                                    </div>
                                </div>

                                {/* Order Comment */}
                                <div className="px-5 pb-5 pt-2 border-t border-gray-100">
                                    {/* <span>Order Comment</span> */}
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-black text-black uppercase tracking-widest">{t("ORDER COMMENT")}</label>
                                        <textarea
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-border rounded-xl outline-none text-[13px] font-medium transition-all placeholder:text-gray-300 focus:bg-white focus:border-black min-h-[70px] resize-none shadow-sm"
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            onBlur={handleCommentBlur}
                                            placeholder={t("m.enter-your-comment")}
                                        />
                                    </div>
                                </div>

                                {/* Place Order Button */}
                                <div className="px-5 pb-6">
                                    <button
                                        onClick={handlePlaceOrder}
                                        className={`w-full py-4 text-body-lg font-bold uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2.5 rounded-xl shadow-lg ${isPlacingOrder
                                            ? "bg-gray-100 text-black/50 cursor-not-allowed border-border"
                                            : "bg-primary hover:bg-black hover:text-white border-primary hover:border-black active:scale-[0.98]"
                                            }`}
                                    >
                                        {isPlacingOrder ? (
                                            <>
                                                <span className="animate-pulse opacity-70">{t("common.placeOrder")}</span>
                                            </>
                                        ) : (
                                            <>
                                                {t("common.placeOrder")}
                                                <span className="relative -top-1 text-lg opacity-50 select-none">→</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Warehouse Selection Modal */}
            {isWarehouseModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-200">
                        {/* Modal Header */}
                        <div className="bg-black py-4 px-6 flex justify-end items-center">
                            <button
                                onClick={() => setIsWarehouseModalOpen(false)}
                                className="text-white hover:text-primary transition-colors"
                            >
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-8 max-h-[70vh] overflow-y-auto space-y-4 bg-gray-50/30">
                            {stores.length > 0 ? (
                                stores.map((wh) => (
                                    <div
                                        key={wh.id}
                                        className={`p-6 border transition-all cursor-pointer bg-white group ${tempSelectedWarehouse?.id === wh.id ? "border-black ring-1 ring-black shadow-md" : "border-gray-200 hover:border-gray-400"}`}
                                        onClick={() => setTempSelectedWarehouse({ id: wh.id, name: wh.name })}
                                    >
                                        <h4 className="text-h3-sm font-bold text-black uppercase mb-3 tracking-wide">{wh.name}</h4>
                                        <div className="space-y-1 text-body">
                                            <p className="flex items-start gap-2">
                                                <span className="font-bold text-black min-w-[80px]">{t("m.address")}:</span>
                                                <span className="text-black/80">{wh.address}</span>
                                            </p>
                                            <p className="flex items-start gap-2">
                                                <span className="font-bold text-black min-w-[80px]">{t("m.email")}:</span>
                                                <a href={`mailto:${wh.email}`} className="text-infoLink hover:underline" onClick={(e) => e.stopPropagation()}>{wh.email}</a>
                                            </p>
                                            <p className="flex items-start gap-2">
                                                <span className="font-bold text-black min-w-[80px]">{t("checkout.gpsLocation")}:</span>
                                                <a href={wh.gps_location} target="_blank" rel="noopener noreferrer" className="text-infoLink hover:underline flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                    {wh.gps_location.startsWith('http') ? wh.gps_location.replace('https://', '').replace('http://', '') : t("checkout.viewOnMaps")}
                                                </a>
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-6 space-y-3 animate-pulse">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <div key={i} className="flex items-start gap-3 p-3 border border-gray-100 rounded-lg">
                                            <div className="h-4 w-4 bg-gray-200 rounded-full flex-shrink-0 mt-0.5" />
                                            <div className="flex-1 space-y-1.5">
                                                <div className="h-4 bg-gray-200 rounded w-3/4" />
                                                <div className="h-3 bg-gray-200 rounded w-1/2" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-white">
                            <button
                                className={`px-10 py-3 text-body font-bold uppercase tracking-widest transition-all ${tempSelectedWarehouse ? "bg-primary hover:bg-black hover:text-white shadow-md" : "bg-gray-100 text-black/50 cursor-not-allowed"}`}
                                onClick={() => {
                                    if (tempSelectedWarehouse) {
                                        setSelectedWarehouse(tempSelectedWarehouse.name);
                                        setSelectedWarehouseId(tempSelectedWarehouse.id);
                                        setIsWarehouseModalOpen(false);
                                        setIsPickupFormOpen(true);
                                        toast.success(t("checkout.selectedWarehouse").replace("{0}", tempSelectedWarehouse.name));
                                    }
                                }}
                                disabled={!tempSelectedWarehouse}
                            >
                                {t("m.pick-up-here")}
                            </button>
                            <button
                                className="px-10 py-3 bg-black text-white text-body font-bold uppercase tracking-widest hover:bg-gray-800 transition-all shadow-md"
                                onClick={() => setIsWarehouseModalOpen(false)}
                            >
                                {t("m.close")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CheckoutPageUI;
