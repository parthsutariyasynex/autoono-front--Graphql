import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_MY_ORDERS_QUERY } from "@/src/graphql/queries";
import type { KleverMyOrdersData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

export async function GET(request: Request) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pageSize = Number(searchParams.get("pageSize") || "10");
    const currentPage = Number(searchParams.get("currentPage") || "1");
    const status = searchParams.get("status");
    const orderNumber = searchParams.get("orderNumber");
    const companyCode = searchParams.get("companyCode");
    const customerIdRaw = searchParams.get("customerId");

    const variables: Record<string, unknown> = {
      pageSize,
      currentPage,
      orderStatus: status && status !== "All" ? status : null,
      orderNumber: orderNumber && orderNumber !== "All" ? orderNumber : null,
      companyCode: companyCode && companyCode !== "All" ? companyCode : null,
      customerId: customerIdRaw ? Number(customerIdRaw) : null,
    };

    const data = await graphqlFetch<KleverMyOrdersData>({
      query: KLEVER_MY_ORDERS_QUERY,
      variables,
      token,
      cache: "no-store",
    });

    const result = data.kleverMyOrders;
    return NextResponse.json({
      items: result?.orders ?? [],
      total_count: result?.total_count ?? 0,
    });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors, items: [], total_count: 0 },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json(
      { message: "Server error fetching orders", items: [], total_count: 0 },
      { status: 500 },
    );
  }
}
