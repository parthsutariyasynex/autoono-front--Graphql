import { NextRequest, NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_FORECAST_LIST_QUERY } from "@/src/graphql/queries";
import { KLEVER_UPLOAD_FORECAST_MUTATION } from "@/src/graphql/mutations";
import type {
  KleverForecastListData,
  KleverUploadForecastData,
} from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

export async function GET(request: NextRequest) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const pageSize = Number(searchParams.get("pageSize") || "10");
    const currentPage = Number(searchParams.get("currentPage") || "1");

    const data = await graphqlFetch<KleverForecastListData>({
      query: KLEVER_FORECAST_LIST_QUERY,
      variables: { pageSize, currentPage },
      token,
      cache: "no-store",
    });

    return NextResponse.json(
      data.kleverForecastList ?? { items: [], total_count: 0 },
      { status: 200 },
    );
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    }

    let fileName: string | null = null;
    let fileContent: string | null = null;
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") ?? formData.get("forecast");
      if (file && file instanceof File) {
        fileName = file.name;
        const buffer = Buffer.from(await file.arrayBuffer());
        fileContent = buffer.toString("base64");
      }
    } else {
      const body = await request.json();
      fileName = body.fileName ?? body.file_name ?? null;
      fileContent = body.fileContent ?? body.file_content ?? body.base64 ?? null;
    }

    if (!fileName || !fileContent) {
      return NextResponse.json(
        { message: "file (multipart) or {fileName, fileContent} required" },
        { status: 400 },
      );
    }

    const data = await graphqlFetch<KleverUploadForecastData>({
      query: KLEVER_UPLOAD_FORECAST_MUTATION,
      variables: { fileName, fileContent },
      token,
      cache: "no-store",
    });

    return NextResponse.json(data.kleverUploadForecast ?? {}, { status: 200 });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
