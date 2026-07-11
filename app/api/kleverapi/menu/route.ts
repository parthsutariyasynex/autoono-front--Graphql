
import { NextRequest, NextResponse } from "next/server";
import { getLocaleFromRequest } from "@/lib/api/magento-url";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_MENU_ITEMS_QUERY } from "@/src/graphql/queries";
import { GENERATE_CUSTOMER_TOKEN_MUTATION } from "@/src/graphql/mutations";
import type {
  GenerateCustomerTokenData,
  KleverMenuItem,
  KleverMenuItemsData,
} from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/lib/graphqlFetch";

interface MenuItem {
  code: string | null;
  label: string;
  href: string;
  magentoUrl: string;
  categoryId: string | null;
  sort_order: number;
  is_visible: boolean;
}

function magentoUrlToPath(url: string): string {
  if (!url) return "#";
  try {
    const parsed = new URL(url);
    const p = parsed.pathname.replace(/\.html$/, "");
    return (p || "#") + parsed.search;
  } catch {
    return url;
  }
}

function toMenuItem(node: KleverMenuItem): MenuItem {
  const url = node.url || "";
  return {
    code: node.code,
    label: node.label,
    href: magentoUrlToPath(url),
    magentoUrl: url,
    categoryId: node.category_id != null ? String(node.category_id) : null,
    sort_order: typeof node.sort_order === "number" ? node.sort_order : 0,
    is_visible:
      node.is_visible === null || node.is_visible === undefined
        ? true
        : Boolean(node.is_visible),
  };
}

let serviceTokenCache: { token: string; expires: number } | null = null;
const SERVICE_TOKEN_TTL_MS = 50 * 60 * 1000;

type ServiceTokenSource = "env-pinned" | "env-cached" | "env-fresh" | "missing-env" | "login-failed";

async function getServiceToken(
  _request: NextRequest,
): Promise<{ token: string | null; source: ServiceTokenSource }> {
  if (process.env.MAGENTO_MENU_TOKEN) {
    return { token: process.env.MAGENTO_MENU_TOKEN, source: "env-pinned" };
  }

  if (serviceTokenCache && serviceTokenCache.expires > Date.now()) {
    return { token: serviceTokenCache.token, source: "env-cached" };
  }

  const email = process.env.MAGENTO_SERVICE_EMAIL;
  const password = process.env.MAGENTO_SERVICE_PASSWORD;
  if (!email || !password) {
    return { token: null, source: "missing-env" };
  }

  try {
    const data = await graphqlFetch<GenerateCustomerTokenData>({
      query: GENERATE_CUSTOMER_TOKEN_MUTATION,
      variables: { email, password },
      cache: "no-store",
    });
    const token = data.generateCustomerToken?.token ?? null;
    if (!token) {
      return { token: null, source: "login-failed" };
    }
    serviceTokenCache = { token, expires: Date.now() + SERVICE_TOKEN_TTL_MS };
    return { token, source: "env-fresh" };
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[menu] Service-token login failed:", (e as Error)?.message);
    }
    return { token: null, source: "login-failed" };
  }
}

const MENU_CACHE_TTL_MS = 60 * 60 * 1000;
const menuCache = new Map<string, { items: MenuItem[]; expires: number }>();

export async function GET(request: NextRequest) {
  const isDev = process.env.NODE_ENV !== "production";
  const locale = getLocaleFromRequest(request);
  const cacheKey = locale || "default";

  const cached = menuCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    if (isDev) console.log(`[menu] cache HIT (locale=${cacheKey}, items=${cached.items.length})`);
    return jsonResponse(cached.items);
  }

  // Resolve token. Prefer the caller's customer token; fall back to a service
  // token for anonymous visitors. Log the source so it's obvious which path
  // ran when the menu comes back empty.
  let tokenSource: "request" | ServiceTokenSource = "missing-env";
  let token = await getRequestToken(request);
  if (token) {
    tokenSource = "request";
  } else {
    const svc = await getServiceToken(request);
    token = svc.token;
    tokenSource = svc.source;
  }
  if (isDev) {
    console.log(`[menu] token source: ${tokenSource} (locale=${cacheKey})`);
  }

  if (!token) {
    // Try guest (unauthenticated) GraphQL call — many Magento setups allow
    // public menu queries without a customer token.
    try {
      const data = await graphqlFetch<KleverMenuItemsData>({
        query: KLEVER_MENU_ITEMS_QUERY,
        token: null,
        store: request.headers.get("x-store-code") || locale,
        revalidate: 3600,
        tags: [`menu:${cacheKey}`],
      });
      const items = (data.kleverMenuItems ?? [])
        .map(toMenuItem)
        .filter((item) => item.is_visible)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      menuCache.set(cacheKey, { items, expires: Date.now() + MENU_CACHE_TTL_MS });
      return jsonResponse(items);
    } catch {
      console.warn(`[menu] Guest GraphQL call failed (locale=${cacheKey}) — returning empty menu`);
      return jsonResponse([]);
    }
  }

  try {
    const data = await graphqlFetch<KleverMenuItemsData>({
      query: KLEVER_MENU_ITEMS_QUERY,
      token,
      store: request.headers.get("x-store-code") || locale,
      revalidate: 3600,
      tags: [`menu:${cacheKey}`],
    });

    const items = (data.kleverMenuItems ?? [])
      .map(toMenuItem)
      .filter((item) => item.is_visible)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    if (isDev) {
      console.log(
        `[menu] fetched OK (locale=${cacheKey}, source=${tokenSource}, raw=${data.kleverMenuItems?.length ?? 0}, visible=${items.length})`,
      );
    }
    menuCache.set(cacheKey, { items, expires: Date.now() + MENU_CACHE_TTL_MS });
    return jsonResponse(items);
  } catch (error) {
    if (cached) {
      console.warn(`[menu] GraphQL failed, serving stale cache (locale=${cacheKey})`);
      return jsonResponse(cached.items);
    }
    // If the request token was rejected (e.g. expired customer JWT), retry
    // once with the service token so a logged-in user with a stale token
    // still sees the menu the same way an anonymous visitor would.
    if (
      tokenSource === "request" &&
      isGraphQLRequestError(error) &&
      (error.status === 401 || /authoriz/i.test(error.message))
    ) {
      const svc = await getServiceToken(request);
      if (svc.token) {
        try {
          const data = await graphqlFetch<KleverMenuItemsData>({
            query: KLEVER_MENU_ITEMS_QUERY,
            token: svc.token,
            store: request.headers.get("x-store-code") || locale,
            revalidate: 3600,
            tags: [`menu:${cacheKey}`],
          });
          const items = (data.kleverMenuItems ?? [])
            .map(toMenuItem)
            .filter((item) => item.is_visible)
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
          if (isDev) {
            console.log(
              `[menu] request token rejected; service-token retry succeeded (locale=${cacheKey}, items=${items.length})`,
            );
          }
          menuCache.set(cacheKey, { items, expires: Date.now() + MENU_CACHE_TTL_MS });
          return jsonResponse(items);
        } catch (retryErr) {
          if (isGraphQLRequestError(retryErr)) {
            console.error("[menu] Service-token retry also failed:", retryErr.status, retryErr.message);
          } else {
            console.error("[menu] Service-token retry threw:", retryErr);
          }
        }
      }
    }
    if (isGraphQLRequestError(error)) {
      console.error(`[menu] GraphQL error (source=${tokenSource}, locale=${cacheKey}):`, error.status, error.message, error.errors);
    } else {
      console.error(`[menu] Unexpected error (source=${tokenSource}, locale=${cacheKey}):`, error);
    }
    return NextResponse.json([], { status: 200 });
  }
}

function jsonResponse(items: MenuItem[]) {
  return new Response(JSON.stringify(items), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, max-age=300, stale-while-revalidate=3600",
    },
  });
}
