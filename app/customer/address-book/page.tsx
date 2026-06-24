"use client";

import Sidebar from "@/components/Sidebar";
import Addresses from "../../components/Addresses";

export default function AddressBookPage() {
    return (
        <div className="flex flex-col lg:flex-row flex-1 min-h-0 w-full">
            <Sidebar />
            <main className="flex-1 w-full min-w-0 px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-5 bg-white">
                <Addresses />
            </main>
        </div>
    );
}
