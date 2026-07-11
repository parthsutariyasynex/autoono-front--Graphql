import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { CUSTOMER_CART_QUERY } from "@/src/graphql/queries";
import type { CustomerCartData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/lib/graphqlFetch";
import { reshapeCustomerCart } from "@/lib/cartShape";

export async function GET(req: Request) {
  try {
    const token = await getRequestToken(req);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized: Missing customer token" }, { status: 401 });
    }

    const storeCode = req.headers.get("x-store-code") || null;

    const data = await graphqlFetch<CustomerCartData>({
      query: CUSTOMER_CART_QUERY,
      token,
      store: storeCode,
      cache: "no-store",
    });

    console.log(`[cart/GET] x-store-code: "${storeCode ?? ""}" customerCart: ${data.customerCart ? "present" : "null"}`);

    if (!data.customerCart) {
      console.log(`[cart/GET] no customerCart — returning empty cart for store: "${storeCode ?? ""}"`);
      return NextResponse.json({
        cart_id: "",
        items_count: 0,
        items: [],
        subtotal: 0,
        tax_amount: 0,
        tax_label: "Tax",
        grand_total: 0,
        currency_code: "SAR",
        applied_coupons: [],
      });
    }

    const shaped = reshapeCustomerCart(data.customerCart);
    console.log(`[cart/GET] store: "${storeCode ?? ""}" items: ${shaped.items.length} subtotal: ${shaped.subtotal} tax: ${shaped.tax_amount} grand_total: ${shaped.grand_total} currency: ${shaped.currency_code}`);
    return NextResponse.json(shaped);
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
