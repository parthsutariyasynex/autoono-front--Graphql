import { NextRequest, NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_QUICK_ORDER_ADD_TO_CART_MUTATION } from "@/src/graphql/mutations";
import { ADD_PRODUCTS_TO_CART_MUTATION } from "@/src/graphql/mutations";
import { CUSTOMER_CART_ID_QUERY, CUSTOMER_CART_QUERY } from "@/src/graphql/queries";
import type { KleverQuickOrderAddToCartData, CustomerCartIdData, CustomerCartData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

interface AddProductsToCartData {
  addProductsToCart: {
    cart: { id: string; total_quantity: number };
    user_errors: Array<{ code: string; message: string }>;
  };
}

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

/**
 * Fallback: add items via the standard Magento addProductsToCart mutation.
 * Used when the Klever Quick Order module crashes with a PHP "Internal server
 * error" (category: internal) for a given store.
 *
 * We get the cart ID using the customer's warehouse store so we target the
 * correct cart, but we add products with store: null (no Store header). This
 * bypasses the warehouse-specific catalog restriction that would otherwise
 * reject B2B products not assigned to the store's public catalog — while still
 * adding to the correct cart because Magento routes by cartId, not store.
 */
async function addItemsFallback(
  items: Array<{ sku: string; qty: number }>,
  token: string,
  store: string | null,
): Promise<NextResponse> {
  console.log("[quick-order/add-to-cart] Using standard cart fallback for", items.length, "items, store:", store);

  // Identify the correct cart for this warehouse store.
  const cartIdData = await graphqlFetch<CustomerCartIdData>({
    query: CUSTOMER_CART_ID_QUERY,
    token,
    store,
    cache: "no-store",
  });
  const cartId = cartIdData.customerCart?.id;
  if (!cartId) {
    return NextResponse.json({ message: "No active cart found" }, { status: 404 });
  }

  // Add all items in a single batch call — Magento supports partial success:
  // items that pass availability checks are added; failed items appear in user_errors.
  const cartItems = items.map((item) => ({ sku: item.sku, quantity: item.qty }));

  let addedCount = 0;
  const skuErrors: string[] = [];

  try {
    const result = await graphqlFetch<AddProductsToCartData>({
      query: ADD_PRODUCTS_TO_CART_MUTATION,
      variables: { cartId, cartItems },
      token,
      store,
      cache: "no-store",
    });

    const userErrors = result.addProductsToCart.user_errors ?? [];
    addedCount = items.length - userErrors.length;
    for (const e of userErrors) {
      console.warn("[quick-order/add-to-cart] fallback user_error:", e.message);
      skuErrors.push(e.message);
    }
  } catch (batchErr) {
    // Batch call itself threw — fall back to one-by-one so partial success is
    // still possible.
    console.warn("[quick-order/add-to-cart] batch fallback threw, retrying one-by-one:", batchErr);
    for (const item of items) {
      try {
        const result = await graphqlFetch<AddProductsToCartData>({
          query: ADD_PRODUCTS_TO_CART_MUTATION,
          variables: { cartId, cartItems: [{ sku: item.sku, quantity: item.qty }] },
          token,
          store,
          cache: "no-store",
        });
        if (!result.addProductsToCart.user_errors?.length) {
          addedCount++;
        } else {
          const msg = result.addProductsToCart.user_errors[0].message;
          console.warn(`[quick-order/add-to-cart] one-by-one user_error for ${item.sku}:`, msg);
          skuErrors.push(`${item.sku}: ${msg}`);
        }
      } catch (itemErr) {
        console.warn(`[quick-order/add-to-cart] one-by-one exception for ${item.sku}:`, itemErr);
        skuErrors.push(item.sku);
      }
    }
  }

  console.log(`[quick-order/add-to-cart] fallback result: ${addedCount}/${items.length} added, errors: ${skuErrors.length}`);

  if (addedCount === 0) {
    return NextResponse.json(
      { message: skuErrors[0] || "Failed to add items to cart", success: false },
      { status: 400 },
    );
  }

  const cartData = await graphqlFetch<CustomerCartData>({
    query: CUSTOMER_CART_QUERY,
    token,
    store,
    cache: "no-store",
  });

  const cart = cartData.customerCart as any;
  const grandTotal = cart?.prices?.grand_total?.value ?? cart?.grand_total ?? 0;
  const itemsCount = cart?.total_quantity ?? addedCount;

  const message = addedCount < items.length
    ? `${addedCount} of ${items.length} items added to cart`
    : "Items added to cart successfully";

  return NextResponse.json({
    success: true,
    message,
    items_count: itemsCount,
    grand_total: grandTotal,
    redirect_url: null,
  });
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

    try {
      const data = await graphqlFetch<KleverQuickOrderAddToCartData>({
        query: KLEVER_QUICK_ORDER_ADD_TO_CART_MUTATION,
        variables: { items },
        token,
        store,
        cache: "no-store",
      });

      console.log("[quick-order/add-to-cart] result:", JSON.stringify(data.kleverQuickOrderAddToCart));
      return NextResponse.json(data.kleverQuickOrderAddToCart);
    } catch (kleverError) {
      // When the Klever Quick Order PHP resolver crashes (category: internal), fall
      // back to standard Magento cart add. This handles stores where the Klever
      // Quick Order module is not fully configured or its session initialization fails.
      if (
        isGraphQLRequestError(kleverError) &&
        kleverError.errors?.some((e) => e.extensions?.category === "internal")
      ) {
        console.warn("[quick-order/add-to-cart] Klever mutation internal error — falling back to standard cart add. Store:", store);
        return await addItemsFallback(items, token, store);
      }
      throw kleverError;
    }
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
