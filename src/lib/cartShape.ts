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
  const subtotal =
    cart.prices?.subtotal_including_tax?.value ??
    cart.prices?.subtotal_excluding_tax?.value ??
    items.reduce((sum, i) => sum + i.row_total, 0);
  const grandTotal = cart.prices?.grand_total.value ?? subtotal;
  const currency = cart.prices?.grand_total.currency ?? "SAR";

  return {
    cart_id: cart.id,
    items_count: cart.total_quantity,
    items,
    subtotal,
    tax_amount: taxAmount,
    tax_label: taxLabel,
    grand_total: grandTotal,
    currency_code: currency,
    applied_coupons: cart.applied_coupons ?? [],
  };
}
