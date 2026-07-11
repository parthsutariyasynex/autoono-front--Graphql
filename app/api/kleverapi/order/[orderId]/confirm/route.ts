import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_CONFIRM_ORDER_MUTATION } from "@/src/graphql/mutations";
import type { KleverConfirmOrderData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/lib/graphqlFetch";

interface RawAttachment {
  fileName?: string;
  file_name?: string;
  fileContent?: string;
  file_content?: string;
  base64?: string;
  fileType?: string;
  file_type?: string;
  mime_type?: string;
}

function toAttachmentInputs(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item: unknown) => {
      const r = (item ?? {}) as RawAttachment;
      const fileName = r.fileName ?? r.file_name;
      const fileContent = r.fileContent ?? r.file_content ?? r.base64;
      const fileType = r.fileType ?? r.file_type ?? r.mime_type ?? null;
      if (!fileName || !fileContent) return null;
      return { fileName, fileContent, fileType };
    })
    .filter((v): v is { fileName: string; fileContent: string; fileType: string | null } => v !== null);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { orderId } = await params;
    const id = Number(orderId);
    if (!id) {
      return NextResponse.json({ message: "Invalid order id" }, { status: 400 });
    }

    const body = await request.json();
    const comment = body.comment ?? body.message ?? "";
    const attachments = toAttachmentInputs(body.attachments);

    const data = await graphqlFetch<KleverConfirmOrderData>({
      query: KLEVER_CONFIRM_ORDER_MUTATION,
      variables: {
        orderId: id,
        request: { comment, attachments },
      },
      token,
      cache: "no-store",
    });
    return NextResponse.json(data.kleverConfirmOrder, { status: 200 });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json({ message: "Server error confirming order" }, { status: 500 });
  }
}
