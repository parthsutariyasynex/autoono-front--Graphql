"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNotifications } from "@/modules/notifications/hooks/useNotifications";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";
import { useLocalePath } from "@/hooks/useLocalePath";

import Drawer from "./Drawer";

interface NotificationDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function NotificationDrawer({ isOpen, onClose }: NotificationDrawerProps) {
    const {
        notifications,
        unreadCount,
        isLoading,
        deletingIds,
        fetchNotifications,
        markAsRead,
        removeNotification
    } = useNotifications();

    const router = useRouter();
    const { t, isRtl } = useTranslation();
    const lp = useLocalePath();

    // Translate notification text patterns from API (English → Arabic)
    const translateNotification = (text: string): string => {
        if (!text || !isRtl) return text;
        // "New Order# BT00028707" → "طلب جديد# BT00028707"
        let result = text.replace(/New Order#\s*/i, `${t("notifications.newOrder")} `);
        // "placed successfully" → "تم تقديمه بنجاح"
        result = result.replace(/placed successfully/i, t("notifications.orderPlaced"));
        return result;
    };

    // Format date — always English
    const formatNotificationDate = (dateStr: string): string => {
        if (!dateStr) return "";
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return new Intl.DateTimeFormat("en-US", {
                year: "numeric", month: "short", day: "2-digit",
                hour: "2-digit", minute: "2-digit"
            }).format(d);
        } catch {
            return dateStr;
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen, fetchNotifications]);

    const handleNotificationClick = async (notification: any) => {
        if (!notification.is_read) {
            await markAsRead(notification.notification_id);
        }
    };

    // Extract numeric order ID from URL like "/sales/order/view/order_id/28707"
    const getOrderLink = (item: any): string | null => {
        const url = item.url || "";
        const urlMatch = url.match(/order_id\/(\d+)/);
        if (urlMatch) return lp(`/my-orders/${urlMatch[1]}`);
        return null;
    };

    // Resolve the destination for a whole-row click. Order-related notifications
    // go to the specific order; everything else goes to the full notifications page.
    const getRowHref = (item: any): string => {
        return getOrderLink(item) || lp("/customer/notifications");
    };

    const onRowClick = async (item: any) => {
        await handleNotificationClick(item);
        onClose();
    };

    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            title={`${t("nav.notifications")} (${unreadCount})`}
        >
            <div className="flex flex-col flex-1 min-h-0 bg-white" dir={isRtl ? "rtl" : "ltr"}>
                {/* Notifications List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {isLoading && notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
                            <div className="space-y-2 p-4 animate-pulse w-full">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="h-4 bg-gray-200 rounded w-full" />
                                ))}
                            </div>
                            {/* <p className="mt-4 text-label text-black/50 font-bold uppercase tracking-[0.2em]">{t("common.loading")}</p> */}
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 px-10 text-center animate-in zoom-in-95 duration-500">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                                <BellIcon />
                            </div>
                            <p className="text-h3-sm font-bold text-black uppercase tracking-tight">{t("notifications.empty")}</p>
                            <p className="text-xs text-black/50 mt-2 font-medium tracking-widest uppercase">{t("notifications.upToDate")}</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {notifications.map((item, index) => (
                                <Link
                                    key={`${item.notification_id || index}-${index}`}
                                    href={getRowHref(item)}
                                    onClick={() => onRowClick(item)}
                                    className={`px-4 py-2 flex flex-col transition-all relative cursor-pointer hover:bg-gray-50 ${!item.is_read ? "bg-warningBgLight border-[#ddd]" : "bg-white border-[#ddd]"
                                        }`}
                                >
                                    {/* Header Row: Title & Remove */}
                                    <div className="flex justify-between items-start gap-4">
                                        <h3 className={`text-[15px] leading-snug ltr:pr-6 rtl:pl-6 ${!item.is_read ? "font-bold text-black" : "font-bold text-black/80"}`}>
                                            {translateNotification(item.title)}
                                        </h3>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                removeNotification(item.notification_id, item.is_read);
                                            }}
                                            disabled={deletingIds.includes(item.notification_id)}
                                            className="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-black hover:text-white text-black rounded-full transition-all flex-shrink-0 disabled:opacity-50 border border-border"
                                            aria-label="Remove notification"
                                        >
                                            <X size={12} strokeWidth={3} className={deletingIds.includes(item.notification_id) ? "opacity-30" : ""} />
                                        </button>
                                    </div>

                                    {/* Message */}
                                    <p className={`text-body leading-relaxed ${!item.is_read ? "text-black/80 font-medium" : "text-black/60"
                                        }`}>
                                        {translateNotification(item.description)}
                                    </p>

                                    {/* Footer: Date & Mark as Read */}
                                    <div className="flex justify-between items-center">
                                        <p className="text-label text-black/50 font-bold uppercase tracking-widest">
                                            {isRtl ? formatNotificationDate(item.date_added || item.date_added_formatted) : item.date_added_formatted}
                                        </p>

                                        {!item.is_read && (
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    markAsRead(item.notification_id);
                                                }}
                                                className="text-caption font-bold uppercase tracking-widest pointer-events-auto text-primary hover:text-black transition-colors mt-2"
                                            >
                                                {t("notifications.markRead")}
                                            </button>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Section */}
                <div className="p-6 bg-white border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.04)] z-10 sticky bottom-0">
                    <Link
                        href={lp("/customer/notifications")}
                        onClick={onClose}
                        className="w-full h-[55px] bg-primary hover:bg-black text-black hover:text-white font-bold rounded-sm transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl uppercase tracking-[0.2em] text-body-sm"
                    >
                        {t("common.view")} {t("nav.notifications")}
                    </Link>
                </div>
            </div>
        </Drawer>
    );
}

function BellIcon() {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22ZM18 16V11C18 7.93 16.37 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.63 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16Z" />
        </svg>
    )
}
