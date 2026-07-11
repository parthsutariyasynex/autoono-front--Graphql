import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { CUSTOMER_CART_ID_QUERY, CUSTOMER_CART_QUERY } from "@/src/graphql/queries";
import { REMOVE_ITEM_FROM_CART_MUTATION } from "@/src/graphql/mutations";
import type {
  CustomerCartData,
  CustomerCartIdData,
  RemoveItemFromCartData,
} from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/lib/graphqlFetch";
import { reshapeCustomerCart } from "@/lib/cartShape";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  try {
    const token = await getRequestToken(req);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { itemId } = await params;
    const cartItemId = Number(itemId);
    console.log(`[Remove Route] cartItemId=${cartItemId} (raw="${itemId}")`);

    if (!cartItemId || isNaN(cartItemId)) {
      console.error(`[Remove Route] Invalid cartItemId: "${itemId}"`);
      return NextResponse.json({ message: "Invalid itemId" }, { status: 400 });
    }

    const storeCode = req.headers.get("x-store-code") || null;

    const idData = await graphqlFetch<CustomerCartIdData>({
      query: CUSTOMER_CART_ID_QUERY,
      token,
      store: storeCode,
      cache: "no-store",
    });
    const cartId = idData.customerCart?.id;
    if (!cartId) {
      console.warn(`[Remove Route] No cartId found — cart may be empty`);
      return NextResponse.json({ success: true });
    }

    // Guard against Magento's `getSku() on bool` resolver bug — it fires when
    // cart_item_id doesn't exist in the cart (already removed, race condition,
    // stale page, etc.). Pre-check membership so we return a clean idempotent
    // 200 instead of propagating a 500 to the client.
    const presentIds = (idData.customerCart?.items ?? []).map((i) => Number(i.id));
    console.log(`[Remove Route] presentIds=${JSON.stringify(presentIds)}, looking for ${cartItemId}, found=${presentIds.includes(cartItemId)}`);

    if (!presentIds.includes(cartItemId)) {
      console.warn(`[Remove Route] GUARD FIRED — cartItemId ${cartItemId} not in presentIds. Returning current cart WITHOUT mutating.`);
      const cartData = await graphqlFetch<CustomerCartData>({
        query: CUSTOMER_CART_QUERY,
        token,
        store: storeCode,
        cache: "no-store",
      });
      if (!cartData.customerCart) return NextResponse.json({ success: true, __guard_fired: true });
      const shaped = reshapeCustomerCart(cartData.customerCart);
      console.log(`[Remove Route] Guard path — returning cart with ${shaped.items.length} items (guard_fired=true), ids=${JSON.stringify(shaped.items.map(i => ({ id: i.item_id, sku: i.sku })))}`);
      // __guard_fired lets the client distinguish "mutation never ran" from
      // "mutation ran but a promo rule immediately re-added the same SKU".
      return NextResponse.json({ ...shaped, __guard_fired: true });
    }

    console.log(`[Remove Route] Calling removeItemFromCart mutation: cartId=${cartId}, cartItemId=${cartItemId}`);
    await graphqlFetch<RemoveItemFromCartData>({
      query: REMOVE_ITEM_FROM_CART_MUTATION,
      variables: { cartId, cartItemId },
      token,
      store: storeCode,
      cache: "no-store",
    });
    console.log(`[Remove Route] Mutation success. Fetching updated cart.`);

    const cartData = await graphqlFetch<CustomerCartData>({
      query: CUSTOMER_CART_QUERY,
      token,
      store: storeCode,
      cache: "no-store",
    });
    if (!cartData.customerCart) {
      return NextResponse.json({ success: true });
    }
    const shaped = reshapeCustomerCart(cartData.customerCart);
    console.log(`[Remove Route] Returning updated cart: ${shaped.items.length} items, ids=${JSON.stringify(shaped.items.map(i => ({ id: i.item_id, sku: i.sku })))}`);
    return NextResponse.json(shaped);
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      console.error(`[Remove Route] GraphQL error:`, error.message, error.errors);
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    console.error(`[Remove Route] Unexpected error:`, error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
