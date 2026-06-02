"use client";
import { useTranslation } from "@/hooks/useTranslation";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Sidebar from "@/components/Sidebar";
import { useDispatch, useSelector } from "react-redux";
import { fetchCustomerInfo } from "@/store/actions/customerActions";
import { RootState } from "@/store/store";
import Link from "next/link";
import Addresses from "../../components/Addresses";
import { redirectToLogin } from "@/utils/helpers";
import { AddressBookSkeleton } from "@/components/skeletons";

export default function AddressBookPage() {
    const router = useRouter();
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const { data: session, status } = useSession();
    const { data: customer, loading } = useSelector((state: RootState) => state.customer);
    const token = useSelector((state: RootState) => state.auth.token);

    useEffect(() => {
        if (status === "unauthenticated") {
            redirectToLogin(router);
            return;
        }

        // Navbar already dispatches fetchCustomerInfo when customer is missing;
        // only fire here if it really hasn't been populated yet (e.g. direct
        // hit on this URL before Navbar mounts).
        if (status === "authenticated" && token && !customer) {
            // @ts-ignore
            dispatch(fetchCustomerInfo());
        }
    }, [dispatch, status, router, token, customer]);

    if (status === "loading" || loading) {
        return (
            <div className="flex flex-col lg:flex-row flex-1 min-h-0 w-full">
                <Sidebar />
                <AddressBookSkeleton />
            </div>
        );
    }

    return (
        <>


            <div className="flex flex-col lg:flex-row flex-1 min-h-0 w-full">
                {/* Left Sidebar */}
                <Sidebar />

                {/* Right Content */}
                <main className="flex-1 p-4 md:p-6 lg:p-8 bg-surfacePage min-h-0">
                    <div className="max-w-[1200px]">
                        <Addresses />
                    </div>
                </main>
            </div>
        </>
    );
}
