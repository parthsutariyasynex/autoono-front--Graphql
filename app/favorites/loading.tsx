import { FavouriteProductsSkeleton, SidebarSkeleton } from "@/components/skeletons";

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
