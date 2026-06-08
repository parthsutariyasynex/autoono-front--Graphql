import { NextRequest, NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { getLocaleFromRequest } from "@/lib/api/magento-url";
import { KLEVER_DISCOUNT_POPUP_QUERY } from "@/src/graphql/queries";
import type { KleverDiscountPopupData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

// kleverDiscountPopup relies on the customer's shopping cart. The cart is
// always bound to the BASE locale store ("en"/"ar"), not to a warehouse
// store view (V101_en, V202_en, …). Sending Store: V101_en causes a PHP
// null-pointer exception on the Magento side ("getAllVisibleItems() on null")
// because the module can't find the cart in the warehouse store context.
function toBaseLocale(storeCode: string): string {
  const m = storeCode.match(/_(en|ar)$/i);
  return m ? m[1].toLowerCase() : storeCode;
}

const EMPTY_POPUP = {
  applied_coupons: [],
  promo_rules: [],
  common_qty: null,
  selection_method: null,
  gifts_counter_enabled: false,
  auto_open_popup: false,
  total_discount: 0,
  subtotal: 0,
  grand_total: 0,
  currency_code: null,
};

export async function GET(request: NextRequest) {
  // ── DEBUG: full request info ─────────────────────────────────────────────
  console.log("[discount-popup] incoming url:", request.url);
  console.log("[discount-popup] x-store-code header:", request.headers.get("x-store-code"));
  console.log("[discount-popup] store header:", request.headers.get("store"));

  // ── [gift-check] diagnostic logs ─────────────────────────────────────────
  console.log("[gift-check] incoming x-store-code:", request.headers.get("x-store-code"));
  console.log("[gift-check] cookie NEXT_STORE:", request.cookies.get("NEXT_STORE")?.value);
  console.log("[gift-check] cookie NEXT_LOCALE:", request.cookies.get("NEXT_LOCALE")?.value);
  console.log("[gift-check] ?store param:", new URL(request.url).searchParams.get("store"));

  const token = await getRequestToken(request);
  console.log("[discount-popup] token exists:", !!token);

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawStore =
    searchParams.get("store") ||
    searchParams.get("storeCode") ||
    request.headers.get("x-store-code") ||
    getLocaleFromRequest(request);

  // const effectiveStore = toBaseLocale(rawStore);
  const effectiveStore = rawStore;
  console.log("[discount-popup] raw store:", rawStore, "→ effective:", effectiveStore);
  console.log("[gift-check] final Magento Store header:", effectiveStore, "(raw was:", rawStore + ")");

  // ── Fetch raw from Magento (bypass graphqlFetch so we can log everything) ─
  const MAGENTO_URL =
    process.env.MAGENTO_GRAPHQL_URL ||
    (process.env.NEXT_PUBLIC_MAGENTO_BASE_URL
      ? `${process.env.NEXT_PUBLIC_MAGENTO_BASE_URL}/graphql`
      : null);

  if (!MAGENTO_URL) {
    console.error("[discount-popup] No MAGENTO_GRAPHQL_URL configured");
    return NextResponse.json(EMPTY_POPUP);
  }

  try {
    const gqlRes = await fetch(MAGENTO_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        Store: effectiveStore,
      },
      body: JSON.stringify({ query: KLEVER_DISCOUNT_POPUP_QUERY }),
      cache: "no-store",
    });

    const rawText = await gqlRes.text();
    console.log("[discount-popup] Magento HTTP status:", gqlRes.status);
    console.log("[discount-popup] Magento raw response:", rawText.slice(0, 2000));

    let payload: any;
    try {
      payload = JSON.parse(rawText);
    } catch {
      console.error("[discount-popup] Failed to parse Magento JSON:", rawText.slice(0, 500));
      return NextResponse.json(EMPTY_POPUP);
    }

    if (payload.errors?.length) {
      console.error("[discount-popup] GraphQL errors:", JSON.stringify(payload.errors));
    }

    const popup = payload?.data?.kleverDiscountPopup;
    console.log("[discount-popup] kleverDiscountPopup:", JSON.stringify(popup).slice(0, 1000));

    // ── [gift-check] response summary ─────────────────────────────────────
    console.log("[gift-check] promo_rules:", Array.isArray(popup?.promo_rules) ? popup.promo_rules.length : popup?.promo_rules);
    console.log("[gift-check] auto_open_popup:", popup?.auto_open_popup);
    console.log("[gift-check] subtotal:", popup?.subtotal);
    console.log("[gift-check] GraphQL URL:", process.env.MAGENTO_GRAPHQL_URL || (process.env.NEXT_PUBLIC_MAGENTO_BASE_URL ? `${process.env.NEXT_PUBLIC_MAGENTO_BASE_URL}/graphql` : "NOT SET"));

    return NextResponse.json(popup ?? EMPTY_POPUP);
  } catch (error) {
    console.error("[discount-popup] fetch error:", error);
    return NextResponse.json(EMPTY_POPUP);
  }
}
