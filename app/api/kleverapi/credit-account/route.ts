import { NextRequest, NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { getLocaleFromRequest } from "@/lib/api/magento-url";
import { KLEVER_CREDIT_ACCOUNT_QUERY } from "@/src/graphql/queries";
import type { KleverCreditAccountData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

// Resolve the REAL store-view code (e.g. V101_en, WJ01_en) the same way the
// other account APIs receive it. The kleverCreditAccount resolver is
// store-scoped — passing only "en"/"ar" makes it reject with
// "current customer isn't authorized", so the store code must be resolved here.
//   1. x-store-code header (set by middleware from the NEXT_STORE cookie)
//   2. "store" header (some callers send this directly)
//   3. NEXT_STORE cookie read directly (in case the header wasn't forwarded)
//   4. locale fallback ("en"/"ar") — last resort only
function resolveStore(request: NextRequest): string {
  return (
    request.headers.get("x-store-code") ||
    request.headers.get("store") ||
    request.cookies.get("NEXT_STORE")?.value ||
    getLocaleFromRequest(request)
  );
}

export async function GET(request: NextRequest) {
  const token = await getRequestToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const store = resolveStore(request);

  try {
    const data = await graphqlFetch<KleverCreditAccountData>({
      query: KLEVER_CREDIT_ACCOUNT_QUERY,
      token,
      store,
      cache: "no-store",
    });

    // Magento returns the credit account, or { is_visible: false } for
    // customers who genuinely don't have a visible credit account.
    return NextResponse.json(data.kleverCreditAccount ?? { is_visible: false }, { status: 200 });
  } catch (error) {
    // Authorization/permission → this customer legitimately has no visible
    // credit account. Hide the widget gracefully (200, is_visible:false).
    // The store code is logged so a future store-scope regression (e.g. store
    // resolving back to "en") is obvious in logs rather than silently masked.
    if (
      isGraphQLRequestError(error) &&
      (error.status === 401 || error.status === 403 || /authoriz/i.test(error.message))
    ) {
      console.warn(
        `[credit-account] Not authorized (store="${store}") — hiding widget: ${error.message}`,
      );
      return NextResponse.json({ is_visible: false }, { status: 200 });
    }

    // Unexpected failure (network / 5xx / schema). Log clearly and surface a
    // real error status — do NOT mask it as a legitimately-hidden widget.
    // The UI still degrades gracefully (the component renders nothing on error).
    console.error(`[credit-account] Unexpected failure (store="${store}"):`, error);
    return NextResponse.json(
      { error: "Failed to fetch credit account info" },
      { status: 500 },
    );
  }
}
