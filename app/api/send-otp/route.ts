import { NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/api/magento-url";

// REST workaround for OTP send.
//
// The GraphQL `sendOtpToCustomer` mutation takes a single `mobile` arg and
// enforces a ≤ 9-digit validator, so E.164 numbers like "+971544472854" are
// rejected. The REST endpoint accepts `mobile` (local 9-digit) and
// `countryCode` separately and works for Saudi/UAE numbers.
//
// Frontend contract is unchanged — same request body, same response shape.
// Revisit this once the backend GraphQL mutation accepts countryCode as a
// separate argument.

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawMobile = body.mobile;
    const rawCountryCode = body.countryCode ?? body.country_code ?? "";
    const eventType = body.eventType ?? body.event_type ?? "login";
    const resend = typeof body.resend === "number" ? body.resend : 0;

    if (!rawMobile) {
      return NextResponse.json({ message: "Mobile is required" }, { status: 400 });
    }

    // Defensive: strip any leading "+" or country prefix the caller might
    // have accidentally prepended. Backend wants the bare local number.
    let mobile = String(rawMobile).trim();
    const countryCode = String(rawCountryCode).trim();
    if (mobile.startsWith("+") && countryCode && mobile.startsWith(countryCode)) {
      mobile = mobile.slice(countryCode.length);
    } else if (mobile.startsWith("+")) {
      mobile = mobile.replace(/^\+\d{1,3}/, "");
    }

    const baseUrl = getBaseUrl(request);
    const upstream = await fetch(`${baseUrl}/auth/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile, countryCode, eventType, resend }),
      cache: "no-store",
    });

    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      return NextResponse.json(
        { success: false, message: data?.message || "Failed to send OTP" },
        { status: upstream.status >= 400 ? upstream.status : 400 },
      );
    }

    return NextResponse.json(
      {
        success: Boolean(data?.success ?? true),
        message: data?.message || "OTP sent",
        ...(typeof data?.resend_count === "number" ? { resend_count: data.resend_count } : {}),
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json({ message: "Failed to send OTP" }, { status: 500 });
  }
}
