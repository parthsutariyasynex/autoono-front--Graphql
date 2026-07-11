import { NextRequest, NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_QUICK_ORDER_CLEAR_ALL_MUTATION } from "@/src/graphql/mutations";
import type { KleverQuickOrderClearAllData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/lib/graphqlFetch";

async function handle(request: NextRequest) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const data = await graphqlFetch<KleverQuickOrderClearAllData>({
      query: KLEVER_QUICK_ORDER_CLEAR_ALL_MUTATION,
      token,
      cache: "no-store",
    });

    return NextResponse.json(data.kleverQuickOrderClearAll);
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export const POST = handle;
export const DELETE = handle;
