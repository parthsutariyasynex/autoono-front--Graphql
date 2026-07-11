import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import {
  KLEVER_CHECKOUT_SUCCESS_QUERY,
  KLEVER_MY_ORDERS_QUERY,
} from "@/src/graphql/queries";
import type {
  KleverCheckoutSuccessData,
  KleverMyOrdersData,
} from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/lib/graphqlFetch";

async function resolveOrderId(
  raw: string,
  token: string,
): Promise<number | null> {
  // Fast path: already numeric (e.g. "162")
  const direct = Number(raw);
  if (Number.isInteger(direct) && direct > 0) return direct;

  // Slow path: increment_id like "AUT0000162" → look up via customer orders
  try {
    const data = await graphqlFetch<KleverMyOrdersData>({
      query: KLEVER_MY_ORDERS_QUERY,
      variables: { orderNumber: raw, pageSize: 1, currentPage: 1 },
      token,
      cache: "no-store",
    });
    const match = data.kleverMyOrders?.orders?.find(
      (o) => o.increment_id === raw,
    );
    if (match) return Number(match.order_id);
  } catch {
    // fall through
  }

  // Last fallback: extract trailing digits ("AUT0000162" → 162)
  const m = raw.match(/(\d+)$/);
  if (m) {
    const n = Number(m[1]);
    if (Number.isInteger(n) && n > 0) return n;
  }
  return null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized: Invalid token format" }, { status: 401 });
    }

    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ message: "Order ID is required" }, { status: 400 });
    }

    const numericId = await resolveOrderId(orderId, token);
    if (!numericId) {
      return NextResponse.json(
        { message: `Order not found for "${orderId}"` },
        { status: 404 },
      );
    }

    const data = await graphqlFetch<KleverCheckoutSuccessData>({
      query: KLEVER_CHECKOUT_SUCCESS_QUERY,
      variables: { orderId: numericId },
      token,
      cache: "no-store",
    });

    if (!data.kleverCheckoutSuccess) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }
    return NextResponse.json(data.kleverCheckoutSuccess, { status: 200 });
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
