import { NextResponse } from "next/server";
import { GENERATE_CUSTOMER_TOKEN_MUTATION } from "@/src/graphql/mutations";
import type { GenerateCustomerTokenData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = body.username || body.email;
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 });
    }

    const data = await graphqlFetch<GenerateCustomerTokenData>({
      query: GENERATE_CUSTOMER_TOKEN_MUTATION,
      variables: { email, password },
      cache: "no-store",
    });

    return NextResponse.json({ token: data.generateCustomerToken.token }, { status: 200 });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 401 },
      );
    }
    return NextResponse.json({ message: "Login failed" }, { status: 500 });
  }
}
