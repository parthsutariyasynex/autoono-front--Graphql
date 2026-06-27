import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_SUBACCOUNTS_QUERY } from "@/src/graphql/queries";
import { KLEVER_CREATE_SUBACCOUNT_MUTATION } from "@/src/graphql/mutations";
import type {
  KleverCreateSubaccountData,
  KleverSubaccountsData,
} from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

export async function GET(request: Request) {
  try {
    const token = await getRequestToken(request);
    console.log("[subaccounts GET] token present:", !!token);
    console.log("[subaccounts GET] query being sent:\n", KLEVER_SUBACCOUNTS_QUERY);

    if (!token) {
      return NextResponse.json(
        { message: "Authentication required. Authorization header is missing." },
        { status: 401 },
      );
    }

    // Send the raw GraphQL request directly so we can log the full backend response
    const endpoint =
      process.env.MAGENTO_GRAPHQL_URL ||
      (process.env.NEXT_PUBLIC_MAGENTO_BASE_URL
        ? `${process.env.NEXT_PUBLIC_MAGENTO_BASE_URL}/graphql`
        : null);
    console.log("[subaccounts GET] graphql endpoint:", endpoint);

    const rawRes = await fetch(endpoint!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query: KLEVER_SUBACCOUNTS_QUERY }),
      cache: "no-store",
    });

    const rawText = await rawRes.text();
    console.log("[subaccounts GET] backend HTTP status:", rawRes.status);
    console.log("[subaccounts GET] backend response body:", rawText);

    let payload: any;
    try {
      payload = JSON.parse(rawText);
    } catch {
      console.error("[subaccounts GET] backend returned non-JSON response");
      return NextResponse.json({ message: "Upstream returned non-JSON", raw: rawText.slice(0, 500) }, { status: 502 });
    }

    if (payload.errors?.length) {
      console.error("[subaccounts GET] GraphQL errors:", JSON.stringify(payload.errors, null, 2));
      return NextResponse.json({ message: payload.errors[0]?.message, errors: payload.errors }, { status: 400 });
    }

    const result = payload.data?.kleverSubaccounts ?? { items: [], total_count: 0, parent_token: null };
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[subaccounts GET] caught error type:", Object.prototype.toString.call(error));
    console.error("[subaccounts GET] caught error:", error);
    if (isGraphQLRequestError(error)) {
      console.error("[subaccounts GET] isGraphQLRequestError: true, message:", error.message, "errors:", JSON.stringify(error.errors));
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json({ message: "Server-side error fetching sub accounts." }, { status: 500 });
  }
}

function toPermissionsArray(raw: unknown): number[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.map((v) => Number(v)).filter((n) => Number.isFinite(n));
}

export async function POST(request: Request) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    }

    const body = await request.json();
    const firstname = body.firstname;
    const lastname = body.lastname;
    const email = body.email;
    const password = body.password;

    if (!firstname || !lastname || !email || !password) {
      return NextResponse.json(
        { message: "firstname, lastname, email and password are required" },
        { status: 400 },
      );
    }

    const variables: Record<string, unknown> = {
      firstname,
      lastname,
      email,
      password,
      isActive: typeof body.isActive === "number" ? body.isActive : body.is_active ?? 1,
      permissions: toPermissionsArray(body.permissions) ?? [],
      taxvat: body.taxvat ?? null,
    };

    const data = await graphqlFetch<KleverCreateSubaccountData>({
      query: KLEVER_CREATE_SUBACCOUNT_MUTATION,
      variables,
      token,
      cache: "no-store",
    });

    return NextResponse.json(data.kleverCreateSubaccount, { status: 200 });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json({ message: "Server-side error creating sub account." }, { status: 500 });
  }
}
