import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_CHECKOUT_PO_FILES_QUERY } from "@/src/graphql/queries";
import { KLEVER_CHECKOUT_PO_UPLOAD_MUTATION } from "@/src/graphql/mutations";
import type {
  KleverCheckoutPoFilesData,
  KleverCheckoutPoUploadData,
} from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

export async function GET(req: Request) {
  try {
    const token = await getRequestToken(req);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized: Invalid token format" }, { status: 401 });
    }
    const data = await graphqlFetch<KleverCheckoutPoFilesData>({
      query: KLEVER_CHECKOUT_PO_FILES_QUERY,
      token,
      cache: "no-store",
    });
    const raw = data.kleverCheckoutPoFiles;
    let files: unknown = raw;
    if (typeof raw === "string") {
      try {
        files = JSON.parse(raw);
      } catch {
        files = raw ? [{ name: raw }] : [];
      }
    }
    return NextResponse.json(files ?? [], { status: 200 });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
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
    const type = body.type ?? body.fileType ?? null;
    if (!fileName || !fileContent) {
      return NextResponse.json(
        { message: "fileName and fileContent (base64) are required" },
        { status: 400 },
      );
    }
    const data = await graphqlFetch<KleverCheckoutPoUploadData>({
      query: KLEVER_CHECKOUT_PO_UPLOAD_MUTATION,
      variables: { fileName, fileContent, type },
      token,
      cache: "no-store",
    });
    return NextResponse.json(
      { success: data.kleverCheckoutPoUpload !== false, fileName },
      { status: 200 },
    );
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
