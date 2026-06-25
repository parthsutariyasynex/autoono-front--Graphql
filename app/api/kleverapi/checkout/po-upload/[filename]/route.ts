import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { getLocaleFromRequest } from "@/lib/api/magento-url";
import { KLEVER_CHECKOUT_PO_REMOVE_FILE_MUTATION } from "@/src/graphql/mutations";
import type { KleverCheckoutPoRemoveFileData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

const MAGENTO_BASE_URL = process.env.NEXT_PUBLIC_MAGENTO_BASE_URL || "";

/**
 * GET /api/kleverapi/checkout/po-upload/[filename]
 * Redirects to the Magento media URL where the PO file is stored.
 * Magento's Klever module stores uploaded PO files under /media/klever/po_files/.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  try {
    const token = await getRequestToken(req);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { filename } = await params;
    const decodedFilename = decodeURIComponent(filename);
    if (!decodedFilename) {
      return NextResponse.json({ message: "filename is required" }, { status: 400 });
    }

    if (!MAGENTO_BASE_URL) {
      console.error("[po-upload/GET] NEXT_PUBLIC_MAGENTO_BASE_URL is not configured");
      return NextResponse.json({ message: "File server not configured" }, { status: 500 });
    }

    const fileUrl = `${MAGENTO_BASE_URL}/media/klever/po_files/${encodeURIComponent(decodedFilename)}`;
    console.log("[po-upload/GET] redirecting to:", fileUrl);

    return NextResponse.redirect(fileUrl);
  } catch (error) {
    console.error("[po-upload/GET] error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/kleverapi/checkout/po-upload/[filename]
 * Removes the named PO file from the Magento cart via GraphQL.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  try {
    const token = await getRequestToken(req);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { filename } = await params;
    const fileName = decodeURIComponent(filename);
    if (!fileName) {
      return NextResponse.json({ message: "filename is required" }, { status: 400 });
    }

    const store = req.headers.get("x-store-code") || getLocaleFromRequest(req);

    console.log("[po-upload/DELETE] store:", store, "fileName:", fileName);

    const data = await graphqlFetch<KleverCheckoutPoRemoveFileData>({
      query: KLEVER_CHECKOUT_PO_REMOVE_FILE_MUTATION,
      variables: { fileName },
      token,
      store,
      cache: "no-store",
    });
    return NextResponse.json(
      { success: data.kleverCheckoutPoRemoveFile !== false, fileName },
      { status: 200 },
    );
  } catch (error) {
    console.error("[po-upload/DELETE] error:", error);
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status >= 400 ? error.status : 422 },
      );
    }
    // Surface the real error message rather than a generic string so the client
    // can show something actionable (e.g. Magento's "No such entity" or JSON parse error).
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
