"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api/api-client";

/**
 * Permission code from the kleverSubaccountPermissions API that controls ordering access.
 * To verify: log in as a master company account, open DevTools → Network, and inspect
 * the response from /api/kleverapi/subaccount-permissions. Find the entry whose label
 * matches "Can Place Orders" / "Can Checkout" / "Allow Ordering" and copy its `code`.
 */
const ORDERING_PERMISSION_CODE = "account_checkout_permission";

let _canOrderCache: {
  value: boolean;
  resolvedAt: number;
  userType: string;
  subAccountId: string | null;
} | null = null;
let _canOrderInflight: Promise<boolean> | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000;

async function resolveCanOrder(): Promise<boolean> {
  // Read session identity synchronously — cheap localStorage reads.
  let currentUserType = "";
  let currentSubAccountId: string | null = null;
  try {
    const cached = localStorage.getItem("sidebar_cache_v2");
    if (cached) currentUserType = JSON.parse(cached)?.user_type ?? "";
    currentSubAccountId = localStorage.getItem("subAccountId");
  } catch { }

  // Invalidate cache whenever the session identity changes (e.g. sub-account switch).
  if (
    _canOrderCache &&
    (_canOrderCache.userType !== currentUserType ||
      _canOrderCache.subAccountId !== currentSubAccountId)
  ) {
    console.log(
      "[useCanOrder] session identity changed — clearing cache. prev userType:",
      _canOrderCache.userType,
      "→ now:",
      currentUserType
    );
    _canOrderCache = null;
  }

  if (_canOrderCache && Date.now() - _canOrderCache.resolvedAt < CACHE_TTL_MS) {
    console.log("[useCanOrder] cache hit — canOrder:", _canOrderCache.value, "userType:", _canOrderCache.userType);
    return _canOrderCache.value;
  }

  if (_canOrderInflight) return _canOrderInflight;

  _canOrderInflight = (async (): Promise<boolean> => {
    try {
      let userType = currentUserType;

      if (!userType) {
        const sidebarData = await api.get("/kleverapi/account-sidebar").catch(() => null);
        userType = sidebarData?.user_type ?? "";
      }

      console.log("[useCanOrder] userType:", userType);

      // Customer & Master Company can always order.
      const normalizedUserType = userType.toLowerCase().trim();

      if (
        normalizedUserType === "customer" ||
        normalizedUserType === "master company"
      ) {
        console.log("[useCanOrder] customer/master → canOrder: true");
        _canOrderCache = {
          value: true,
          resolvedAt: Date.now(),
          userType,
          subAccountId: currentSubAccountId,
        };
        return true;
      }

      // Unknown/Sales users are denied by default.
      if (normalizedUserType !== "subaccount") {
        console.log("[useCanOrder] unsupported/sales userType → canOrder: false", userType);
        _canOrderCache = {
          value: false,
          resolvedAt: Date.now(),
          userType,
          subAccountId: currentSubAccountId,
        };
        return false;
      }

      // Subaccount permission check continues below.

      const subAccountId = currentSubAccountId;
      console.log("[useCanOrder] subAccountId:", subAccountId);

      if (!subAccountId) {
        console.log("[useCanOrder] no subAccountId → canOrder: false");
        _canOrderCache = { value: false, resolvedAt: Date.now(), userType, subAccountId: null };
        return false;
      }

      const [permDefs, subAccount] = await Promise.all([
        api.get("/kleverapi/subaccount-permissions").catch(() => []),
        api.get(`/kleverapi/subaccounts/${subAccountId}`).catch(() => null),
      ]);

      console.log("[useCanOrder] all permission definitions:", JSON.stringify(permDefs));
      console.log("[useCanOrder] subAccount.permissions:", JSON.stringify(subAccount?.permissions));

      const orderPermDef = Array.isArray(permDefs)
        ? permDefs.find((p: any) => p.code === ORDERING_PERMISSION_CODE)
        : null;

      console.log("[useCanOrder] ORDERING_PERMISSION_CODE:", ORDERING_PERMISSION_CODE);
      console.log("[useCanOrder] matched orderPermDef:", JSON.stringify(orderPermDef));

      if (!orderPermDef) {
        // Fail-closed: permission code not found → deny ordering for subaccounts.
        // Update ORDERING_PERMISSION_CODE on line 12 with the correct code from the logs above.
        console.warn(
          "[useCanOrder] ordering permission code not found in API — denying. Available codes:",
          Array.isArray(permDefs) ? permDefs.map((p: any) => p.code) : permDefs
        );
        _canOrderCache = { value: false, resolvedAt: Date.now(), userType, subAccountId };
        return false;
      }

      const granted: (number | string)[] = subAccount?.permissions ?? [];
      const permValue = Number(orderPermDef.value);

      const hasPermission =
        granted.length === 1
          ? (Number(granted[0]) & permValue) !== 0
          : granted.some((v) => Number(v) === permValue);

      console.log("[useCanOrder] granted:", granted, "permValue:", permValue, "hasPermission:", hasPermission);
      console.log("[useCanOrder] final canOrder:", hasPermission);

      _canOrderCache = { value: hasPermission, resolvedAt: Date.now(), userType, subAccountId };
      return hasPermission;
    } catch (err) {
      // Fail-closed: any unexpected error during the permission check denies ordering.
      console.error("[useCanOrder] unexpected error — denying canOrder:", err);
      _canOrderCache = { value: false, resolvedAt: Date.now(), userType: currentUserType, subAccountId: currentSubAccountId };
      return false;
    } finally {
      _canOrderInflight = null;
    }
  })();

  return _canOrderInflight;
}

/** Call on logout to ensure the next user's permissions are re-checked. */
export function clearCanOrderCache() {
  _canOrderCache = null;
}

/**
 * Returns whether the current user has ordering/cart permission.
 * - Regular (B2C) customers: always `true`
 * - Master company accounts: always `true`
 * - Subaccounts: checked against `ORDERING_PERMISSION_CODE` in kleverSubaccountPermissions
 */
export function useCanOrder(): { canOrder: boolean; orderPermLoading: boolean } {
  const [canOrder, setCanOrder] = useState(false);
  const [orderPermLoading, setOrderPermLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      setOrderPermLoading(false);
      return;
    }
    resolveCanOrder()
      .then(setCanOrder)
      .catch(() => setCanOrder(false))
      .finally(() => setOrderPermLoading(false));
  }, []);

  return { canOrder, orderPermLoading };
}
