import { NextResponse } from "next/server";
import { INITIATE_PASSWORD_RESET_WITH_OTP_MUTATION } from "@/src/graphql/mutations";
import type { InitiatePasswordResetWithOtpData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

const DEFAULT_WEBSITE_ID = Number(process.env.MAGENTO_WEBSITE_ID || "1");
const DEFAULT_TEMPLATE = process.env.MAGENTO_PASSWORD_RESET_TEMPLATE || "email_reset";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawMobile = body.mobile;
    const otp = body.otp;
    const countryCode = body.countryCode ?? body.country_code ?? "";
    const websiteId = typeof body.websiteId === "number" ? body.websiteId : DEFAULT_WEBSITE_ID;
    const template = body.template ?? DEFAULT_TEMPLATE;

    if (!rawMobile || !otp) {
      return NextResponse.json({ message: "Mobile and OTP are required" }, { status: 400 });
    }

    const mobile = String(rawMobile).startsWith("+")
      ? String(rawMobile)
      : `${countryCode || ""}${rawMobile}`;

    const data = await graphqlFetch<InitiatePasswordResetWithOtpData>({
      query: INITIATE_PASSWORD_RESET_WITH_OTP_MUTATION,
      variables: { mobile, otp, template, websiteId },
      cache: "no-store",
    });

    return NextResponse.json(
      {
        success: true,
        message: data.initiatePasswordResetWithOTP.message,
        resetToken: null,
      },
      { status: 200 },
    );
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 400 },
      );
    }
    return NextResponse.json({ message: "OTP verification failed" }, { status: 500 });
  }
}
