import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { CHANGE_CUSTOMER_PASSWORD_MUTATION } from "@/src/graphql/mutations";
import type { ChangeCustomerPasswordData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

export async function POST(req: Request) {
  try {
    const token = await getRequestToken(req);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const currentPassword = body.currentPassword ?? body.current_password ?? body.oldPassword;
    const newPassword = body.newPassword ?? body.new_password ?? body.password;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { message: "currentPassword and newPassword are required" },
        { status: 400 },
      );
    }

    const data = await graphqlFetch<ChangeCustomerPasswordData>({
      query: CHANGE_CUSTOMER_PASSWORD_MUTATION,
      variables: { currentPassword, newPassword },
      token,
      cache: "no-store",
    });

    return NextResponse.json({ success: true, customer: data.changeCustomerPassword }, { status: 200 });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 400 },
      );
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
