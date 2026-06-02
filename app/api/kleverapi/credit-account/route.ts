import { NextRequest, NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { getLocaleFromRequest } from "@/lib/api/magento-url";
import { KLEVER_CREDIT_ACCOUNT_QUERY } from "@/src/graphql/queries";
import type { KleverCreditAccountData } from "@/src/graphql/types";
import { graphqlFetch } from "@/src/lib/graphqlFetch";

export async function GET(request: NextRequest) {
  const token = await getRequestToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await graphqlFetch<KleverCreditAccountData>({
      query: KLEVER_CREDIT_ACCOUNT_QUERY,
      token,
      store: request.headers.get("x-store-code") || getLocaleFromRequest(request),
      cache: "no-store",
    });

    return NextResponse.json(data.kleverCreditAccount ?? { is_visible: false }, { status: 200 });
  } catch (error) {
    console.warn("[credit-account GET] GraphQL failed, hiding widget:", error);
    return NextResponse.json({ is_visible: false });
  }
}
