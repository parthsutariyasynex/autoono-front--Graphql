# Backend Investigation — `kleverFavoriteProducts` returns `total_count > 0` but `products: []`

## Summary of the bug

The favorites page shows no products even though favorites were added. The frontend
is confirmed **correct**; the Magento GraphQL resolver `kleverFavoriteProducts` returns
the right **count** but an **empty product array**.

Observed live response (store `en`, logged-in customer, no GraphQL error):

```json
{ "products": [], "total_count": 3 }
```

`total_count` even increments correctly when a new favorite is added (2 → 3), so the
**favorite rows are being created**, but the resolver **cannot materialize the product
objects** for them.

## Confirmed frontend-side facts (so backend can rule the frontend out)

| Fact | Value |
|---|---|
| Read query | `kleverFavoriteProducts(pageSize: Int, currentPage: Int) { products { product_id sku name brand image_url final_price stock_status product_url } total_count }` |
| Request params | `pageSize=10`, `currentPage=1` |
| Store header sent | `en` (resolved + verified) |
| Available stores (Magento `availableStores`) | only `en` and `ar`, both `website_id: 8`, `en` is default. `V101_en`/`WJ01_en` are warehouse prefixes, **not** store views. |
| Add mutation | `kleverAddFavoriteProduct(productId: Int!)` — frontend sends the product's `product_id` |
| GraphQL errors | none (HTTP 200, `errors` absent) |
| Auth | valid customer token present (resolver did not return an authorization error) |

Because `total_count` is correct and there is no error, the problem is isolated to the
**product-collection branch** of the resolver — not auth, not store scope, not the frontend.

## Reproduce directly against GraphQL (with a customer token)

```bash
curl -s -X POST https://autoono-demo.btire.com/graphql \
  -H "Content-Type: application/json" -H "Store: en" \
  -H "Authorization: Bearer <CUSTOMER_TOKEN>" \
  -d '{"query":"{ kleverFavoriteProducts(pageSize:50,currentPage:1){ products{ product_id sku name stock_status } total_count } }"}'
```

Expected (bug): `{"products":[],"total_count":3}`.

## Core hypothesis

The resolver computes `total_count` from the **favorites table** (a raw row count) but
builds `products` from a **product collection** that is filtered/joined differently. The
two diverge when the favorited products fail one of the collection's filters, or when the
stored reference doesn't match a loadable catalog product. The checklist below isolates which.

---

## Investigation checklist

> Replace `{customer_id}` with the affected customer's entity id, and
> `{fav_table}` with the actual favorites table once discovered (see step 0).

### Step 0 — Locate the module, resolver, and table
```bash
# In the Magento source tree:
grep -rn "kleverFavoriteProducts" app/code vendor --include=*.graphqls   # schema → type + resolver
grep -rn "kleverFavoriteProducts" app/code vendor --include=*.xml        # di.xml / schema.graphqls binding
# From the schema, find the Resolver class (implements ResolverInterface) and the
# Model/Collection it uses. Note the favorites table name from its db_schema.xml / InstallSchema.
```
Record: resolver FQCN, model/collection class, **favorites table name**.

### 1 — Check favorite table rows for this customer
```sql
-- Confirm 3 rows exist and capture the stored product references.
SELECT * FROM {fav_table} WHERE customer_id = {customer_id};
```
Expected: 3 rows. **Note the exact column** that stores the product reference
(`product_id`? `sku`? `entity_id`?) and its values.

### 2 — Verify saved product_id / sku resolve to real catalog products
```sql
-- Using the product_id values from step 1:
SELECT entity_id, sku, type_id, created_at
FROM catalog_product_entity
WHERE entity_id IN ({ids_from_step_1});

-- If the favorites table stores SKU instead of id, match on sku:
SELECT entity_id, sku FROM catalog_product_entity
WHERE sku IN ({skus_from_step_1});
```
**If rows are missing here → ID/SKU mismatch:** the `add` path saved a reference that
doesn't correspond to a catalog `entity_id`. Compare what `kleverAddFavoriteProduct`
persists vs. what the read resolver loads (column + type, int vs string).

### 3 — Verify products are enabled
```sql
-- status: 1 = Enabled, 2 = Disabled (eav attribute 'status').
SELECT e.entity_id, e.sku, s.value AS status, s.store_id
FROM catalog_product_entity e
JOIN catalog_product_entity_int s
  ON s.entity_id = e.entity_id
 AND s.attribute_id = (SELECT attribute_id FROM eav_attribute
                       WHERE attribute_code='status'
                       AND entity_type_id=(SELECT entity_type_id FROM eav_entity_type WHERE entity_type_code='catalog_product'))
WHERE e.entity_id IN ({ids_from_step_1})
  AND s.store_id IN (0, <store_id_for_en>);
```
Disabled (status=2) at the store-view level → filtered out of the collection.

### 4 — Verify products are assigned to website_id 8
```sql
SELECT product_id, website_id
FROM catalog_product_website
WHERE product_id IN ({ids_from_step_1});
```
**This is a prime suspect.** The storefront customer is on `website_id = 8`. Any favorited
product **not** in `catalog_product_website` for website 8 is excluded by
`addWebsiteFilter()` / store filtering in the collection → empty `products` while the
favorites row (and `total_count`) still exist. Products favorited under a different
website would reproduce exactly this symptom.

### 5 — Verify visibility / stock status
```sql
-- Visibility: 1=Not Visible Individually, 2=Catalog, 3=Search, 4=Catalog+Search.
SELECT e.entity_id, e.sku, v.value AS visibility
FROM catalog_product_entity e
JOIN catalog_product_entity_int v
  ON v.entity_id = e.entity_id
 AND v.attribute_id = (SELECT attribute_id FROM eav_attribute
                       WHERE attribute_code='visibility'
                       AND entity_type_id=(SELECT entity_type_id FROM eav_entity_type WHERE entity_type_code='catalog_product'))
WHERE e.entity_id IN ({ids_from_step_1});

-- Stock (if the collection applies stockItem/salable filters):
SELECT product_id, qty, is_in_stock
FROM cataloginventory_stock_item
WHERE product_id IN ({ids_from_step_1});
```
If the resolver collection adds visibility or `is_in_stock` filters, `Not Visible Individually`
or out-of-stock items get dropped.

### 6 — Audit the resolver's product collection filters
In the resolver / collection builder, list every filter applied and check each against
the favorited products:
- `addStoreFilter()` / `setStore()` — which store id? should accept the `Store: en` header
- `addWebsiteFilter()` — website 8 (see step 4)
- `addAttributeToFilter('status', 1)` — enabled (step 3)
- `addAttributeToFilter('visibility', [...])` — visibility (step 5)
- `addIsInStockFilterToCollection()` / salable filter — stock (step 5)
- the join key linking favorites → product (`entity_id` vs `sku`; int vs varchar) — **must match step 1's stored column**

The likely fault: the **count** is taken from the favorites table directly, but the
**collection** adds one of the above filters that all 3 products fail (most likely the
website-8 assignment or the join key).

### 7 — Verify pagination logic
```graphql
{ kleverFavoriteProducts(pageSize: 100, currentPage: 1) { products { product_id } total_count } }
```
- Confirm `total_count = 3` with `pageSize=100, currentPage=1` still yields `products: []`
  (rules pagination in/out — with 3 items on page 1 of size 100, pagination cannot be the cause if still empty).
- Check the collection's `setPageSize()/setCurPage()` and **whether `total_count` is read
  from `getSize()` of the *same* filtered collection or from a separate unfiltered count**.
  If `total_count` comes from an unfiltered favorites count while `products` comes from a
  filtered collection, that exact divergence is the bug.

---

## Most likely root cause (rank-ordered)

1. **Website assignment / store filter** — products not in `catalog_product_website` for
   website 8 (or store filter mismatch). Count from favorites table, products from
   website-filtered collection → diverge. *(Check step 4 first.)*
2. **Join-key / ID mismatch** between what `add` saves and what the read collection joins on
   (`product_id` int vs `sku` string). *(Step 2.)*
3. **Disabled / not-visible / out-of-stock** products filtered by the collection. *(Steps 3, 5.)*
4. **`total_count` and `products` computed from different (filtered vs unfiltered) sources.** *(Step 7.)*

## Suggested fix direction
Make `total_count` reflect the **same filtered collection** that produces `products` (so the
count never claims items the resolver can't return), **and/or** relax the collection filter
that is over-excluding (verify website 8 assignment for favorited products). Decide based on
which checklist step fails.

## Frontend status — no change required
- Read: `app/api/kleverapi/favorite-products/route.ts` (GET) — correct; now also passes an
  explicit `store` (resolved from `x-store-code` / `store` header / `NEXT_STORE` cookie /
  locale). Harmless + correct, but not the cause (only `en`/`ar` exist; `en` is default).
- Page/component: `app/favorites/page.tsx` → `app/components/FavouriteProducts.tsx` — reads
  `data.products` / `data.total_count` correctly and renders the empty state faithfully.
- The frontend will display the products automatically once the resolver returns a non-empty
  `products` array.
