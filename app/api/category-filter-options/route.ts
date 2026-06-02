import { NextRequest, NextResponse } from "next/server";
import { getLocaleFromRequest } from "@/lib/api/magento-url";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_CATEGORY_FILTER_OPTIONS_QUERY } from "@/src/graphql/queries";
import type { KleverCategoryFilterOptionsData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

export async function GET(request: NextRequest) {
  try {
    const token = await getRequestToken(request);
    const { searchParams } = new URL(request.url);
    const categoryId = Number(searchParams.get("categoryId"));

    if (!categoryId) {
      return NextResponse.json([]);
    }

    const data = await graphqlFetch<KleverCategoryFilterOptionsData>({
      query: KLEVER_CATEGORY_FILTER_OPTIONS_QUERY,
      variables: { categoryId },
      token,
      store: request.headers.get("x-store-code") || getLocaleFromRequest(request),
      revalidate: 300,
      tags: [`category-filter-options:${categoryId}`],
    });

    return NextResponse.json(data.kleverCategoryFilterOptions ?? { filters: [] });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { error: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch filter options" },
      { status: 500 },
    );
  }
}
