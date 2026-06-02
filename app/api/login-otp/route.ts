import { NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/api/magento-url";

// REST workaround for OTP login.
//
// Same backend defect as /api/send-otp: the GraphQL `createCustomerTokenWithOtp`
// mutation rejects mobile numbers > 9 digits, so E.164 prefixes break it.
// REST `/login/otp` accepts `mobile` + `countryCode` separately. Revert when
// backend GraphQL supports countryCode as a separate argument.

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawMobile = body.mobile;
    const otp = body.otp;
    const rawCountryCode = body.countryCode ?? body.country_code ?? "";

    if (!rawMobile || !otp) {
      return NextResponse.json({ message: "Mobile and OTP are required" }, { status: 400 });
    }

    let mobile = String(rawMobile).trim();
    const countryCode = String(rawCountryCode).trim();
    if (mobile.startsWith("+") && countryCode && mobile.startsWith(countryCode)) {
      mobile = mobile.slice(countryCode.length);
    } else if (mobile.startsWith("+")) {
      mobile = mobile.replace(/^\+\d{1,3}/, "");
    }

    const baseUrl = getBaseUrl(req);
    const upstream = await fetch(`${baseUrl}/login/otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile, otp, countryCode }),
      cache: "no-store",
    });

    const data = await upstream.json().catch(() => null);
    if (!upstream.ok || !data) {
      return NextResponse.json(
        { message: data?.message || "OTP login failed" },
        { status: upstream.status >= 400 ? upstream.status : 401 },
      );
    }

    const token = data.token || data?.customer?.token || null;
    if (!token) {
      return NextResponse.json(
        { message: data.message || "OTP login failed" },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { token, message: data.message ?? null },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json({ message: "OTP login failed" }, { status: 500 });
  }
}
