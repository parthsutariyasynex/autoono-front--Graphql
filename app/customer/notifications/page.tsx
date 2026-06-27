"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useNotifications } from "@/modules/notifications/hooks/useNotifications";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { accountSidebarMenu } from "@/components/account-sidebar-menu";
import { redirectToLogin } from "@/utils/helpers";
import PortalDropdown from "@/components/PortalDropdown";
import { useTranslation } from "@/hooks/useTranslation";
import { useLocalePath } from "@/hooks/useLocalePath";
import { useLocale } from "@/lib/i18n/client";
import Sidebar from "@/components/Sidebar";

/**
 * Translate notification text from English to Arabic.
 * Handles patterns like:
 *   "New Order# BT00028701" → "طلب جديد رقم BT00028701"
 *   "New Order# BT00028701 placed successfully" → "تم عمل الطلب رقم BT00028701 بنجاح"
 */
function translateNotificationText(text: string, locale: string): string {
    if (locale !== "ar" || !text) return text;

    // Any order-number token like BT00028701 or AUT0000091
    const ORDER_RE = /([A-Z]{2,}\d+)/i;

    // "New Order# XXXXX placed successfully"
    const placedMatch = text.match(/^New Order#?\s*([A-Z0-9]+)\s*placed successfully$/i);
    if (placedMatch) return `تم عمل الطلب رقم ${placedMatch[1]} بنجاح`;

    // "New Order# XXXXX"
    const orderMatch = text.match(/^New Order#?\s*([A-Z0-9]+)$/i);
    if (orderMatch) return `طلب جديد رقم ${orderMatch[1]}`;

    // "Order# XXXXX has been shipped"
    const shippedMatch = text.match(/^Order#?\s*([A-Z0-9]+)\s*has been shipped$/i);
    if (shippedMatch) return `تم شحن الطلب رقم ${shippedMatch[1]}`;

    // "Order# XXXXX has been invoiced"
    const invoicedMatch = text.match(/^Order#?\s*([A-Z0-9]+)\s*has been invoiced$/i);
    if (invoicedMatch) return `تمت فوترة الطلب رقم ${invoicedMatch[1]}`;

    // "Order# XXXXX has been canceled / cancelled"
    const canceledMatch = text.match(/^Order#?\s*([A-Z0-9]+)\s*has been cancel/i);
    if (canceledMatch) return `تم إلغاء الطلب رقم ${canceledMatch[1]}`;

    // "Order# XXXXX has been delivered"
    const deliveredMatch = text.match(/^Order#?\s*([A-Z0-9]+)\s*has been delivered$/i);
    if (deliveredMatch) return `تم تسليم الطلب رقم ${deliveredMatch[1]}`;

    // "Order# XXXXX has been confirmed / approved"
    const confirmedMatch = text.match(/^Order#?\s*([A-Z0-9]+)\s*has been (confirmed|approved)$/i);
    if (confirmedMatch) return `تم تأكيد الطلب رقم ${confirmedMatch[1]}`;

    // "Order# XXXXX has been completed"
    const completedMatch = text.match(/^Order#?\s*([A-Z0-9]+)\s*has been completed$/i);
    if (completedMatch) return `تم إكمال الطلب رقم ${completedMatch[1]}`;

    // "Order# XXXXX is pending"
    const pendingMatch = text.match(/^Order#?\s*([A-Z0-9]+)\s*is pending$/i);
    if (pendingMatch) return `الطلب رقم ${pendingMatch[1]} قيد الانتظار`;

    // "Order# XXXXX status changed to YYY"
    const statusMatch = text.match(/^Order#?\s*([A-Z0-9]+)\s*status changed to\s*(.+)$/i);
    if (statusMatch) return `تم تغيير حالة الطلب رقم ${statusMatch[1]} إلى ${statusMatch[2]}`;

    // "Payment received for Order# XXXXX"
    const paymentMatch = text.match(/^Payment received for Order#?\s*([A-Z0-9]+)$/i);
    if (paymentMatch) return `تم استلام دفعة للطلب رقم ${paymentMatch[1]}`;

    return text;
}

function formatDate(dateStr: string, locale: string): string {
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return new Intl.DateTimeFormat("en-US", {
            year: "numeric", month: "short", day: "numeric",
            hour: "2-digit", minute: "2-digit", hour12: true,
        }).format(date);
    } catch {
        return dateStr;
    }
}

export default function NotificationsPage() {
    const router = useRouter();
    const { t, isRtl } = useTranslation();
    const lp = useLocalePath();
    const locale = useLocale();
    const { status } = useSession();
    const {
        notifications,
        isLoading,
        hasFetchedNotifications,
        fetchNotifications,
        markAsRead,
        removeNotification,
        totalCount,
        deletingIds
    } = useNotifications();

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    useEffect(() => {
        if (status === "unauthenticated") {
            redirectToLogin(router);
            return;
        }
        if (status === "authenticated") {
            fetchNotifications(pageSize, currentPage);
        }
    }, [status, router, fetchNotifications, pageSize, currentPage]);

    const handleNotificationClick = async (item: any) => {
        if (!item.is_read) {
            await markAsRead(item.notification_id);
        }
    };

    // Extract numeric order ID from URL like "/sales/order/view/order_id/28707"
    // The API needs numeric entity_id, not increment_id like "BT00028707"
    const getOrderLink = (item: any): string | null => {
        const url = item.url || "";
        const urlMatch = url.match(/order_id\/(\d+)/);
        if (urlMatch) return lp(`/my-orders/${urlMatch[1]}`);
        return null;
    };

    const handleLogout = async () => {
        await signOut({ redirect: false });
        window.location.href = lp("/login");
    };

    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    const pageNumbers = Array.from({ length: Math.min(6, totalPages) }, (_, i) => i + 1);
    const isNotificationsLoading = isLoading || !hasFetchedNotifications;

    return (
        <>


            <div className="w-full">
                <div className="flex flex-col lg:flex-row gap-0">
                    {/* SIDEBAR */}
                    <Sidebar />

                    {/* MAIN CONTENT */}
                    <main className="flex-1 min-w-0 px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-5">
                        <h1 className="text-h3 sm:text-h3 md:text-[26px] font-bold text-black mb-5 uppercase tracking-wide">
                            {t('notifications.title')}
                        </h1>

                        <div className="overflow-hidden">
                            {/* Desktop Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-body text-left border-collapse border border-[#ddd]">
                                    <thead>
                                        <tr className="bg-primary text-label uppercase font-bold tracking-widest">
                                            <th className="px-2 xl:px-4 py-2 border border-warning/30 text-body font-bold text-black uppercase text-center w-[14%]">{t('common.date')}</th>
                                            <th className="px-2 xl:px-4 py-2 border border-warning/30 text-body font-bold text-black uppercase text-center w-[18%]">{t('m.title')}</th>
                                            <th className="px-2 xl:px-4 py-2 border border-warning/30 text-body font-bold text-black uppercase text-center w-[40%]">{t('m.message')}</th>
                                            <th className="px-2 xl:px-4 py-2 border border-warning/30 text-body font-bold text-black uppercase text-center w-[28%]">{t('common.action')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white">
                                        {isNotificationsLoading ? (
                                            <>
                                                {Array.from({ length: 6 }).map((_, i) => (
                                                    <tr key={i} className="border-b border-border animate-pulse">
                                                        <td className="px-2 xl:px-4 py-2 border-r border-border"><div className="h-4 bg-gray-200 rounded w-24 mx-auto" /></td>
                                                        <td className="px-2 xl:px-4 py-2 border-r border-border"><div className="h-4 bg-gray-200 rounded w-32 mx-auto" /></td>
                                                        <td className="px-2 xl:px-4 py-2 border-r border-border"><div className="h-4 bg-gray-200 rounded w-full" /></td>
                                                        <td className="px-2 xl:px-4 py-2"><div className="h-4 bg-gray-200 rounded w-20 mx-auto" /></td>
                                                    </tr>
                                                ))}
                                            </>
                                        ) : notifications && notifications.length > 0 ? (
                                            notifications.map((item, index) => (
                                                <tr
                                                    key={`${item.notification_id || index}-${index}`}
                                                    className={`border-b border-border last:border-0 transition-colors ${!item.is_read ? "bg-warningBgLight" : "bg-white"}`}
                                                >
                                                    <td className="px-2 xl:px-4 py-1.5 border-r border-gray-200 text-body-lg text-black border-border align-middle relative">
                                                        {/* {!item.is_read && (
                                                            <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full shadow-sm"></div>
                                                        )} */}
                                                        {formatDate(item.date_added_formatted, locale)}
                                                    </td>
                                                    <td className={`px-2 xl:px-4 py-1.5 border-r border-gray-200 text-body-lg text-center align-middle ${!item.is_read ? "font-medium text-black" : "font-normal text-black/70"}`}>
                                                        {getOrderLink(item) ? (
                                                            <Link href={getOrderLink(item)!} className="hover:text-primary transition-colors cursor-pointer underline-offset-2 hover:underline">
                                                                {translateNotificationText(item.title, locale)}
                                                            </Link>
                                                        ) : translateNotificationText(item.title, locale)}
                                                    </td>
                                                    <td className={`px-2 xl:px-4 py-1.5 border-r border-gray-200 text-body-lg text-center leading-relaxed align-middle ${!item.is_read ? "font-medium text-black" : "text-black/70"}`}>
                                                        {translateNotificationText(item.description, locale)}
                                                    </td>
                                                    <td className="px-2 xl:px-4 py-1.5 border-r border-gray-200 text-body text-center align-middle">
                                                        {/* Buttons:
                                                              md  (no sidebar) → side-by-side, plenty of room
                                                              lg  (sidebar 256px → tight main) → stack vertically
                                                              xl+ (sidebar + wide main)         → side-by-side again */}
                                                        <div className="flex flex-row lg:flex-col xl:flex-row items-center justify-center gap-2 lg:gap-1.5 xl:gap-2 text-black">
                                                            {!item.is_read && (
                                                                <>
                                                                    <button onClick={(e) => { e.stopPropagation(); markAsRead(item.notification_id); }} className="hover:text-primary transition-colors font-medium whitespace-nowrap">{t('m.mark-as-read')}</button>
                                                                    <span className="inline lg:hidden xl:inline text-black/30">|</span>
                                                                </>
                                                            )}
                                                            <button onClick={(e) => { e.stopPropagation(); removeNotification(item.notification_id, item.is_read); }} disabled={deletingIds.includes(item.notification_id)} className="hover:text-primary cursor-pointer transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
                                                                {deletingIds.includes(item.notification_id) ? t('common.loading') : t('m.remove')}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="py-24 text-center text-black/60 text-body-lg">{t('notifications.empty')}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card List */}
                            <div className="md:hidden">
                                {isNotificationsLoading ? (
                                    <div className="space-y-0 animate-pulse">
                                        {Array.from({ length: 6 }).map((_, i) => (
                                            <div key={i} className="bg-white p-3 rounded-sm border border-[#ddd] mb-3 flex flex-col gap-2">
                                                <div className="h-4 bg-gray-200 rounded w-24" />
                                                <div className="h-4 bg-gray-200 rounded w-3/4" />
                                                <div className="h-3 bg-gray-200 rounded w-full" />
                                            </div>
                                        ))}
                                    </div>
                                ) : notifications && notifications.length > 0 ? (
                                    notifications.map((item, index) => (
                                        <div
                                            key={`mobile-${item.notification_id || index}-${index}`}
                                            className={`bg-white p-3 rounded-sm border border-[#ddd] mb-3 overflow-visible ${!item.is_read ? "bg-warningBgLight" : "bg-white"}`}
                                        >
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <div className="flex items-center gap-2">
                                                    {!item.is_read && <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1"></div>}
                                                    {getOrderLink(item) ? (
                                                        <Link href={getOrderLink(item)!} className={`text-body hover:text-primary transition-colors hover:underline ${!item.is_read ? "font-bold text-black" : "font-normal text-black/70"}`}>
                                                            {translateNotificationText(item.title, locale)}
                                                        </Link>
                                                    ) : (
                                                        <span className={`text-body ${!item.is_read ? "font-bold text-black" : "font-normal text-black/70"}`}>{translateNotificationText(item.title, locale)}</span>
                                                    )}
                                                </div>
                                                <span className="text-label text-black/50 flex-shrink-0">{formatDate(item.date_added_formatted, locale)}</span>
                                            </div>
                                            <p className={`text-body-sm leading-relaxed mb-3 ${!item.is_read ? "font-medium text-black" : "text-black/70"}`}>
                                                {translateNotificationText(item.description, locale)}
                                            </p>
                                            <div className="flex items-center gap-3 text-label font-bold text-black">
                                                {!item.is_read && (
                                                    <>
                                                        <button onClick={(e) => { e.stopPropagation(); markAsRead(item.notification_id); }} className="hover:text-primary transition-colors">{t('m.mark-as-read')}</button>
                                                        <span className="text-black/30">|</span>
                                                    </>
                                                )}
                                                <button onClick={(e) => { e.stopPropagation(); removeNotification(item.notification_id, item.is_read); }} disabled={deletingIds.includes(item.notification_id)} className="hover:text-primary transition-colors disabled:opacity-50">
                                                    {deletingIds.includes(item.notification_id) ? t('common.loading') : t('m.remove')}
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-16 text-center text-black/60 text-body">{t('notifications.empty')}</div>
                                )}
                            </div>

                            {/* PAGINATION PANEL — stay stacked until lg so the 3 sections
                                (count text + page buttons + page-size selector) don't crowd
                                each other on tablet widths next to the account sidebar. */}
                            <div className="bg-borderFaint px-4 md:px-6 py-4 flex flex-col lg:flex-row items-center justify-between gap-4 md:gap-6 border-t border-gray-200">
                                <div className="text-body text-black font-medium order-2 lg:order-1">
                                    {t('favorites.items')} <bdi dir="ltr">{((currentPage - 1) * pageSize) + 1} {t('m.to')} {Math.min(currentPage * pageSize, totalCount)}</bdi> {t('favorites.of')} <bdi dir="ltr">{totalCount}</bdi> {t('favorites.total')}
                                </div>

                                <div className="flex items-center gap-3 order-1 lg:order-2">
                                    {currentPage > 1 && (
                                        <button
                                            onClick={() => setCurrentPage(currentPage - 1)}
                                            className="w-10 h-10 flex items-center justify-center text-black/70 hover:text-black hover:bg-white/50 rounded-full transition-all border border-transparent hover:border-gray-200"
                                        >
                                            {isRtl ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                                        </button>
                                    )}
                                    <div className="flex gap-2">
                                        {pageNumbers.map((num) => (
                                            <button
                                                key={num}
                                                onClick={() => setCurrentPage(num)}
                                                className={`w-10 h-10 flex items-center justify-center text-body-lg font-bold rounded-full border transition-all ${currentPage === num
                                                    ? "bg-primary border-primary text-white shadow-md transform scale-105"
                                                    : "bg-white border-gray-200 text-black hover:border-primary hover:text-primary"
                                                    }`}
                                            >
                                                {num}
                                            </button>
                                        ))}
                                    </div>
                                    {currentPage < totalPages && (
                                        <button
                                            onClick={() => setCurrentPage(currentPage + 1)}
                                            className="w-10 h-10 flex items-center justify-center text-black/70 hover:text-black hover:bg-white/50 rounded-full transition-all border border-transparent hover:border-gray-200"
                                        >
                                            {isRtl ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center gap-3 text-body text-black font-medium order-3">
                                    <span>{t('favorites.show')}</span>
                                    <PortalDropdown
                                        value={String(pageSize)}
                                        onChange={(val) => { setPageSize(Number(val)); setCurrentPage(1); }}
                                        options={[{ label: "15", value: "15" }, { label: "30", value: "30" }, { label: "50", value: "50" }]}
                                    />
                                    <span>{t('common.perPage')}</span>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>

        </>
    );
}
