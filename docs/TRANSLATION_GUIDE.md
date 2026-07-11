# Translation Approach - Altalayi Frontend

## Two Sources of Truth

| Source | What it handles | Keys | Example |
|--------|----------------|------|---------|
| **Magento CSV** (`ar_SA.csv`, `en_US.csv`) | Standard e-commerce labels shared with Magento backend | `m.*` (8,765 keys) | `t("m.add-to-cart")` |
| **Custom JSON** (`public/locales/en.json`, `ar.json`) | App-specific UI text (toasts, page titles, form messages) | No prefix (300 keys) | `t("login.title")` |

## How It Works

```
┌─────────────────────────────────────────────────────┐
│                   Magento Backend                    │
│                                                     │
│  ar_SA.csv (11,801 strings)  en_US.csv (32 overrides)│
└──────────────────┬──────────────────────────────────┘
                   │  npm run sync:translations
                   ▼
┌─────────────────────────────────────────────────────┐
│              public/locales/en.json                  │
│              public/locales/ar.json                  │
│                                                     │
│   300 custom keys  +  8,765 magento keys = 9,065    │
└──────────────────┬──────────────────────────────────┘
                   │  imported by
                   ▼
┌─────────────────────────────────────────────────────┐
│           hooks/useTranslation.ts                    │
│                                                     │
│   const { t, locale, isRtl } = useTranslation();    │
│   t("m.add-to-cart")  →  reads from JSON by locale  │
└──────────────────┬──────────────────────────────────┘
                   │  used in
                   ▼
┌─────────────────────────────────────────────────────┐
│            40+ Pages & Components                    │
│                                                     │
│   <button>{t("m.place-order")}</button>              │
│   toast.success(t("cart.itemRemoved"))              │
└─────────────────────────────────────────────────────┘
```

## Locale Detection Flow

```
User visits /ar/products
       │
       ▼
middleware.ts → rewrites to /products, sets NEXT_LOCALE=ar cookie
       │
       ▼
layout.tsx → reads cookie → sets <html lang="ar" dir="rtl">
       │
       ▼
useTranslation() → reads locale from URL → returns Arabic strings
       │
       ▼
api-client.ts → sends x-locale: ar header → API routes read it
       │
       ▼
getBaseUrl(req) → builds /rest/ar/V1/kleverapi/... → Magento returns Arabic data
```

## Using Translations in Components

### 1. Import the hook

```tsx
import { useTranslation } from "@/hooks/useTranslation";
```

### 2. Call inside component

```tsx
const { t, locale, isRtl } = useTranslation();
```

### 3. Use in JSX

```tsx
// Magento strings (synced from CSV)
<button>{t("m.add-to-cart")}</button>       // EN: "Add to Cart" | AR: "أضف لسلة التسوق"
<span>{t("m.tax")}</span>                   // EN: "VAT (15%)"  | AR: "ضريبة القيمة المضافة 15 %"
<span>{t("m.in-stock")}</span>              // EN: "In stock"   | AR: "متوفر"

// Custom app strings
<h1>{t("cart.title")}</h1>                  // EN: "Shopping Cart" | AR: "سلة التسوق"
toast.success(t("login.loginSuccess"));     // EN: "Login Successful" | AR: "تم تسجيل الدخول بنجاح"
```

## Common Magento Keys Reference

| Key | English | Arabic |
|-----|---------|--------|
| `m.add-to-cart` | Add to Cart | أضف لسلة التسوق |
| `m.in-stock` | In stock | متوفر |
| `m.out-of-stock` | Out of stock | غير متوفر بالمخزن |
| `m.shopping-cart` | Shopping Cart | عربة التسوق |
| `m.place-order` | Place Order | إرسال الطلب |
| `m.tax` | VAT (15%) | ضريبة القيمة المضافة 15 % |
| `m.shipping` | Shipping | شحن |
| `m.subtotal` | Subtotal | المجموع الفرعي |
| `m.grand-total` | Grand Total | المجموع الإجمالي |
| `m.sign-in` | Sign in | دخول |
| `m.sign-out` | Sign Out | خروج |
| `m.my-orders` | My Orders | طلباتي |
| `m.my-account` | My Account | حسابي |
| `m.search` | Search | ابحث |
| `m.save` | Save | حفظ |
| `m.cancel` | Cancel | إلغاء |
| `m.checkout` | Checkout | إتمام عملية الشراء |
| `m.email` | Email | البريد الالكتروني |
| `m.password` | Password | كلمة المرور |
| `m.first-name` | First Name | الاسم الأول |
| `m.last-name` | Last Name | اسم العائلة |
| `m.shipping-address` | Shipping Address | عنوان الشحن |
| `m.billing-address` | Billing Address | عنوان إرسال الفواتير |
| `m.payment-method` | Payment Method | طريقة الدفع |
| `m.shipping-method` | Shipping Method | طريقة الشحن |

## When Magento Adds New Strings

1. Backend team updates `ar_SA.csv` / `en_US.csv`
2. Run: `npm run sync:translations`
3. New keys appear automatically in JSON files as `m.<slug>`
4. Use in components: `t("m.<slug>")`

No code changes to the sync script needed.

## Adding Custom App Strings

For strings specific to this frontend (not in Magento):

1. Add key to `public/locales/en.json`:
   ```json
   "myFeature.heading": "My New Feature"
   ```

2. Add Arabic translation to `public/locales/ar.json`:
   ```json
   "myFeature.heading": "ميزتي الجديدة"
   ```

3. Use: `t("myFeature.heading")`

## Key Files

| File | Purpose |
|------|---------|
| `hooks/useTranslation.ts` | `t()` hook — reads locale from URL, returns translated string |
| `public/locales/en.json` | All English strings (custom + Magento) |
| `public/locales/ar.json` | All Arabic strings (custom + Magento) |
| `scripts/sync-magento-translations.mjs` | Auto-syncs Magento CSV → JSON |
| `lib/i18n/config.ts` | Locale config, Magento URL builder |
| `lib/i18n/client.ts` | Client-side `useLocale()` hook, path utils |
| `lib/i18n/server.ts` | Server-side locale detection |
| `lib/api/magento-url.ts` | `getBaseUrl(req)` — locale-aware Magento API URL |
| `lib/api/api-client.ts` | Sends `x-locale` header on all API calls |
| `components/LanguageSwitcher.tsx` | EN/AR toggle button in Navbar |
| `middleware.ts` | `/en/*` and `/ar/*` URL routing + auth |
| `app/layout.tsx` | Sets `lang` and `dir` on `<html>` |
| `app/globals.css` | RTL CSS rules |

## Key Points

- **Static UI text** (buttons, labels, toasts) → `useTranslation` hook with JSON files
- **Dynamic API data** (products, menus, orders) → Magento returns Arabic automatically via `/rest/ar/V1/...`
- **RTL layout** → `dir="rtl"` set on `<html>` + CSS rules in `globals.css`
- **Same auth token** works for both languages — no re-login needed
- **New Magento strings** → just re-run `npm run sync:translations`, keys appear automatically
- **9,065 total keys** per language (300 custom + 8,765 from Magento CSV)
