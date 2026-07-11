import { NextRequest, NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { getLocaleFromRequest } from "@/lib/api/magento-url";
import { KLEVER_ADD_PROMO_ITEMS_MUTATION } from "@/src/graphql/mutations";
import type { KleverAddPromoItemsData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/lib/graphqlFetch";

function toPromoItems(raw: unknown): Array<{ sku: string; ruleId: number; qty: number }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const r = (item ?? {}) as Record<string, unknown>;
      const sku = typeof r.sku === "string" ? r.sku : "";
      const ruleId = Number(r.ruleId ?? r.rule_id ?? r.ruleID ?? 0);
      const qty = Number(r.qty ?? r.quantity ?? 1);
      if (!sku || !ruleId) return null;
      return { sku, ruleId, qty };
    })
    .filter((v): v is { sku: string; ruleId: number; qty: number } => v !== null);
}

export async function POST(request: NextRequest) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const items = toPromoItems(body.items);
    if (items.length === 0) {
      return NextResponse.json({ message: "items[] is required (sku + ruleId)" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const storeCode =
      searchParams.get("store") ||
      request.headers.get("x-store-code") ||
      getLocaleFromRequest(request);

    const data = await graphqlFetch<KleverAddPromoItemsData>({
      query: KLEVER_ADD_PROMO_ITEMS_MUTATION,
      variables: { items },
      token,
      store: storeCode,
      cache: "no-store",
    });

    return NextResponse.json(data.kleverAddPromoItems);
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
