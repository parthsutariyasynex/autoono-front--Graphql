"use client";

import React, { useState } from "react";
import Popup from "@/components/Popup";
import { Info, Layout, ShoppingCart, Settings } from "lucide-react";

export default function PopupDemo() {
    const [activePopup, setActivePopup] = useState<string | null>(null);

    const closePopup = () => setActivePopup(null);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 space-y-8">
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-bold text-black tracking-tight">PREMIUM POPUPS</h1>
                <p className="text-black/60">Smooth, GPU-accelerated transitions powered by Framer Motion.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                <button
                    onClick={() => setActivePopup("center")}
                    className="group flex flex-col items-center p-8 bg-white rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all border border-gray-100"
                >
                    <Layout className="w-10 h-10 mb-4 text-primary group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-black">Classic Modal</span>
                    <span className="text-xs text-black/50 mt-1">Fade + Scale</span>
                </button>

                <button
                    onClick={() => setActivePopup("right")}
                    className="group flex flex-col items-center p-8 bg-white rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all border border-gray-100"
                >
                    <ShoppingCart className="w-10 h-10 mb-4 text-purple-500 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-black">Right Slider</span>
                    <span className="text-xs text-black/50 mt-1">Standard Drawer</span>
                </button>

                <button
                    onClick={() => setActivePopup("bottom")}
                    className="group flex flex-col items-center p-8 bg-white rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all border border-gray-100"
                >
                    <Settings className="w-10 h-10 mb-4 text-orange-500 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-black">Bottom Sheet</span>
                    <span className="text-xs text-black/50 mt-1">Mobile Friendly</span>
                </button>

                <button
                    onClick={() => setActivePopup("full")}
                    className="group flex flex-col items-center p-8 bg-white rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all border border-gray-100"
                >
                    <Info className="w-10 h-10 mb-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-black">Full View</span>
                    <span className="text-xs text-black/50 mt-1">Immersive Experience</span>
                </button>
            </div>

            {/* MODALS */}

            <Popup
                isOpen={activePopup === "center"}
                onClose={closePopup}
                title="Settings Overview"
                animation="fade-scale"
                maxWidth="max-w-md"
            >
                <div className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse" />
                        <div className="h-4 bg-gray-100 rounded w-1/2 animate-pulse" />
                        <div className="h-4 bg-gray-100 rounded w-2/3 animate-pulse" />
                    </div>
                    <p className="text-black/60 text-sm leading-relaxed">
                        This modal uses a smooth scale-in animation with a subtle fade, creating a focused experience.
                    </p>
                    <button
                        onClick={closePopup}
                        className="w-full py-4 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-colors"
                    >
                        Save Changes
                    </button>
                </div>
            </Popup>

            <Popup
                isOpen={activePopup === "right"}
                onClose={closePopup}
                title="Your Wishlist"
                animation="slide-right"
            >
                <div className="flex flex-col h-full bg-white">
                    <div className="p-6 space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex gap-4 items-center p-4 bg-gray-50 rounded-2xl">
                                <div className="w-12 h-12 bg-gray-200 rounded-lg" />
                                <div className="flex-1">
                                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-1" />
                                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-auto p-6 border-t border-gray-100">
                        <button className="w-full py-4 bg-purple-600 text-white font-bold rounded-xl shadow-lg shadow-purple-200">
                            Clear All Items
                        </button>
                    </div>
                </div>
            </Popup>

            <Popup
                isOpen={activePopup === "bottom"}
                onClose={closePopup}
                title="Select Category"
                animation="slide-bottom"
            >
                <div className="p-8 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        {["Summer", "Winter", "Performance", "Touring"].map((cat) => (
                            <button key={cat} className="p-6 border border-gray-100 rounded-3xl hover:bg-orange-50 hover:border-orange-200 transition-all font-bold text-black/80">
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </Popup>

            <Popup
                isOpen={activePopup === "full"}
                onClose={closePopup}
                title="Application Status"
                animation="fade-scale"
                size="full"
            >
                <div className="h-full flex flex-col items-center justify-center p-20 text-center">
                    <div className="w-40 h-40 bg-emerald-100 rounded-full flex items-center justify-center mb-8">
                        <Info className="w-20 h-20 text-emerald-600" />
                    </div>
                    <h2 className="text-4xl font-bold text-black mb-4">All Systems Normal</h2>
                    <p className="text-black/60 max-w-xl text-lg">
                        Your application is running smoothly with optimized animations and high performance components.
                    </p>
                </div>
            </Popup>
        </div>
    );
}
