import { NextRequest, NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { getLocaleFromRequest } from "@/lib/api/magento-url";
import { KLEVER_CREDIT_ACCOUNT_QUERY } from "@/src/graphql/queries";
import type { KleverCreditAccountData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

export async function GET(request: NextRequest) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await graphqlFetch<KleverCreditAccountData>({
      query: KLEVER_CREDIT_ACCOUNT_QUERY,
      token,
      store: request.headers.get("x-store-code") || getLocaleFromRequest(request),
      cache: "no-store",
    });

    return NextResponse.json(data.kleverCreditAccount ?? {}, { status: 200 });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { error: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json({ error: "Failed to fetch credit account info" }, { status: 500 });
  }
}
