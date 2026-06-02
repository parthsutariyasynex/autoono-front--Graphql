import { NextRequest, NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { getLocaleFromRequest } from "@/lib/api/magento-url";
import { KLEVER_CUSTOMER_TARGET_DASHBOARD_QUERY } from "@/src/graphql/queries";
import type { KleverCustomerTargetDashboardData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

export async function GET(request: NextRequest) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const searchYear = searchParams.get("searchYear");
    const compareYear = searchParams.get("compareYear");

    const data = await graphqlFetch<KleverCustomerTargetDashboardData>({
      query: KLEVER_CUSTOMER_TARGET_DASHBOARD_QUERY,
      variables: {
        searchYear: searchYear ? Number(searchYear) : null,
        compareYear: compareYear ? Number(compareYear) : null,
      },
      token,
      store: request.headers.get("x-store-code") || getLocaleFromRequest(request),
      cache: "no-store",
    });

    return NextResponse.json(data.kleverCustomerTargetDashboard ?? {}, { status: 200 });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json({ message: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
