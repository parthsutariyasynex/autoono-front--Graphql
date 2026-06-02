import type {
  GraphQLResponse,
  GraphQLVariables,
  GraphQLErrorItem,
} from "@/src/graphql/types";

interface GraphQLFetchOptions<TVariables extends GraphQLVariables> {
  query: string;
  variables?: TVariables;
  token?: string | null;
  store?: string | null;
  revalidate?: number;
  tags?: string[];
  cache?: RequestCache;
  endpoint?: string;
}

export class GraphQLRequestError extends Error {
  readonly __isGraphQLRequestError = true as const;
  status: number;
  errors: GraphQLErrorItem[];

  constructor(message: string, status: number, errors: GraphQLErrorItem[] = []) {
    super(message);
    this.name = "GraphQLRequestError";
    this.status = status;
    this.errors = errors;
  }
}

export function isGraphQLRequestError(value: unknown): value is GraphQLRequestError {
  if (typeof value !== "object" || value === null) return false;
  const v = value as {
    __isGraphQLRequestError?: boolean;
    name?: string;
    status?: number;
  };
  return (
    v.__isGraphQLRequestError === true ||
    (v.name === "GraphQLRequestError" && typeof v.status === "number")
  );
}

function getGraphQLEndpoint(): string {
  const endpoint =
    process.env.MAGENTO_GRAPHQL_URL ||
    (process.env.NEXT_PUBLIC_MAGENTO_BASE_URL
      ? `${process.env.NEXT_PUBLIC_MAGENTO_BASE_URL}/graphql`
      : undefined);

  if (!endpoint) {
    throw new Error(
      "Missing GraphQL endpoint. Set MAGENTO_GRAPHQL_URL or NEXT_PUBLIC_MAGENTO_BASE_URL.",
    );
  }

  return endpoint;
}

export async function graphqlFetch<
  TData,
  TVariables extends GraphQLVariables = GraphQLVariables,
>({
  query,
  variables,
  token,
  store,
  revalidate,
  tags,
  cache = "no-store",
  endpoint,
}: GraphQLFetchOptions<TVariables>): Promise<TData> {
  const response = await fetch(endpoint ?? getGraphQLEndpoint(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(store ? { Store: store } : {}),
    },
    body: JSON.stringify({ query, variables }),
    cache,
    ...(revalidate || tags
      ? {
          next: {
            ...(typeof revalidate === "number" ? { revalidate } : {}),
            ...(tags?.length ? { tags } : {}),
          },
        }
      : {}),
  });

  const payload = (await response.json()) as GraphQLResponse<TData>;

  if (!response.ok || payload.errors?.length) {
    const firstError = payload.errors?.[0];
    const message =
      firstError?.debugMessage ||
      firstError?.message ||
      `GraphQL request failed with status ${response.status}`;
    throw new GraphQLRequestError(message, response.status, payload.errors ?? []);
  }

  if (!payload.data) {
    throw new GraphQLRequestError("GraphQL response did not include data.", response.status);
  }

  return payload.data;
}
