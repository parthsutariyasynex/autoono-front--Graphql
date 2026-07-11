# Changes — Session 2026-06-08

## 1. Cart Summary Totals Fix (`src/lib/cartShape.ts`)

**Problem:**
Cart summary was showing a fake "Discount" equal to the VAT amount (e.g. 167.40 = VAT was shown as discount). Grand Total equalled Items Total, making it look like discount and VAT cancelled each other out.

**Root Cause:**
`reshapeCustomerCart` was using `subtotal_including_tax` as the subtotal value. The CartContext discount formula is:
```
derived = subtotal + tax_amount - grand_total
```
With subtotal already including tax:
```
1,283.40 + 167.40 - 1,283.40 = 167.40  → shown as "Discount" (WRONG)
```

**Fix:**
Swapped preference in `src/lib/cartShape.ts` to use `subtotal_excluding_tax` first:
```ts
// Before (broken)
cart.prices?.subtotal_including_tax?.value ??
cart.prices?.subtotal_excluding_tax?.value ??

// After (fixed)
cart.prices?.subtotal_excluding_tax?.value ??
cart.prices?.subtotal_including_tax?.value ??
```

**Result:**
```
Items Total:  1,116.00   (pre-tax)
Saudi VAT:      167.40
Grand Total:  1,283.40
Discount:        —       (correctly hidden when no real discount)
```

---

## 2. Cart Routes — Forward `x-store-code` to Magento (`Store` header)

**Problem:**
All cart API routes were calling Magento GraphQL without a `Store` header, so Magento served the default store instead of the warehouse store (e.g. `V101_en`). This caused pricing and stock data to be wrong for non-default stores.

**Files fixed:**

| File | Change |
|---|---|
| `app/api/kleverapi/cart/route.ts` | Added `store: storeCode` to `graphqlFetch` |
| `app/api/kleverapi/cart/add/route.ts` | Added `store: storeCode` to all 3 `graphqlFetch` calls |
| `app/api/kleverapi/cart/update/[itemId]/route.ts` | Added `store: storeCode` to all 3 `graphqlFetch` calls |
| `app/api/kleverapi/cart/remove/[itemId]/route.ts` | Added `store: storeCode` to all `graphqlFetch` calls |
| `app/api/kleverapi/cart/clear/route.ts` | Added `store: storeCode` to `graphqlFetch` |
| `app/api/kleverapi/cart/apply-coupon/route.ts` | Added `store: storeCode` to all `graphqlFetch` calls |
| `app/api/kleverapi/cart/remove-coupon/route.ts` | Added `store: storeCode` to all `graphqlFetch` calls |

Each route reads the store from `req.headers.get("x-store-code")` and passes it through.

---

## 3. Discount Popup — Remove `toBaseLocale()` + Add Diagnostic Logs (`app/api/kleverapi/cart/discount-popup/route.ts`)

**Problem:**
`kleverDiscountPopup` was being called with `Store: en` instead of `Store: V101_en` because `toBaseLocale()` was stripping the warehouse suffix. The PHP `getAllVisibleItems() on null` error was a false signal — the real fix was to confirm `V101_en` works fine.

**Changes:**
- `toBaseLocale()` function kept but **commented out** — now `effectiveStore = rawStore` directly (passes `V101_en` as-is)
- Rewrote fetch to use raw `fetch()` instead of `graphqlFetch` for full request/response logging
- Added `[gift-check]` diagnostic logs:
  - Incoming `x-store-code` header
  - Cookies: `NEXT_STORE`, `NEXT_LOCALE`
  - `?store` query param
  - Final `Store` header sent to Magento
  - `promo_rules` count, `auto_open_popup`, `subtotal` from response

---

## 4. Product Search — Use Base Locale for Text Search (`app/api/category-products/route.ts`)

**Problem:**
Product search returned 0 results on warehouse store codes (`V101_en`, `V202_en`, etc.) because Magento's Elasticsearch index only exists on base locale stores (`en`, `ar`).

**Fix:**
Added `toSearchStore()` helper and `isSearchRequest` detection. When any search param is present (`searchby`, `searchBy`, `search`, `searchQuery`, `item_code`, `itemCode`), the store is downgraded to base locale (`V101_en → en`). Category browsing without search keeps the original store code.

Also changed `cache: "no-store"` → `revalidate: 30` for category-products queries.

---

## 5. Credit Limit Component — Session Gate + `has_permission` Fix (`app/components/CreditLimit.tsx`)

**Problem:**
Credit account section was not showing in the account page. Magento returns `is_visible: false` when `total_credit_limit = 0`, even for customers who have a credit account with `has_permission: true`.

**Fix:**
- Added `useSession` hook — fetch only when `status === "authenticated"`
- Gating changed from `is_visible` → `has_permission` to show the credit section for all eligible customers regardless of credit limit value
- Added `[credit-account]` diagnostic log of raw Magento response in `app/api/kleverapi/credit-account/route.ts`

---

## 6. GraphQL Fetch Helper (`src/lib/graphqlFetch.ts`)

Updated `graphqlFetch` to support a `revalidate` option in addition to `cache: "no-store"`, allowing Next.js ISR (Incremental Static Regeneration) style caching for product listing routes.

---

## Files Changed Summary

```
src/lib/cartShape.ts                                  ← Cart totals bug fix
app/api/kleverapi/cart/route.ts                       ← Store header forwarding
app/api/kleverapi/cart/add/route.ts                   ← Store header forwarding
app/api/kleverapi/cart/update/[itemId]/route.ts       ← Store header forwarding
app/api/kleverapi/cart/remove/[itemId]/route.ts       ← Store header forwarding
app/api/kleverapi/cart/clear/route.ts                 ← Store header forwarding
app/api/kleverapi/cart/apply-coupon/route.ts          ← Store header forwarding
app/api/kleverapi/cart/remove-coupon/route.ts         ← Store header forwarding
app/api/kleverapi/cart/discount-popup/route.ts        ← Remove toBaseLocale + logs
app/api/category-products/route.ts                    ← Search base locale fix
app/api/kleverapi/category-products/route.ts          ← Cache revalidate
app/api/kleverapi/credit-account/route.ts             ← Debug log
app/components/CreditLimit.tsx                        ← Session gate + has_permission
src/lib/graphqlFetch.ts                               ← revalidate support
modules/cart/context/GiftContext.tsx                  ← Gift popup store passing
app/components/Navbar.tsx                             ← Related store code changes
app/components/ProductsListing.tsx                    ← Related store code changes
app/components/SearchPopup.tsx                        ← Related store code changes
app/api/kleverapi/menu/route.ts                       ← Related changes
app/api/kleverapi/product-search/route.ts             ← Related changes
app/api/kleverapi/source-permission/route.ts          ← Related changes
app/api/kleverapi/source-permission/check/[storeId]/route.ts  ← Related changes
app/api/kleverapi/source-permission/stores/route.ts   ← Related changes
next.config.ts                                        ← Config updates
```
