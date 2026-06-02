import { NextRequest, NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { getLocaleFromRequest } from "@/lib/api/magento-url";
import { KLEVER_ACCOUNT_SIDEBAR_QUERY } from "@/src/graphql/queries";
import type { KleverAccountSidebarData } from "@/src/graphql/types";
import { graphqlFetch } from "@/src/lib/graphqlFetch";

const fallbackSidebar = {
  user_type: "customer",
  items: [
    { label: "My Account", url: "/my-account", code: "my_account", is_visible: true, sort_order: 10 },
    { label: "Dashboard", url: "/customer/dashboard", code: "dashboard", is_visible: true, sort_order: 20 },
    { label: "My Orders", url: "/my-orders", code: "my_orders", is_visible: true, sort_order: 30 },
    { label: "My Statement", url: "/customer/statement", code: "statement", is_visible: true, sort_order: 40 },
    { label: "Favorite Products", url: "/favorites", code: "favourite_products", is_visible: true, sort_order: 50 },
    { label: "Address Book", url: "/customer/address-book", code: "address_book", is_visible: true, sort_order: 60 },
    { label: "Notifications", url: "/customer/notifications", code: "notifications", is_visible: true, sort_order: 70 },
    { label: "Sign Out", url: "/logout", code: "sign_out", is_visible: true, sort_order: 999 },
  ],
};

const NO_CACHE_HEADERS = { "Cache-Control": "no-store, no-cache, must-revalidate" };

export async function GET(request: NextRequest) {
  const token = await getRequestToken(request);
  if (!token) {
    return NextResponse.json(fallbackSidebar, { headers: NO_CACHE_HEADERS });
  }

  try {
    const data = await graphqlFetch<KleverAccountSidebarData>({
      query: KLEVER_ACCOUNT_SIDEBAR_QUERY,
      token,
      store: request.headers.get("x-store-code") || getLocaleFromRequest(request),
      cache: "no-store",
    });

    if (!data.kleverAccountSidebar) {
      return NextResponse.json(fallbackSidebar, { headers: NO_CACHE_HEADERS });
    }
    return NextResponse.json(data.kleverAccountSidebar, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.warn("[account-sidebar] GraphQL failed, serving fallback:", error);
    return NextResponse.json(fallbackSidebar, { headers: NO_CACHE_HEADERS });
  }
}
