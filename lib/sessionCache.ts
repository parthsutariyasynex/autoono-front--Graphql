import { getSession } from "next-auth/react";

// Shared session cache used by api-client.ts and any other client module.
//
// WHY THIS EXISTS:
//   getSession() from next-auth/react makes an HTTP request to /api/auth/session
//   every time it is called. Multiple components mounting simultaneously (Navbar,
//   CartContext, …) each call getAuthToken() which previously each
//   called getSession() independently, producing N×HTTP requests.
//
//   This module provides ONE shared cache + inflight deduplicator so the entire
//   app makes at most ONE /api/auth/session call per 55-second window, regardless
//   of how many concurrent callers there are.

const SESSION_TTL = 55_000; // 55s — just under NextAuth's default 60s refetch interval

let _cache: { data: any; timestamp: number } | null = null;
let _inflight: Promise<any> | null = null;

/** Call on sign-in or sign-out to force the next getCachedSession() to re-fetch. */
export function invalidateSessionCache(): void {
    _cache = null;
    _inflight = null;
}

/**
 * Returns the NextAuth session, using a 55-second in-memory cache.
 * Concurrent callers that arrive while a fetch is in-flight all share
 * the same Promise — only one HTTP request is made.
 */
export async function getCachedSession(): Promise<any> {
    // Cache hit
    if (_cache && Date.now() - _cache.timestamp < SESSION_TTL) {
        return _cache.data;
    }

    // Inflight deduplication — join the existing request instead of starting a new one
    if (_inflight) return _inflight;

    _inflight = getSession()
        .then(data => {
            _cache = { data, timestamp: Date.now() };
            return data;
        })
        .catch(() => null) // don't cache errors — next caller will retry
        .finally(() => { _inflight = null; });

    return _inflight;
}
