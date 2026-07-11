import { NextRequest, NextResponse } from "next/server";
import { getLocaleFromRequest } from "@/lib/api/magento-url";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_CATEGORY_FILTER_OPTIONS_QUERY } from "@/src/graphql/queries";
import type {
  KleverCategoryFilterOptionsData,
  KleverFilterGroup,
} from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/lib/graphqlFetch";

const KEY_MAP: Record<string, string> = {
  color: "tyre_size",
  manufacturer: "origin",
  mgs_brand: "brand",
  productGroup: "product_group",
  warrantyPeriod: "warranty_period",
  newArrivals: "new_arrivals",
  partsCategory: "parts_category",
  oilType: "oil_type",
  oilGrade: "grade",
  itemCode: "item_code",
};

function normalizeFilters(filters: KleverFilterGroup[]): KleverFilterGroup[] {
  return filters.map((f) => ({
    ...f,
    code: KEY_MAP[f.code] ?? f.code,
  }));
}

export async function GET(request: NextRequest) {
  try {
    const token = await getRequestToken(request);
    const { searchParams } = new URL(request.url);
    const categoryId = Number(searchParams.get("categoryId"));

    if (!categoryId) {
      return NextResponse.json({ filters: [] });
    }

    const data = await graphqlFetch<KleverCategoryFilterOptionsData>({
      query: KLEVER_CATEGORY_FILTER_OPTIONS_QUERY,
      variables: { categoryId },
      token,
      store: request.headers.get("x-store-code") || getLocaleFromRequest(request),
      revalidate: 300,
      tags: [`filters:${categoryId}`],
    });

    const filters = normalizeFilters(data.kleverCategoryFilterOptions?.filters ?? []);
    return NextResponse.json({ filters });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { error: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch filters" },
      { status: 500 },
    );
  }
}
