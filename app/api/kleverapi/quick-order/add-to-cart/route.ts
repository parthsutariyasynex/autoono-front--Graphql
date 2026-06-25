import { NextRequest, NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_QUICK_ORDER_ADD_TO_CART_MUTATION } from "@/src/graphql/mutations";
import type { KleverQuickOrderAddToCartData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

function toQuickOrderItems(raw: unknown): Array<{ sku: string; qty: number }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const r = (item ?? {}) as Record<string, unknown>;
      const sku = typeof r.sku === "string" ? r.sku : "";
      const qty = Number(r.qty ?? r.quantity ?? 0);
      if (!sku || !Number.isFinite(qty) || qty <= 0) return null;
      return { sku, qty };
    })
    .filter((v): v is { sku: string; qty: number } => v !== null);
}

export async function POST(request: NextRequest) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const items = toQuickOrderItems(body.items ?? body);
    if (items.length === 0) {
      return NextResponse.json({ error: "items[] is required" }, { status: 400 });
    }

    const store = request.headers.get("x-store-code") || null;
    console.log("[quick-order/add-to-cart] store:", store, "items:", items.length);

    const data = await graphqlFetch<KleverQuickOrderAddToCartData>({
      query: KLEVER_QUICK_ORDER_ADD_TO_CART_MUTATION,
      variables: { items },
      token,
      store,
      cache: "no-store",
    });

    console.log("[quick-order/add-to-cart] result:", JSON.stringify(data.kleverQuickOrderAddToCart));
    return NextResponse.json(data.kleverQuickOrderAddToCart);
  } catch (error) {
    console.error("[quick-order/add-to-cart] error:", error);
    if (isGraphQLRequestError(error)) {
      console.error("[quick-order/add-to-cart] GraphQL errors:", JSON.stringify((error as any).errors));
      return NextResponse.json(
        { message: (error as any).message, errors: (error as any).errors },
        { status: (error as any).status >= 400 ? (error as any).status : 500 },
      );
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
