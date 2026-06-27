import { signOut } from "next-auth/react";
import { invalidateSessionCache } from "@/lib/sessionCache";
import { invalidateTokenCache } from "@/lib/api/api-client";
import { invalidateAxiosTokenCache } from "@/store/axiosHelper";
import { clearCanOrderCache } from "@/hooks/useCanOrder";
import { APP_NAMESPACE, AUTH_COOKIE_NAMES } from "./constants";

/**
 * Fully wipe auth state for THIS project and sign out.
 *
 * Why we do NOT let NextAuth handle the post-signout redirect:
 * When NEXTAUTH_URL is unset, NextAuth v4 falls back to a hardcoded
 * `http://localhost:3000` as the base URL. On any other dev port (3001,
 * 3002, …) its redirect lands the user on port 3000 — a different
 * project. We call `signOut({ redirect: false })` to just clear the
 * session cookie, then navigate ourselves with `window.location.href`,
 * which always resolves against the CURRENT origin.
 *
 * Why we also clear cookies manually:
 * Browsers ignore the port for `localhost` cookies, so two projects on
 * different ports share a cookie jar. If another project left a stale
 * cookie behind (same name or a legacy default), NextAuth's own signout
 * only clears its own — we expire every plausible name. HttpOnly
 * cookies can't be touched from JS, so a server route wipes those.
 */
export const handleGlobalLogout = async (callbackUrl: string) => {
    if (typeof window !== "undefined") {
        // Bust the in-memory session + token caches immediately so no subsequent
        // api.get() call can use a stale token after the user signs out.
        invalidateSessionCache();
        invalidateTokenCache();
        invalidateAxiosTokenCache();
        clearCanOrderCache();

        try {
            localStorage.removeItem("token");
            localStorage.removeItem(`${APP_NAMESPACE}_token`);
            localStorage.removeItem("subAccountToken");
            localStorage.removeItem("isSubAccount");
            localStorage.removeItem("subAccountName");
            localStorage.removeItem("subAccountId");
            // Clear cached sidebar so the next user doesn't briefly see
            // the previous user's menu before the API responds.
            localStorage.removeItem("sidebar_cache_v1");
            sessionStorage.clear();
        } catch { }

        // Expire every non-HttpOnly cookie this project owns + legacy
        // NextAuth defaults, in case another localhost project wrote them.
        const cookiesToClear = [
            ...AUTH_COOKIE_NAMES,
            "next-auth.session-token",
            "next-auth.csrf-token",
            "next-auth.callback-url",
            "__Secure-next-auth.session-token",
            "__Host-next-auth.csrf-token",
            "autoono.session-token",
            "autoono.csrf-token",
            "autoono.callback-url",
        ];
        for (const name of cookiesToClear) {
            document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
            document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
        }

        // Clear HttpOnly cookies on the server.
        try {
            await fetch("/api/auth/clear-session", {
                method: "POST",
                credentials: "same-origin",
            });
        } catch { }

        // Clear the NextAuth session without letting it perform the
        // redirect, then navigate ourselves so we stay on the current
        // origin regardless of NEXTAUTH_URL / baseUrl quirks.
        try {
            await signOut({ redirect: false });
        } catch { }

        // `window.location.href = "/en/login"` resolves against the
        // current origin — this is what guarantees we stay on the same port.
        window.location.href = callbackUrl;
        return;
    }

    // SSR fallback (shouldn't normally run).
    await signOut({ callbackUrl });
};
