import { NextResponse } from "next/server";
import { RESET_PASSWORD_MUTATION } from "@/src/graphql/mutations";
import type { ResetPasswordData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/lib/graphqlFetch";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = body.email;
    const resetPasswordToken = body.resetPasswordToken ?? body.resetToken ?? body.reset_token;
    const newPassword = body.newPassword ?? body.new_password ?? body.password;

    if (!email || !resetPasswordToken || !newPassword) {
      return NextResponse.json(
        {
          message:
            "email, resetPasswordToken and newPassword are required. Magento no longer supports a separate mobile-OTP password reset — the reset link is now emailed by initiatePasswordResetWithOTP and completed via this endpoint.",
        },
        { status: 400 },
      );
    }

    const data = await graphqlFetch<ResetPasswordData>({
      query: RESET_PASSWORD_MUTATION,
      variables: { email, resetPasswordToken, newPassword },
      cache: "no-store",
    });

    return NextResponse.json(
      { success: data.resetPassword !== false, message: data.resetPassword },
      { status: 200 },
    );
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 400 },
      );
    }
    return NextResponse.json({ message: "Password reset failed" }, { status: 500 });
  }
}
