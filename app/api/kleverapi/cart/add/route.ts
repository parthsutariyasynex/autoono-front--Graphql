import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { CUSTOMER_CART_QUERY, CUSTOMER_CART_ID_QUERY } from "@/src/graphql/queries";
import { ADD_PRODUCTS_TO_CART_MUTATION } from "@/src/graphql/mutations";
import type { CustomerCartData, CustomerCartIdData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/lib/graphqlFetch";
import { reshapeCustomerCart } from "@/lib/cartShape";

interface AddProductsToCartData {
  addProductsToCart: {
    cart: { id: string; total_quantity: number };
    user_errors: Array<{ code: string; message: string }>;
  };
}

export async function POST(req: Request) {
  try {
    const token = await getRequestToken(req);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const sku = body.sku;
    const qty = Number(body.qty ?? 1);

    if (!sku || !qty) {
      return NextResponse.json({ message: "sku and qty are required" }, { status: 400 });
    }

    const storeCode = req.headers.get("x-store-code") || null;

    const cartIdData = await graphqlFetch<CustomerCartIdData>({
      query: CUSTOMER_CART_ID_QUERY,
      token,
      store: storeCode,
      cache: "no-store",
    });
    const cartId = cartIdData.customerCart?.id;
    if (!cartId) {
      return NextResponse.json({ message: "No cart available" }, { status: 404 });
    }

    const addResult = await graphqlFetch<AddProductsToCartData>({
      query: ADD_PRODUCTS_TO_CART_MUTATION,
      variables: { cartId, cartItems: [{ sku, quantity: qty }] },
      token,
      store: storeCode,
      cache: "no-store",
    });

    if (addResult.addProductsToCart.user_errors?.length) {
      return NextResponse.json(
        {
          message: addResult.addProductsToCart.user_errors[0].message,
          user_errors: addResult.addProductsToCart.user_errors,
        },
        { status: 400 },
      );
    }

    const cartData = await graphqlFetch<CustomerCartData>({
      query: CUSTOMER_CART_QUERY,
      token,
      store: storeCode,
      cache: "no-store",
    });
    if (!cartData.customerCart) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json(reshapeCustomerCart(cartData.customerCart));
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
