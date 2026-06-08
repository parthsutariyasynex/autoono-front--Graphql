import { SidebarSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col w-full bg-white font-rubik">
      <div className="flex flex-col lg:flex-row flex-1 w-full">
        <SidebarSkeleton />
        <main className="flex-1 w-full px-4 md:px-8 lg:px-10 py-6 md:py-10 bg-white min-w-0" />
      </div>
    </div>
  );
}
