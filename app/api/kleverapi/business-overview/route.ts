import { NextRequest, NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { getLocaleFromRequest } from "@/lib/api/magento-url";
import { KLEVER_BUSINESS_OVERVIEW_QUERY } from "@/src/graphql/queries";
import { KLEVER_UPDATE_BUSINESS_OVERVIEW_MUTATION } from "@/src/graphql/mutations";
import type {
  KleverBusinessOverviewData,
  KleverUpdateBusinessOverviewData,
} from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

export async function GET(request: NextRequest) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await graphqlFetch<KleverBusinessOverviewData>({
      query: KLEVER_BUSINESS_OVERVIEW_QUERY,
      token,
      store: request.headers.get("x-store-code") || getLocaleFromRequest(request),
      cache: "no-store",
    });

    return NextResponse.json(data.kleverBusinessOverview ?? {}, { status: 200 });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { error: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json({ error: "Failed to fetch business overview" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const variables = {
      totalEmployees: body.total_employees ?? body.totalEmployees ?? null,
      trucks: body.trucks ?? null,
      annualRevenue: body.annual_revenue ?? body.annualRevenue ?? null,
      businessModel: body.business_model ?? body.businessModel ?? null,
      productsOffered: body.products_offered ?? body.productsOffered ?? null,
    };

    const data = await graphqlFetch<KleverUpdateBusinessOverviewData>({
      query: KLEVER_UPDATE_BUSINESS_OVERVIEW_MUTATION,
      variables,
      token,
      store: request.headers.get("x-store-code") || getLocaleFromRequest(request),
      cache: "no-store",
    });

    return NextResponse.json(data.kleverUpdateBusinessOverview, { status: 200 });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { error: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json({ error: "Failed to update business overview" }, { status: 500 });
  }
}

export const POST = PUT;
