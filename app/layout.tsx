import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import { cookies, headers } from "next/headers";
import { readFile } from "fs/promises";
import { join } from "path";
import { CartProvider } from "../modules/cart/context/CartContext";
import { GiftProvider } from "../modules/cart/context/GiftContext";
import { ReduxProvider } from "@/store/provider";
import ProtectedLayout from "@/components/ProtectedLayout";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { NextAuthProvider } from "@/components/providers/NextAuthProvider";
import { getServerSession } from "@/lib/getServerSession";
import DirectionSync from "@/components/DirectionSync";
import PriceIconObserver from "@/components/PriceIconObserver";
import { GlobalLoadingProvider } from "@/components/GlobalLoadingOverlay";
import {
  localeDirection,
  isValidLocale,
  defaultLocale,
  type Locale,
  LOCALE_COOKIE
} from "@/lib/i18n/config";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import TranslationWrapper from "@/components/providers/TranslationWrapper";

// Server-side translation cache. Reading 600KB+ JSON once per cold start,
// reused for every request in this process. Pre-populating translations
// on the server eliminates the post-hydration skeleton-to-content swap
// (the dominant CLS source).
const serverTranslationCache: Record<string, Record<string, string>> = {};

async function loadServerTranslations(locale: Locale): Promise<Record<string, string>> {
  if (serverTranslationCache[locale]) return serverTranslationCache[locale];
  try {
    const path = join(process.cwd(), "public", "locales", `${locale}.json`);
    const content = await readFile(path, "utf-8");
    const data = JSON.parse(content) as Record<string, string>;
    serverTranslationCache[locale] = data;
    return data;
  } catch (err) {
    console.error(`Failed to load translations for ${locale}:`, err);
    return {};
  }
}

const rubik = Rubik({
  subsets: ["latin", "arabic"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
  variable: "--font-rubik",
  fallback: ["system-ui", "Arial", "sans-serif"],
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: "AutoOno",
  description: "AutoOno",
  icons: {
    icon: "/favicon.ico",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Try x-locale header (set by middleware rewrite)
  const headerList = await headers();
  const headerLocale = headerList.get("x-locale");

  // 2. Fallback to cookie
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE)?.value;

  const localeValue = (headerLocale && isValidLocale(headerLocale))
    ? headerLocale
    : (localeCookie && isValidLocale(localeCookie))
      ? localeCookie
      : defaultLocale;

  const locale = localeValue as Locale;
  const dir = localeDirection[locale];

  // Read session server-side so SessionProvider is pre-populated on the client.
  // This eliminates the 2 extra /api/auth/session fetches that SessionProvider
  // would otherwise make on mount (one normal + one from React StrictMode).
  const session = await getServerSession();

  // Read translations server-side. Passed via RSC payload so TranslationProvider
  // can mount with ready=true and skip the loading-skeleton render that was
  // causing layout shift on every refresh.
  const initialTranslations = await loadServerTranslations(locale);

  return (
    <html lang={locale} dir={dir}>
      <body className={`${rubik.variable} font-rubik`}>
        <LocaleProvider initialLocale={locale}>
          <TranslationWrapper initialLocale={locale} initialTranslations={initialTranslations}>
            <ReduxProvider>
              <NextAuthProvider session={session}>
                <CartProvider>
                  <GiftProvider>
                    <GlobalLoadingProvider>
                    <DirectionSync />
                    <PriceIconObserver />
                    {/* <Toaster position="top-right" reverseOrder={false} /> */}
                    <Toaster position="top-right" reverseOrder={false}
                      toastOptions={{
                        success: { duration: 6000 },
                        error: { duration: 5000 },
                      }}
                    />
                    <ProtectedLayout>
                      {children}
                    </ProtectedLayout>
                    </GlobalLoadingProvider>
                  </GiftProvider>
                </CartProvider>
              </NextAuthProvider>
            </ReduxProvider>
          </TranslationWrapper>
        </LocaleProvider>
      </body>
    </html>
  );
}