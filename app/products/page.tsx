import { Suspense } from "react";
import ProductsPage from "@/components/ProductsListing";
import { ProductListingSkeleton } from "@/components/skeletons";

export default function ProductsRoute() {
  return (
    <Suspense fallback={<ProductListingSkeleton count={12} />}>
      <ProductsPage />
    </Suspense>
  );
}
