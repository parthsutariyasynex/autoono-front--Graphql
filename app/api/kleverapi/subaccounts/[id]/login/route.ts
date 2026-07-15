import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import {
  KLEVER_LOGIN_AS_SUBACCOUNT_MUTATION,
  KLEVER_LOGIN_AS_SALESPERSON_ACCOUNT_MUTATION,
} from "@/src/graphql/mutations";
import type { KleverLoginAsSubaccountData, KleverLoginAsSalespersonAccountData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ message: "Authorization required" }, { status: 401 });
    }

    const { id } = await params;
    const subaccountId = Number(id);
    if (!subaccountId) {
      return NextResponse.json({ message: "Invalid subaccount id" }, { status: 400 });
    }

    const isSalesPersonScope = new URL(request.url).searchParams.get("scope") === "salesperson";

    if (isSalesPersonScope) {
      const body = await request.json().catch(() => ({}));
      const data = await graphqlFetch<KleverLoginAsSalespersonAccountData>({
        query: KLEVER_LOGIN_AS_SALESPERSON_ACCOUNT_MUTATION,
        variables: { customerId: subaccountId, loginType: body?.loginType ?? null },
        token,
        cache: "no-store",
      });

      if (!data.kleverLoginAsSalespersonAccount) {
        return NextResponse.json({ message: "Failed to switch to account" }, { status: 500 });
      }
      return NextResponse.json(data.kleverLoginAsSalespersonAccount, { status: 200 });
    }

    const data = await graphqlFetch<KleverLoginAsSubaccountData>({
      query: KLEVER_LOGIN_AS_SUBACCOUNT_MUTATION,
      variables: { subaccountId },
      token,
      cache: "no-store",
    });

    if (!data.kleverLoginAsSubaccount) {
      return NextResponse.json({ message: "Failed to switch to sub-account" }, { status: 500 });
    }
    return NextResponse.json(data.kleverLoginAsSubaccount, { status: 200 });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json(
      { message: "Server-side error logging into sub account." },
      { status: 500 },
    );
  }
}
