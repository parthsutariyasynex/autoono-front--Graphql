import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_EXPORT_ORDERS_QUERY } from "@/src/graphql/queries";
import type { KleverExportOrdersData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/lib/graphqlFetch";

export async function GET(request: Request) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const data = await graphqlFetch<KleverExportOrdersData>({
      query: KLEVER_EXPORT_ORDERS_QUERY,
      token,
      cache: "no-store",
    });

    if (!data.kleverExportOrders) {
      return NextResponse.json({ message: "Export not available" }, { status: 404 });
    }
    return NextResponse.json(data.kleverExportOrders, { status: 200 });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json({ message: "Server error exporting orders" }, { status: 500 });
  }
}
