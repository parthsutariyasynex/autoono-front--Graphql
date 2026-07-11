import type {
  CategoryProductItem,
} from "@/src/graphql/types";

interface CategoryProductsApiResponse {
  items: CategoryProductItem[];
  total_count: number;
  page_info: {
    current_page: number;
    page_size: number;
    total_pages: number;
  };
}

interface GetCategoryProductsParams {
  categoryId: string;
  currentPage?: number;
  pageSize?: number;
  store?: string;
  token?: string;
}

export async function getCategoryProducts({
  categoryId,
  currentPage = 1,
  pageSize = 20,
  store,
  token,
}: GetCategoryProductsParams): Promise<CategoryProductsApiResponse> {
  const searchParams = new URLSearchParams({
    categoryId,
    currentPage: String(currentPage),
    pageSize: String(pageSize),
    ...(store ? { store } : {}),
  });

  const response = await fetch(`/api/kleverapi/category-products?${searchParams.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(store ? { Store: store } : {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message || "Unable to fetch category products.");
  }

  return response.json();
}
