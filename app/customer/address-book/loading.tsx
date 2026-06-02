import { AddressBookSkeleton, SidebarSkeleton } from "@/components/skeletons";

// Same wrapper pattern as app/wishlist/loading.tsx so the skeleton gets a
// guaranteed flex column to render into. Without `min-h-screen` + the
// `<main className="flex-1">` wrapper, the main area can collapse to zero
// height during the brief navigation transition and leave a blank screen.
export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col w-full bg-white font-rubik">
      <div className="flex flex-col lg:flex-row flex-1 w-full">
        <SidebarSkeleton />
        <main className="flex-1 w-full px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-10 bg-white min-w-0">
          <AddressBookSkeleton />
        </main>
      </div>
    </div>
  );
}
