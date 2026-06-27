"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { NotificationItem } from "../types";
import toast from "react-hot-toast";
import { useTranslation } from "@/hooks/useTranslation";

// Module-level dedup: NextAuth re-polling the session can recreate
// `fetchNotifications` (sessionToken dep) and re-fire Navbar's
// `useEffect(() => pullNotifications(), [pullNotifications])` —
// causing duplicate calls within seconds. Block refetches inside this
// window unless a caller passes `force=true` (used after mark-as-read /
// remove). Tracked per session token so a fresh login resets the clock.
let _lastNotifFetchAt = 0;
let _lastNotifFetchToken: string | undefined;
const NOTIF_MIN_INTERVAL_MS = 60_000;

export function useNotifications() {
    const { data: session } = useSession();
    const { t, isRtl } = useTranslation();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [hasFetchedNotifications, setHasFetchedNotifications] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [deletingIds, setDeletingIds] = useState<number[]>([]);

    // Stable string dep — prevents useCallback from getting a new reference
    // every time NextAuth silently re-polls and recreates the session object.
    const sessionToken = (session as any)?.accessToken as string | undefined;

    // Inflight guard: prevents concurrent fetch calls (e.g. StrictMode double-mount)
    const fetchingRef = useRef(false);

    useEffect(() => {
        setHasFetchedNotifications(false);
    }, [sessionToken]);

    const fetchNotifications = useCallback(async (pageSize = 15, currentPage = 1, force = false) => {
        const token = sessionToken;
        if (!token) return;
        if (fetchingRef.current) return;
        // TTL dedup — skip if we fetched recently for the same token.
        // Reset whenever token changes (fresh login / impersonation switch).
        if (
            !force &&
            _lastNotifFetchToken === token &&
            Date.now() - _lastNotifFetchAt < NOTIF_MIN_INTERVAL_MS
        ) {
            return;
        }
        fetchingRef.current = true;

        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/kleverapi/notifications?pageSize=${pageSize}&currentPage=${currentPage}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.status === 401) {
                console.warn("[useNotifications] Received 401, signing out...");
                const { signOut } = await import("next-auth/react");
                const locale = typeof window !== "undefined" && window.location.pathname.startsWith("/ar") ? "ar" : "en";
                await signOut({ redirect: false });
                window.location.href = `/${locale}/login`;
                return;
            }

            if (!response.ok) {
                const errBody = await response.json().catch(() => null);
                console.error("[useNotifications] fetch failed:", response.status, errBody);
                setError(`Notifications fetch failed (${response.status})`);
                return;
            }

            const data: any = await response.json();

            // Robustly check for the list of notifications
            const items = Array.isArray(data) ? data
                : data.items || data.notifications || data.data || [];
            // Normalize items to ensure notification_id and is_read are always present
            const normalizedItems = items.map((item: any) => ({
                ...item,
                notification_id: item.notification_id ?? item.id ?? item.entity_id,
                is_read: !!(item.is_read ?? item.isRead ?? false),
                date_added: item.date_added ?? "",
                date_added_formatted: item.date_added_formatted ?? "",
            }));

            setNotifications(normalizedItems);
            setUnreadCount(data.unread_count ?? data.unreadCount ?? 0);
            setTotalCount(data.total_count ?? data.totalCount ?? normalizedItems.length);
            _lastNotifFetchAt = Date.now();
            _lastNotifFetchToken = token;
        } catch (err) {
            console.error("[useNotifications] network error:", err);
        } finally {
            setIsLoading(false);
            setHasFetchedNotifications(true);
            fetchingRef.current = false;
        }
    }, [sessionToken]);

    const markAsRead = useCallback(async (notificationId: number) => {
        const token = sessionToken;
        if (!token) return false;

        try {
            const response = await fetch(`/api/kleverapi/notifications/${notificationId}/read`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            const resData = await response.json().catch(() => null);
            console.log("[markAsRead] ID:", notificationId, "Status:", response.status, "Response:", resData);

            if (response.ok) {
                // Update local state and decrease unread count in one pass
                setNotifications(prev => {
                    const item = prev.find(i => i.notification_id === notificationId);
                    if (item && !item.is_read) {
                        setUnreadCount(count => Math.max(0, count - 1));
                    }
                    return prev.map(item =>
                        item.notification_id === notificationId
                            ? { ...item, is_read: true }
                            : item
                    );
                });

                // Sync navbar bell icon
                window.dispatchEvent(new CustomEvent("notifications-updated"));
                // Prefer the translated string in AR mode; the backend
                // message comes back in English regardless of locale.
                toast.success(isRtl ? t("notifications.markedAsRead") : (resData?.message || t("notifications.markedAsRead")));
                return true;
            } else {
                console.warn("[markAsRead] Failed for ID:", notificationId, resData);
                toast.error(isRtl ? t("notifications.markReadFailed") : (resData?.message || t("notifications.markReadFailed")));
            }
        } catch (err) {
            console.error("Error marking notification as read:", err);
            toast.error(t("notifications.errorOccurred"));
        }
        return false;
    }, [sessionToken, t, isRtl]);

    const removeNotification = useCallback(async (notificationId: number, isRead: boolean) => {
        const token = sessionToken;
        if (!token) return;

        setDeletingIds(prev => [...prev, notificationId]);

        try {
            // Mark as read first if it's currently unread (backend might require it)
            if (!isRead) {
                await markAsRead(notificationId);
            }

            // Call the remove API on the server
            const response = await fetch(`/api/kleverapi/notifications/${notificationId}/remove`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            const resData = await response.json().catch(() => null);
            console.log("[removeNotification] ID:", notificationId, "Status:", response.status, "Response:", resData);

            if (response.ok) {
                // Immediately remove from UI
                setNotifications(prev => prev.filter(item => item.notification_id !== notificationId));
                setTotalCount(count => Math.max(0, count - 1));

                // Sync navbar bell icon
                window.dispatchEvent(new CustomEvent("notifications-updated"));
                toast.success(isRtl ? t("notifications.deleted") : (resData?.message || t("notifications.deleted")));
            } else {
                console.warn("Server-side removal failed for notification:", notificationId, resData);
                toast.error(isRtl ? t("notifications.deleteFailed") : (resData?.message || t("notifications.deleteFailed")));
            }
        } catch (err) {
            console.error("Error removing notification:", err);
            toast.error(t("notifications.errorDuringDeletion"));
        } finally {
            setDeletingIds(prev => prev.filter(id => id !== notificationId));
        }
    }, [sessionToken, markAsRead, t, isRtl]);

    return {
        notifications,
        unreadCount,
        totalCount,
        isLoading,
        hasFetchedNotifications,
        error,
        deletingIds,
        fetchNotifications,
        markAsRead,
        removeNotification
    };
}
