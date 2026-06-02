import { NextRequest, NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { getLocaleFromRequest } from "@/lib/api/magento-url";
import { KLEVER_DISCOUNT_POPUP_QUERY } from "@/src/graphql/queries";
import type { KleverDiscountPopupData } from "@/src/graphql/types";
import { graphqlFetch } from "@/src/lib/graphqlFetch";

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
  const token = await getRequestToken(request);
  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const storeCode =
    searchParams.get("store") ||
    searchParams.get("storeCode") ||
    request.headers.get("x-store-code") ||
    getLocaleFromRequest(request);

  try {
    console.log("[discount-popup] Fetching popup data for store:", storeCode);
    const data = await graphqlFetch<KleverDiscountPopupData>({
      query: KLEVER_DISCOUNT_POPUP_QUERY,
      token,
      store: storeCode,
      cache: "no-store",
    });
    return NextResponse.json(data.kleverDiscountPopup ?? EMPTY_POPUP);
  } catch (error) {
    // kleverDiscountPopup currently has a backend PHP null-pointer bug
    // (`getAllVisibleItems() on null`). Fail soft so the gift widget stays hidden
    // and doesn't propagate 500s to the browser console. Silence the warning
    // for that specific known defect; keep it loud for anything else so a new
    // backend issue surfaces immediately.
    const msg = String((error as { message?: unknown })?.message ?? "");
    if (!msg.includes("getAllVisibleItems")) {
      console.warn("[discount-popup] GraphQL failed, serving empty popup:", error);
    }
    return NextResponse.json(EMPTY_POPUP);
  }
}
