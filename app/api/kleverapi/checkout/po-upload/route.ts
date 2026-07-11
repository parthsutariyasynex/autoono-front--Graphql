import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { getLocaleFromRequest } from "@/lib/api/magento-url";
import { KLEVER_CHECKOUT_PO_FILES_QUERY } from "@/src/graphql/queries";
import { KLEVER_CHECKOUT_PO_UPLOAD_MUTATION } from "@/src/graphql/mutations";
import type {
  KleverCheckoutPoFilesData,
  KleverCheckoutPoUploadData,
} from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/lib/graphqlFetch";

export async function GET(req: Request) {
  try {
    const token = await getRequestToken(req);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized: Invalid token format" }, { status: 401 });
    }
    const store = req.headers.get("x-store-code") || getLocaleFromRequest(req);
    const data = await graphqlFetch<KleverCheckoutPoFilesData>({
      query: KLEVER_CHECKOUT_PO_FILES_QUERY,
      token,
      store,
      cache: "no-store",
    });
    const raw = data.kleverCheckoutPoFiles;
    console.log("[po-upload/GET] raw kleverCheckoutPoFiles:", JSON.stringify(raw));

    // Always normalise to a flat string[] regardless of what Magento returns:
    //   null | undefined          → []
    //   string[] (real JS array)  → filtered to strings
    //   string (JSON array)       → parsed and filtered
    //   string (JSON object)      → Object.values — handles PHP-style {"0":"f.pdf"}
    //   plain string              → [raw]
    let files: string[] = [];
    if (raw === null || raw === undefined) {
      files = [];
    } else if (Array.isArray(raw)) {
      files = raw.filter((f): f is string => typeof f === "string");
    } else if (typeof raw === "string") {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          files = parsed.filter((f): f is string => typeof f === "string");
        } else if (parsed && typeof parsed === "object") {
          // PHP-style associative array: {"0":"file.pdf","1":"file2.pdf"}
          files = Object.values(parsed as Record<string, unknown>)
            .filter((v): v is string => typeof v === "string");
        } else if (typeof parsed === "string" && parsed) {
          files = [parsed];
        }
      } catch {
        // Not valid JSON — treat the whole value as a single filename
        if (raw) files = [raw];
      }
    }

    console.log("[po-upload/GET] normalized files:", JSON.stringify(files));
    return NextResponse.json(files, { status: 200 });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status >= 400 ? error.status : 422 },
      );
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = await getRequestToken(req);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized: Invalid token format" }, { status: 401 });
    }
    const body = await req.json();
    const fileName = body.fileName ?? body.file_name ?? body.name;
    const fileContent = body.fileContent ?? body.file_content ?? body.content ?? body.base64;
    // Only include type when the client explicitly sends a non-null value.
    // Sending type: null as a GraphQL variable can cause Magento to reject the mutation
    // depending on how the Klever module validates its inputs server-side.
    const type: string | undefined = body.type ?? body.fileType ?? undefined;

    if (!fileName || !fileContent) {
      return NextResponse.json(
        { message: "fileName and fileContent (base64) are required" },
        { status: 400 },
      );
    }

    const store = req.headers.get("x-store-code") || getLocaleFromRequest(req);

    console.log("[po-upload] POST store:", store, "fileName:", fileName, "contentLength:", String(fileContent).length);

    const variables: Record<string, unknown> = { fileName, fileContent };
    if (type) variables.type = type;

    const data = await graphqlFetch<KleverCheckoutPoUploadData>({
      query: KLEVER_CHECKOUT_PO_UPLOAD_MUTATION,
      variables,
      token,
      store,
      cache: "no-store",
    });

    console.log("[po-upload] Magento kleverCheckoutPoUpload:", data.kleverCheckoutPoUpload);

    // Treat only an explicit truthy response as success.
    // null, false, 0, "" and empty arrays are all treated as failure.
    const uploadResult = data.kleverCheckoutPoUpload;
    const success =
      uploadResult !== false &&
      uploadResult !== null &&
      uploadResult !== "" &&
      !(Array.isArray(uploadResult) && uploadResult.length === 0);

    if (!success) {
      console.warn("[po-upload] Magento returned falsy result for kleverCheckoutPoUpload:", uploadResult);
      return NextResponse.json(
        { success: false, message: "File upload was rejected by the server. Please try again." },
        { status: 400 },
      );
    }

    // Extract the canonical backend file reference from the mutation response.
    // Magento's Klever module renames files on upload (e.g. spaces → underscores,
    // adds a timestamp suffix) and may return:
    //   - ["old.png", "newly_uploaded.png"]  ← array of ALL files; newly uploaded is LAST
    //   - "Screenshot_from_..._timestamp.png"  ← plain string
    //   - true / "1" / "true"                  ← no reference, fall back to original fileName
    // IMPORTANT: when Magento returns an array it contains every file on the cart, not just
    // the one just uploaded. The newly uploaded file is always appended at the end, so we
    // must take the LAST element — taking [0] would give a pre-existing file's backend name.
    let backendRef: string;
    if (Array.isArray(uploadResult) && uploadResult.length > 0 && typeof uploadResult[uploadResult.length - 1] === "string") {
      backendRef = uploadResult[uploadResult.length - 1];
    } else if (typeof uploadResult === "string" && uploadResult !== "true" && uploadResult !== "1") {
      backendRef = uploadResult;
    } else {
      backendRef = fileName;
    }

    console.log("[po-upload] success — fileName:", fileName, "backendRef:", backendRef);

    return NextResponse.json({ success: true, fileName, backendRef }, { status: 200 });
  } catch (error) {
    console.error("[po-upload] POST error:", error);
    if (isGraphQLRequestError(error)) {
      // Don't forward the raw errors array to the client — it duplicates the message
      // (Magento surfaces the same text in both error.message and errors[0].message).
      return NextResponse.json(
        { message: error.message },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
