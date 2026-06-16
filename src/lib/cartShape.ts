import type { CustomerCart, CustomerCartItem } from "@/src/graphql/types";

export interface KleverCartItemShape {
  item_id: number;
  product_id: number | null;
  sku: string;
  name: string;
  price: number;
  qty: number;
  row_total: number;
  image_url: string;
  product_url: string | null;
  discount_amount?: number;
}

export interface KleverCartShape {
  cart_id: string;
  items_count: number;
  items: KleverCartItemShape[];
  subtotal: number;
  tax_amount: number;
  tax_label: string;
  shipping_amount: number;
  grand_total: number;
  currency_code: string;
  applied_coupons: Array<{ code: string }>;
}

function reshapeItem(item: CustomerCartItem): KleverCartItemShape {
  const price = item.prices?.price.value ?? 0;
  const rowTotal = item.prices?.row_total.value ?? price * item.quantity;
  // Magento GraphQL's `total_item_discount` is the TOTAL discount across all
  // units of the line item. The cart UI's `discount_amount` is expected to be
  // PER-UNIT (it's added to `item.price` to form the strike-through original
  // price). Divide by qty here so the legacy contract is preserved.
  const totalDiscount = item.prices?.total_item_discount?.value ?? 0;
  const perUnitDiscount =
    totalDiscount > 0 && item.quantity > 0 ? totalDiscount / item.quantity : 0;
  return {
    item_id: Number(item.id),
    product_id: null,
    sku: item.product.sku,
    name: item.product.name,
    price,
    qty: item.quantity,
    row_total: rowTotal,
    image_url: item.product.small_image?.url || "/images/tyre-sample.png",
    product_url: item.product.url_key ? `/${item.product.url_key}` : null,
    ...(perUnitDiscount > 0 ? { discount_amount: perUnitDiscount } : {}),
  };
}

export function reshapeCustomerCart(cart: CustomerCart): KleverCartShape {
  const items = cart.items.map(reshapeItem);
  const appliedTaxes = cart.prices?.applied_taxes ?? [];
  const taxAmount = appliedTaxes.reduce((sum, t) => sum + (t.amount.value || 0), 0);
  const taxLabel = appliedTaxes[0]?.label || "Tax";
  // Use ?? to get the raw value (distinguishes "not present" from 0), then fall back
  // to items sum when the API returns an explicit 0 but items have row_total > 0.
  // The ?? operator alone is insufficient — Magento can return subtotal_excluding_tax: 0
  // for certain store configurations even when the cart contains priced items.
  const subtotalFromApi =
    cart.prices?.subtotal_excluding_tax?.value ??
    cart.prices?.subtotal_including_tax?.value;
  const itemsTotal = items.reduce((sum, i) => sum + i.row_total, 0);
  const subtotal =
    subtotalFromApi != null && subtotalFromApi > 0
      ? subtotalFromApi
      : itemsTotal > 0
      ? itemsTotal
      : (subtotalFromApi ?? 0);

  const grandTotalFromApi = cart.prices?.grand_total.value;
  const grandTotal =
    grandTotalFromApi != null && grandTotalFromApi > 0
      ? grandTotalFromApi
      : grandTotalFromApi === 0 && subtotal > 0
      ? subtotal
      : (grandTotalFromApi ?? subtotal);
  const currency = cart.prices?.grand_total.currency ?? "SAR";
  const shippingAmount = cart.shipping_addresses?.[0]?.selected_shipping_method?.amount.value ?? 0;

  return {
    cart_id: cart.id,
    items_count: cart.total_quantity,
    items,
    subtotal,
    tax_amount: taxAmount,
    tax_label: taxLabel,
    shipping_amount: shippingAmount,
    grand_total: grandTotal,
    currency_code: currency,
    applied_coupons: cart.applied_coupons ?? [],
  };
}
