"use client";

import Sidebar from "@/components/Sidebar";
import Addresses from "../../components/Addresses";

export default function AddressBookPage() {
    return (
        <div className="flex flex-col lg:flex-row flex-1 min-h-0 w-full">
            <Sidebar />
            <main className="flex-1 w-full min-w-0 px-4 md:px-8 lg:px-10 py-6 md:py-10 bg-white">
                <Addresses />
            </main>
        </div>
    );
}
