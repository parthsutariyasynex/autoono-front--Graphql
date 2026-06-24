import { FavouriteProductsSkeleton, SidebarSkeleton } from "@/components/skeletons";

// /wishlist is a re-export of /favorites (see app/wishlist/page.tsx), so its
// loading state must mirror the FavouriteProducts page layout exactly:
// Sidebar + main with centered title + 6-col table (md+) / cards (<md) + pagination.
// Using WishlistSkeleton's generic 4-col card grid here caused a visible layout
// jump when the real component mounted.
export default function Loading() {
  return (
    <div className="flex flex-col w-full bg-white font-rubik">
      <div className="flex flex-col lg:flex-row flex-1 w-full">
        <SidebarSkeleton />
        <main className="flex-1 w-full px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-5 bg-white min-w-0">
          <FavouriteProductsSkeleton count={8} />
        </main>
      </div>
    </div>
  );
}
