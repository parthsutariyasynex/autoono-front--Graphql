import { NextRequest, NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { getLocaleFromRequest } from "@/lib/api/magento-url";
import { KLEVER_QUICK_ORDER_VALIDATE_MUTATION } from "@/src/graphql/mutations";
import type { KleverQuickOrderValidateData } from "@/src/graphql/types";
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

    const store = request.headers.get("x-store-code") || getLocaleFromRequest(request);

    const data = await graphqlFetch<KleverQuickOrderValidateData>({
      query: KLEVER_QUICK_ORDER_VALIDATE_MUTATION,
      variables: { items },
      token,
      store,
      cache: "no-store",
    });

    return NextResponse.json(data.kleverQuickOrderValidate);
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json({ error: "Validation failed" }, { status: 500 });
  }
}
