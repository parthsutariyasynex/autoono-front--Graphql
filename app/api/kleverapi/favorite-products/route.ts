import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_FAVORITE_PRODUCTS_QUERY } from "@/src/graphql/queries";
import { KLEVER_ADD_FAVORITE_PRODUCT_MUTATION } from "@/src/graphql/mutations";
import type {
  KleverAddFavoriteProductData,
  KleverFavoriteProductsData,
} from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

export async function GET(request: Request) {
  const isDev = process.env.NODE_ENV !== "production";
  try {
    const token = await getRequestToken(request);
    if (isDev) {
      console.log(`[favorite-products] token present: ${!!token}${token ? ` (len=${token.length})` : ""}`);
    }
    if (!token) {
      return NextResponse.json({ message: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const currentPage = Number(searchParams.get("currentPage") || "1");
    const pageSize = Number(searchParams.get("pageSize") || "10");
    const storeCode = request.headers.get("x-store-code") || undefined;

    const data = await graphqlFetch<KleverFavoriteProductsData>({
      query: KLEVER_FAVORITE_PRODUCTS_QUERY,
      variables: { pageSize, currentPage },
      token,
      store: storeCode,
      cache: "no-store",
    });

    const payload = data.kleverFavoriteProducts ?? { products: [], total_count: 0 };
    if (isDev) {
      console.log(
        `[favorite-products] OK — page=${currentPage} size=${pageSize} ` +
        `returned=${payload.products?.length ?? 0} total=${payload.total_count ?? 0}`,
      );
    }
    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      console.error(
        `[favorite-products] GraphQL error: status=${error.status} message=${error.message}`,
        error.errors,
      );
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    console.error("[favorite-products] Unexpected error:", error);
    return NextResponse.json(
      { message: "Server-side error fetching favorites." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ message: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const productId = Number(body.productId ?? body.product_id ?? body.id);
    if (!productId) {
      return NextResponse.json({ message: "productId is required" }, { status: 400 });
    }
    const storeCode = request.headers.get("x-store-code") || undefined;

    const data = await graphqlFetch<KleverAddFavoriteProductData>({
      query: KLEVER_ADD_FAVORITE_PRODUCT_MUTATION,
      variables: { productId },
      token,
      store: storeCode,
      cache: "no-store",
    });

    return NextResponse.json(
      { success: data.kleverAddFavoriteProduct !== false, product_id: productId },
      { status: 200 },
    );
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json(
      { message: "Server-side error adding to favorites." },
      { status: 500 },
    );
  }
}
