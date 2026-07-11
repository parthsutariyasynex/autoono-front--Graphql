// import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

// export function checkAuth(router: AppRouterInstance): boolean {
//   if (typeof window !== "undefined") {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       router.replace("/login");
//       return false;
//     }
//     return true;
//   }
//   return false;
// }
// app/products/api.ts
import { api } from "@/lib/api/api-client";
import { getCategoryProducts } from "@/lib/categoryProducts";
import type { Product } from "../../modules/types/product";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

// export async function fetchProducts(): Promise<Product[]> {
//   try {
//     // const data = await api.get("/products");
//     const data = await api.get("api/category-products");
//     console.log("API RESPONSE:", data);
//     return data.products ?? [];
//   } catch (error) {
//     console.error("fetchProducts error:", error);
//     return [];
//   }
// }


export async function fetchProducts(searchParams?: URLSearchParams | string): Promise<Product[]> {
  try {
    const params =
      searchParams instanceof URLSearchParams
        ? searchParams
        : new URLSearchParams(searchParams ?? "");

    const data = await getCategoryProducts({
      categoryId: params.get("categoryId") ?? "5",
      currentPage: Number(params.get("currentPage") ?? "1"),
      pageSize: Number(params.get("pageSize") ?? "20"),
      store: params.get("store") ?? undefined,
      token:
        typeof window !== "undefined" ? localStorage.getItem("token") ?? undefined : undefined,
    });

    return (data.items as unknown as Product[]) ?? [];
  } catch (error) {
    console.error("fetchProducts error:", error);
    return [];
  }
}

export async function addToCart(sku: string): Promise<Record<string, unknown>> {
  return api.post("/cart/add", { sku, qty: 1 });
}

export async function removeFromCart(itemId: number) {
  return api.delete(`/cart?itemId=${itemId}`);
}

export function checkAuth(router: AppRouterInstance): boolean {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return false;
    }
    return true;
  }
  return false;
}
