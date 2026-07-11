import { NextRequest, NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { getLocaleFromRequest } from "@/lib/api/magento-url";
import { KLEVER_ORDER_FILTER_OPTIONS_QUERY } from "@/src/graphql/queries";
import type { KleverOrderFilterOptionsData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/lib/graphqlFetch";

export async function GET(request: NextRequest) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const store = request.headers.get("x-store-code") || getLocaleFromRequest(request);

    const data = await graphqlFetch<KleverOrderFilterOptionsData>({
      query: KLEVER_ORDER_FILTER_OPTIONS_QUERY,
      token,
      store,
      cache: "no-store",
    });

    return NextResponse.json(data.kleverOrderFilterOptions ?? {}, { status: 200 });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json({ message: "Server error fetching filter options" }, { status: 500 });
  }
}
