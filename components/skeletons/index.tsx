"use client";

import { usePathname } from "next/navigation";

// ─── Skeleton primitives ──────────────────────────────────────────────────────
const Pulse = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

// ─── Navbar Skeleton ──────────────────────────────────────────────────────────
export function NavbarSkeleton() {
  return (
    <header className="w-full bg-white border-b border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      {/* Main bar — real navbar h-[56px] sm:h-[64px] lg:h-[72px] */}
      <div className="h-[56px] sm:h-[64px] lg:h-[72px] flex items-center justify-between px-3 sm:px-5 lg:px-8 xl:px-14">
        {/* Logo */}
        <Pulse className="h-6 sm:h-8 lg:h-10 w-24 sm:w-32 lg:w-40" />
        {/* Right side: account pill + search + notif + cart at md+, cart only below */}
        <div className="flex items-center gap-3 sm:gap-4 lg:gap-6">
          <Pulse className="hidden md:block h-8 w-32 lg:w-48 rounded-full" />
          <Pulse className="hidden md:block h-7 w-7 sm:h-8 sm:w-8 rounded-full" />
          <Pulse className="hidden md:block h-7 w-7 sm:h-8 sm:w-8 rounded-full" />
          <Pulse className="h-7 w-7 sm:h-8 sm:w-8 rounded-full" />
        </div>
      </div>
      {/* Secondary nav bar — md+ (matches real navbar), bg-primary, ~h-9 */}
      <div className="hidden md:flex bg-primary h-9 items-center justify-center gap-8 px-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-3 w-20 bg-black/10 rounded animate-pulse" />
        ))}
      </div>
    </header>
  );
}

// ─── Sidebar Skeleton ─────────────────────────────────────────────────────────
export function SidebarSkeleton() {
  return (
    <aside className="w-full lg:w-56 xl:w-64 flex-shrink-0 bg-surfaceMuted border-b lg:border-b-0 ltr:lg:border-r rtl:lg:border-l border-gray-200 z-30 sticky top-[56px] sm:top-[64px] lg:top-[108px] h-auto lg:h-[calc(100vh-108px)] overflow-hidden">
      <nav className="p-0 lg:p-4">
        <ul className="flex flex-row lg:flex-col space-y-0 lg:space-y-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <li key={i} className="flex-shrink-0 px-6 lg:px-4 py-3">
              <Pulse className="h-4 w-full max-w-[140px] rounded" />
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

// ─── Product Card Skeleton ────────────────────────────────────────────────────
export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-100 overflow-hidden animate-pulse">
      <Pulse className="w-full aspect-square" />
      <div className="p-3 space-y-2">
        <Pulse className="h-4 w-3/4 rounded" />
        <Pulse className="h-3 w-1/2 rounded" />
        <div className="flex items-center justify-between pt-1">
          <Pulse className="h-5 w-16 rounded" />
          <Pulse className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ─── Product Listing Skeleton ─────────────────────────────────────────────────
// Matches /products real layout: SidebarFilter on xl+ · mobile 3-button
// controls + chip area · mobile card grid (xl:hidden) · desktop 6-col table
// (brand, name, image, stock, price, action) on xl+
export function ProductListingSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="flex">
      {/* Desktop sidebar filter (xl+) — matches real SidebarFilter (w-[300px], sticky top-[108px], h-[60px] header) */}
      <div className="hidden xl:flex flex-col flex-shrink-0 self-stretch bg-white border-r border-gray-200">
        <aside className="flex-shrink-0 flex flex-col sticky top-[108px] h-fit z-30 bg-white overflow-hidden w-[300px] border-r border-gray-200">
          {/* Header strip — h-[60px], title left + collapse button right */}
          <div className="flex items-center w-full h-[60px] border-b border-gray-200 bg-white shadow-sm flex-shrink-0">
            <div className="flex-1 px-6">
              <Pulse className="h-4 w-32" />
            </div>
            <div className="w-[50px] min-w-[50px] h-full bg-gray-50 flex items-center justify-center">
              <Pulse className="h-4 w-4 rounded" />
            </div>
          </div>
          {/* Filter group HEADERS only — real FilterGroup default state is
              COLLAPSED, so showing closed rows here matches the SidebarFilter
              inline loading state and the loaded state. Prevents the vertical
              shrink that previously happened when transitioning from this
              skeleton to the mounted page. */}
          {(() => {
            const widths = ["w-20", "w-24", "w-16", "w-28", "w-20", "w-24"];
            return Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border-b border-gray-100 last:border-b-0">
                <div className="w-full flex items-center justify-between px-6 py-4">
                  <Pulse className={`h-[15px] ${widths[i]}`} />
                  <Pulse className="h-4 w-4 rounded" />
                </div>
              </div>
            ));
          })()}
        </aside>
      </div>

      {/* Right content */}
      <div className="flex-1 flex flex-col w-full">
        {/* Mobile controls (xl:hidden) */}
        <div className="xl:hidden flex flex-col gap-2 mb-3">
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Pulse key={i} className="h-[44px] rounded-xl border border-gray-200" />
            ))}
          </div>
          {/* Stable-height chip area */}
          <div className="min-h-[38px]" />
        </div>

        {/* Mobile card grid (xl:hidden) — matches real product card layout:
            content left + image right, then border-t with price + actions */}
        <div className="xl:hidden grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-100 shadow-sm p-2.5 sm:p-3 flex flex-col gap-1.5">
              {/* Top row: content left + image right */}
              <div className="flex gap-2.5">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <Pulse className="h-2 w-14" />
                  <Pulse className="h-3 w-full max-w-[140px]" />
                  <Pulse className="h-2.5 w-24" />
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <Pulse className="h-2 w-2 rounded-full" />
                    <Pulse className="h-2 w-16" />
                  </div>
                </div>
                {/* Product image */}
                <Pulse className="w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 rounded-lg border border-gray-100" />
              </div>
              {/* Bottom row: price + action buttons */}
              <div className="flex items-center justify-between border-t border-gray-100 pt-2 gap-2">
                <Pulse className="h-3.5 w-20" />
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Pulse className="h-9 w-16 rounded-lg" />
                  <Pulse className="h-9 w-9 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table (xl+) — 6 columns: brand · name · image · stock · price · action */}
        <div className="hidden xl:block flex-1 overflow-x-auto">
          <table className="w-full border-collapse table-fixed min-w-[700px]">
            <colgroup>
              {["10%", "40%", "10%", "12%", "18%", "10%"].map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-200">
                {Array.from({ length: 6 }).map((_, i) => (
                  <th key={i} className="px-2 md:px-4 py-2 md:py-3">
                    <Pulse className="h-3 w-16 mx-auto" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {Array.from({ length: count }).map((_, i) => (
                <tr key={i} className="h-[52px]">
                  <td className="px-2 md:px-4"><Pulse className="h-3 w-12 mx-auto" /></td>
                  <td className="px-2 md:px-4"><Pulse className="h-3 w-48" /></td>
                  <td className="px-2 md:px-4"><Pulse className="w-10 h-10 mx-auto rounded-sm" /></td>
                  <td className="px-2 md:px-4"><Pulse className="h-3 w-16 mx-auto" /></td>
                  <td className="px-2 md:px-4"><Pulse className="h-3 w-20 mx-auto" /></td>
                  <td className="px-2 md:px-4"><Pulse className="w-20 h-8 mx-auto rounded-md" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Product Detail Skeleton ──────────────────────────────────────────────────
export function ProductDetailSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image */}
        <Pulse className="w-full aspect-square rounded-sm" />
        {/* Info */}
        <div className="space-y-4">
          <Pulse className="h-7 w-3/4 rounded" />
          <Pulse className="h-5 w-1/3 rounded" />
          <Pulse className="h-6 w-1/4 rounded" />
          <div className="space-y-2 pt-2">
            <Pulse className="h-4 w-full rounded" />
            <Pulse className="h-4 w-5/6 rounded" />
            <Pulse className="h-4 w-4/6 rounded" />
          </div>
          <div className="flex gap-3 pt-4">
            <Pulse className="h-11 flex-1 rounded" />
            <Pulse className="h-11 w-11 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Cart Item Skeleton ───────────────────────────────────────────────────────
export function CartItemSkeleton() {
  return (
    <div className="flex items-start gap-4 p-4 border-b border-gray-100">
      <Pulse className="h-20 w-20 flex-shrink-0 rounded-sm" />
      <div className="flex-1 space-y-2">
        <Pulse className="h-4 w-3/4 rounded" />
        <Pulse className="h-3 w-1/2 rounded" />
        <div className="flex items-center justify-between pt-2">
          <Pulse className="h-8 w-24 rounded" />
          <Pulse className="h-5 w-16 rounded" />
        </div>
      </div>
    </div>
  );
}

// ─── Cart Page Skeleton ───────────────────────────────────────────────────────
// Matches /cart real layout: centered title + primary bar · 12-col grid
// (lg:8/4, xl:9/3) · sticky table header · rounded-3xl item cards · sticky
// summary card on the right.
export function CartPageSkeleton({ items = 3 }: { items?: number }) {
  return (
    <div className="min-auto bg-surfaceOverlay pb-4 lg:pb-10">
      <div className="w-full px-3 lg:px-12 pt-8 md:pt-8">
        {/* Centered title + primary bar */}
        <div className="mb-4 md:mb-8 text-center flex flex-col items-center gap-2">
          <Pulse className="h-7 md:h-8 w-32" />
          <div className="h-1 w-12 bg-primary" />
        </div>

        {/* 12-col grid — lg+ matches new CartPage breakpoint (stacks below lg) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 xl:gap-8 items-start">
          {/* Left column — items */}
          <div className="lg:col-span-8 xl:col-span-9 flex flex-col min-w-0">
            {/* Sticky table header (lg+) — matches real header */}
            <div className="hidden lg:flex bg-white border border-gray-100 rounded-sm items-center py-4 px-5 mb-4 shadow-sm">
              <div className="w-[45%]"><Pulse className="h-3 w-32" /></div>
              <div className="w-[15%] flex justify-center"><Pulse className="h-3 w-12" /></div>
              <div className="w-[20%] flex justify-center"><Pulse className="h-3 w-10" /></div>
              <div className="w-[20%] flex justify-end"><Pulse className="h-3 w-12" /></div>
            </div>

            {/* Item cards — rounded-3xl matching real CartItem */}
            <div className="space-y-2 pb-4">
              {Array.from({ length: items }).map((_, i) => (
                <div key={i} className="relative bg-white border border-gray-100 rounded-sm">
                  {/* Mobile + tablet card layout — below lg to match CartItem */}
                  <div className="lg:hidden flex gap-4 p-1">
                    <Pulse className="w-15 h-15 flex-shrink-0 rounded-sm border border-gray-100" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <Pulse className="h-4 w-3/4" />
                      <div className="flex flex-row items-center gap-2">
                        <Pulse className="h-5 w-16 rounded-sm" />
                        <Pulse className="h-5 w-16 rounded-sm" />
                      </div>
                    </div>
                  </div>

                  {/* Desktop layout — lg+, 4 columns matching header widths */}
                  <div className="hidden lg:flex items-center p-1">
                    <div className="w-[45%] flex items-center gap-4">
                      <Pulse className="w-12 h-12 flex-shrink-0 rounded-sm border border-gray-100" />
                      <div className="min-w-0 space-y-2 flex-1">
                        <Pulse className="h-4 w-3/4" />
                        <div className="flex gap-1.5">
                          <Pulse className="h-5 w-16 rounded-sm" />
                          <Pulse className="h-5 w-16 rounded-sm" />
                        </div>
                      </div>
                    </div>
                    <div className="w-[15%] flex justify-center">
                      <Pulse className="h-4 w-16" />
                    </div>
                    <div className="w-[20%] flex justify-center">
                      <Pulse className="h-10 w-32 rounded-sm border border-gray-100" />
                    </div>
                    <div className="w-[20%] flex justify-end rtl:pl-4 ltr:pr-4">
                      <Pulse className="h-5 w-20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions bar — Update / Clear buttons */}
            <div className="mt-0 flex flex-col sm:flex-row gap-3 justify-end">
              <Pulse className="h-11 w-full sm:w-32 rounded-sm" />
              <Pulse className="h-11 w-full sm:w-40 rounded-sm" />
            </div>
          </div>

          {/* Right column — summary card (sticky on lg+) */}
          <div className="lg:col-span-4 xl:col-span-3 w-full">
            <div className="lg:sticky lg:top-28 bg-white border border-gray-100 rounded-sm shadow-[0_10px_40px_rgba(0,0,0,0.05)] overflow-hidden">
              {/* Summary header bar */}
              <div className="bg-gray-200 px-3 py-2 border-b border-gray-200 flex items-center justify-center">
                <Pulse className="h-4 w-32" />
              </div>
              {/* Body */}
              <div className="px-2 py-2 space-y-0">
                <div className="space-y-3 pb-4 border-b border-gray-100">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <Pulse className="h-3.5 w-24" />
                      <Pulse className="h-3.5 w-16" />
                    </div>
                  ))}
                </div>
                {/* Grand total */}
                <div className="flex justify-between items-center pt-4">
                  <Pulse className="h-5 w-20" />
                  <Pulse className="h-5 w-24" />
                </div>
                {/* Promo code row */}
                <div className="pt-5 border-t border-gray-100 mt-4 flex gap-2 items-stretch h-[44px]">
                  <Pulse className="flex-1 rounded-sm border border-gray-100" />
                  <Pulse className="w-20 rounded-sm" />
                </div>
                {/* Checkout button */}
                <div className="pt-4">
                  <Pulse className="h-12 w-full rounded-sm" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Checkout Skeleton ────────────────────────────────────────────────────────
// Matches /checkout real layout: back-link + centered title + gradient line ·
// 12-col grid (lg:col-span-8 left / 4 right) · 4 numbered section cards
// (Shipping Address, PO Number, Shipping Method, Payment Method) · sticky
// Order Summary card on the right.
export function CheckoutSkeleton() {
  // One section card with a SectionHeader-style strip (50px) and body
  const SectionCard = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-white border border-[#ddd] shadow-sm rounded-sm overflow-hidden">
      <div className="bg-gray-50/80 px-3 border-b border-border flex items-center justify-between h-[50px]">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-full bg-black" />
          <Pulse className="h-3 w-32" />
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent mx-4 hidden sm:block" />
      </div>
      <div className="p-4">{children}</div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col w-full bg-surfacePage text-xs italic-none">
      <main className="flex-1 w-full px-3 lg:px-12 lg:px-8 pt-4 md:pt-8 pb-4 md:pb-8">
        {/* Header: back link + centered title + gradient line */}
        <div className="flex flex-col items-center justify-center text-center gap-4 mb-4 md:mb-8  relative">
          <div className="lg:absolute rtl:right-0 ltr:left-0 top-1/2 lg:-translate-y-1/2 flex items-center gap-2 mb-4 lg:mb-0">
            <Pulse className="w-6 h-6 rounded-full border border-black !bg-transparent" />
            <Pulse className="hidden sm:block h-3 w-32" />
          </div>
          <div className="flex flex-col items-center gap-4">
            <Pulse className="h-7 md:h-8 w-44" />
            <div className="h-1 w-12 bg-primary mx-auto" />
          </div>
        </div>

        {/* 12-col grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 lg:gap-8 items-start">
          {/* Left column — 4 section cards */}
          <div className="lg:col-span-8 space-y-3">
            {/* 1. Shipping Address — list of address cards */}
            <SectionCard>
              <div className="space-y-3 max-h-[460px] overflow-hidden">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 border border-border bg-white rounded-sm">
                    <Pulse className="w-5 h-5 rounded-full mt-1" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <Pulse className="h-4 w-48" />
                      <Pulse className="h-3 w-3/4" />
                      <Pulse className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* 2. PO Number — single input */}
            <SectionCard>
              <Pulse className="h-11 w-full rounded-sm border border-border" />
            </SectionCard>

            {/* 3. Shipping Method — radio rows */}
            <SectionCard>
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 border border-border rounded-sm">
                    <Pulse className="h-4 w-4 rounded-full" />
                    <Pulse className="h-3 flex-1" />
                    <Pulse className="h-3 w-16" />
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* 4. Payment Method — radio rows */}
            <SectionCard>
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 border border-border rounded-sm">
                    <Pulse className="h-4 w-4 rounded-full" />
                    <Pulse className="h-3 w-36" />
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          {/* Right column — sticky Order Summary */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-[#ddd] shadow-lg rounded-sm sticky top-24 overflow-hidden">
              {/* Header: black check circle + title */}
              <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-2 sm:gap-3 border-b border-[#ddd]">
                <div className="w-5 h-5 rounded-full bg-black" />
                <Pulse className="h-3 w-32" />
              </div>
              {/* Item count + chevron row */}
              <div className="px-5 py-3 flex items-center justify-between border-b border-gray-100">
                <Pulse className="h-4 w-24" />
                <Pulse className="h-5 w-5 rounded" />
              </div>
              {/* Totals area */}
              <div className="p-5 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <Pulse className="h-3.5 w-24" />
                    <Pulse className="h-3.5 w-16" />
                  </div>
                ))}
                <div className="h-px bg-gray-100" />
                <div className="flex justify-between items-center">
                  <Pulse className="h-5 w-20" />
                  <Pulse className="h-5 w-24" />
                </div>
                {/* Place Order button */}
                <Pulse className="h-12 w-full rounded-sm mt-2" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Table Row Skeleton ───────────────────────────────────────────────────────
export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-gray-100">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Pulse className={`h-4 rounded ${i === 0 ? "w-24" : i === cols - 1 ? "w-16" : "w-full"}`} />
        </td>
      ))}
    </tr>
  );
}

// ─── Orders Table Skeleton ────────────────────────────────────────────────────
export function OrdersTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="w-full">
      {/* Card View — mobile only (md:hidden), matches real OrdersTable */}
      <div className="md:hidden space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="border border-gray-200 rounded-lg bg-white p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <Pulse className="h-5 w-24" />
              <Pulse className="h-4 w-20" />
            </div>
            <Pulse className="h-6 w-24" />
            <div className="flex justify-between">
              <Pulse className="h-4 w-16" />
              <Pulse className="h-4 w-28" />
            </div>
            <div className="flex justify-between">
              <Pulse className="h-4 w-20" />
              <Pulse className="h-4 w-24" />
            </div>
            <div className="flex items-center gap-2.5 pt-2 border-t border-gray-100">
              <Pulse className="h-4 w-16" />
              <span className="text-black/30">|</span>
              <Pulse className="h-4 w-14" />
              <span className="text-black/30">|</span>
              <Pulse className="h-6 w-28 rounded-[2px]" />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table — md+ matches real OrdersTable */}
      <div className="hidden md:block bg-white rounded-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {["w-28", "w-24", "w-20", "w-20", "w-16", "w-20"].map((w, i) => (
                <th key={i} className="px-4 py-3 text-left">
                  <Pulse className={`h-4 ${w} rounded`} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <TableRowSkeleton key={i} cols={6} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── My Orders Skeleton ───────────────────────────────────────────────────────
// Composite for /my-orders: title + export button + filters bar + orders table.
// Use this in the my-orders page; use OrdersTableSkeleton alone when embedding
// inside another page (e.g. StatementSkeleton).
export function MyOrdersSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="flex-1 w-full px-4 md:px-6 lg:px-8 py-4 md:py-8 lg:py-10">
      {/* Title row + export button */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 md:mb-10">
        <Pulse className="h-7 md:h-8 w-40 md:w-48" />
        <Pulse className="w-full md:w-44 h-10 rounded-sm border-2 border-primary" />
      </div>
      {/* Filters: status tabs row + search + reset */}
      <div className="bg-white border border-gray-100 p-4 mb-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Pulse key={i} className="h-9 w-24 rounded-sm" />
          ))}
        </div>
        <div className="flex gap-2">
          <Pulse className="flex-1 h-10 rounded-sm" />
          <Pulse className="h-10 w-24 rounded-sm" />
        </div>
      </div>
      {/* Orders table */}
      <OrdersTableSkeleton rows={rows} />
    </div>
  );
}

// ─── Order Detail Skeleton ────────────────────────────────────────────────────
export function OrderDetailSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Pulse className="h-7 w-48 rounded" />
        <Pulse className="h-9 w-28 rounded" />
      </div>
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-sm border border-gray-100 p-4 space-y-2">
            <Pulse className="h-3 w-20 rounded" />
            <Pulse className="h-5 w-28 rounded" />
          </div>
        ))}
      </div>
      {/* Items table */}
      <div className="bg-white rounded-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <Pulse className="h-5 w-24 rounded" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <CartItemSkeleton key={i} />
        ))}
      </div>
      {/* Totals */}
      <div className="bg-white rounded-sm border border-gray-100 p-5 space-y-2 w-full md:w-72 md:ml-auto">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex justify-between">
            <Pulse className="h-4 w-24 rounded" />
            <Pulse className="h-4 w-16 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Dashboard Skeleton ───────────────────────────────────────────────────────
// Matches /customer/dashboard real layout:
// Title + gradient line · w-1/2 Compare section · 2x w-3/4 summary card grids
// (TOTAL ORDER QTY + TOTAL ORDER VALUE) · w-3/4 bottom filters
export function DashboardSkeleton() {
  return (
    <div className="flex-1 p-4 md:p-8 lg:p-10 bg-surfacePage min-h-0">
      <div className="w-full space-y-12">
        {/* Title with gradient line */}
        <div className="flex items-center gap-4 mb-2">
          <Pulse className="h-8 w-40" />
          <div className="h-[2px] flex-1 bg-gradient-to-r from-primary to-transparent" />
        </div>

        {/* Compare section — matches real page: full width on mobile/tablet/lg,
            half-width only at xl (1280+). */}
        <section className="bg-white w-full xl:w-1/2 border border-border rounded-xl overflow-hidden">
          <div className="bg-gray-100 p-4 px-6 border-b border-border flex items-center gap-3">
            <Pulse className="h-[18px] w-[18px]" />
            <Pulse className="h-4 w-24" />
          </div>
          <div className="p-8 px-8 md:px-12 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-12">
            <Pulse className="flex-1 h-11 w-full rounded-sm" />
            <Pulse className="h-7 w-14 rounded-full" />
            <Pulse className="flex-1 h-11 w-full rounded-sm" />
          </div>
        </section>

        {/* TOTAL ORDER QTY (text-4xl) + TOTAL ORDER VALUE (text-2xl) */}
        {Array.from({ length: 2 }).map((_, sectionIdx) => {
          // QTY section uses text-4xl (~h-9), VALUE uses text-2xl (~h-7)
          const valueHeight = sectionIdx === 0 ? "h-9 w-28" : "h-7 w-32";
          return (
            <section key={sectionIdx}>
              <div className="flex items-center gap-4 mb-6">
                <Pulse className="h-6 w-48" />
                <div className="h-[2px] w-12 bg-primary" />
              </div>
              <div className="w-full xl:w-3/4 grid grid-cols-1 md:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white border border-border rounded-xl overflow-hidden">
                    <div className="bg-primary h-10 px-5 flex justify-between items-center border-b border-border">
                      <Pulse className="h-3 w-20" />
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    </div>
                    <div className="py-10 px-4 flex justify-center">
                      <Pulse className={valueHeight} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        {/* Bottom filters — matches real page: full width through lg, 75% only at xl. */}
        <section className="w-full xl:w-3/4 grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-4">
              <Pulse className="h-4 w-32" />
              <div className="bg-white border border-border rounded-xl overflow-hidden">
                <div className="bg-primary border-b border-border h-12 px-5 flex items-center">
                  <Pulse className="h-4 w-40" />
                </div>
                <div className="py-8 px-6 flex justify-center">
                  <Pulse className="h-8 w-20" />
                </div>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

// ─── Search Results Skeleton ──────────────────────────────────────────────────
export function SearchResultsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2">
          <Pulse className="h-10 w-10 flex-shrink-0 rounded-md" />
          <div className="flex-1 space-y-1.5">
            <Pulse className="h-3.5 w-3/4 rounded" />
            <Pulse className="h-3 w-1/3 rounded" />
          </div>
          <Pulse className="h-4 w-14 rounded" />
        </div>
      ))}
    </div>
  );
}

// ─── Wishlist / Favorites Skeleton ────────────────────────────────────────────
export function WishlistSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ─── Favourite Products Skeleton ──────────────────────────────────────────────
// Matches app/components/FavouriteProducts.tsx:
//   • Centered h1 title (text-h3 md:text-h1-sm, NO gradient line)
//   • 2-col card grid below md
//   • 6-column table at md+ (Brand | Name | Image | Stock | Price | Action)
//   • Pagination footer (count + page buttons + per-page selector)
export function FavouriteProductsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="w-full font-rubik overflow-hidden">
      {/* Centered Page Title — matches real (no gradient line)
          h1 text-h3 md:text-h1-sm → ~28/34px rendered */}
      <div className="text-center mb-8">
        <Pulse className="h-7 md:h-9 w-56 mx-auto" />
      </div>

      {/* Mobile card grid — only below md, table takes over from md+ */}
      <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 flex flex-col gap-2">
            <div className="flex gap-3">
              <div className="flex-1 min-w-0 space-y-1.5">
                <Pulse className="h-2.5 w-16" />
                <Pulse className="h-3 w-32" />
                <div className="flex items-center gap-1.5">
                  <Pulse className="h-3 w-20" />
                  <Pulse className="h-4 w-4 rounded-full" />
                  <Pulse className="h-2.5 w-12" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Pulse className="h-2 w-2 rounded-full" />
                  <Pulse className="h-2.5 w-16" />
                </div>
              </div>
            </div>
            <Pulse className="w-full h-9 rounded-md mt-1" />
          </div>
        ))}
      </div>

      {/* Desktop table — visible at md+ to match real FavouriteProducts.
          6 columns matching real: Brand | Name | Image | Stock | Price | Action
          Widths mirror COL_WIDTHS in the real component. */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse table-fixed min-w-[950px]">
          <colgroup>
            {["15%", "30%", "12%", "12%", "14%", "17%"].map((w, i) => (
              <col key={i} style={{ width: w }} />
            ))}
          </colgroup>
          <thead>
            <tr className="bg-gray-50/80 h-[60px] border-b border-[#ebebeb]">
              {Array.from({ length: 6 }).map((_, i) => (
                <th key={i} className="px-2 md:px-4 text-center">
                  <Pulse className="h-3 w-16 mx-auto" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {Array.from({ length: count }).map((_, i) => (
              <tr key={i} className="h-auto md:h-[48px]">
                <td className="px-2 md:px-4 text-center"><Pulse className="h-3 w-14 mx-auto" /></td>
                <td className="px-2 md:px-4 text-center"><Pulse className="h-3 w-40 mx-auto" /></td>
                <td className="px-2 md:px-4 text-center"><Pulse className="w-12 h-12 mx-auto rounded-sm" /></td>
                <td className="px-2 md:px-4 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <Pulse className="h-2 w-2 rounded-full" />
                    <Pulse className="h-2.5 w-14" />
                  </div>
                </td>
                <td className="px-2 md:px-4 text-center"><Pulse className="h-3 w-16 mx-auto" /></td>
                <td className="px-2 md:px-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Pulse className="h-9 w-10 rounded-md" />
                    <Pulse className="h-9 w-9 rounded-md" />
                    <Pulse className="h-9 w-9 rounded-md" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination — matches real Pagination component (flex-col md:flex-row,
          round button placeholders, count text + page-size selector). */}
      <div className="flex flex-col md:flex-row items-center justify-between py-3 md:py-4 px-1 gap-4 mt-4 border-t border-gray-100">
        <Pulse className="h-4 w-44 order-2 md:order-1" />
        <div className="flex items-center gap-1.5 md:gap-2 order-1 md:order-2">
          <Pulse className="h-9 md:h-10 w-9 md:w-10 rounded-full" />
          <Pulse className="h-9 md:h-10 w-9 md:w-10 rounded-full" />
          <Pulse className="h-9 md:h-10 w-9 md:w-10 rounded-full" />
        </div>
        <Pulse className="h-9 md:h-10 w-24 rounded-full order-3" />
      </div>
    </div>
  );
}

// ─── Notifications Skeleton ───────────────────────────────────────────────────
// Mirrors app/customer/notifications/page.tsx:
//   • Sidebar (account sidebar) on the left at lg+
//   • Main: h1 title + bordered card with:
//       - mobile cards (<md): date + title + message stacked
//       - desktop 4-col table (md+): Date | Title | Message | Action
//       - pagination footer (3 sections, stacked until lg)
export function NotificationsSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="w-full py-4 md:py-10">
      <div className="flex flex-col lg:flex-row gap-0">
        <SidebarSkeleton />
        <main className="flex-1 min-w-0 px-4 md:px-6 lg:px-8">
          {/* Title h1 (text-h3 md:text-[26px], ~28/32px line-height) */}
          <Pulse className="h-7 md:h-9 w-48 md:w-64 mb-6 md:mb-10" />

          {/* Bordered table card */}
          <div className="border border-border rounded-sm overflow-hidden shadow-sm">
            {/* Desktop table — md+ */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse table-fixed min-w-[600px]">
                <thead>
                  <tr className="border-b border-border">
                    {["w-[14%]", "w-[18%]", "w-[40%]", "w-[28%]"].map((w, i) => (
                      <th
                        key={i}
                        className={`px-3 lg:px-6 py-4 text-center ${w} ${i < 3 ? "border-r border-border" : ""}`}
                      >
                        <Pulse className="h-3 w-16 mx-auto" />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {Array.from({ length: count }).map((_, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-3 lg:px-6 py-6 border-r border-border">
                        <Pulse className="h-4 w-24 mx-auto" />
                      </td>
                      <td className="px-3 lg:px-6 py-6 border-r border-border">
                        <Pulse className="h-4 w-32 mx-auto" />
                      </td>
                      <td className="px-3 lg:px-6 py-6 border-r border-border">
                        <Pulse className="h-4 w-full max-w-[260px] mx-auto" />
                      </td>
                      <td className="px-3 lg:px-6 py-6">
                        {/* Action buttons — stacked at lg (cramped col), row at md/xl */}
                        <div className="flex flex-row lg:flex-col xl:flex-row items-center justify-center gap-2 lg:gap-1.5 xl:gap-2">
                          <Pulse className="h-4 w-20" />
                          <span className="hidden lg:hidden xl:inline text-black/30">|</span>
                          <Pulse className="h-4 w-16" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list — <md */}
            <div className="md:hidden">
              {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="p-4 border-b border-border last:border-0 flex flex-col gap-2">
                  <Pulse className="h-4 w-24" />
                  <Pulse className="h-4 w-3/4" />
                  <Pulse className="h-3 w-full" />
                </div>
              ))}
            </div>

            {/* Pagination panel — stacked until lg */}
            <div className="bg-borderFaint px-4 md:px-6 py-4 flex flex-col lg:flex-row items-center justify-between gap-4 md:gap-6 border-t border-gray-200">
              <Pulse className="h-4 w-44 order-2 lg:order-1" />
              <div className="flex items-center gap-3 order-1 lg:order-2">
                <Pulse className="w-10 h-10 rounded-full" />
                <Pulse className="w-10 h-10 rounded-full" />
                <Pulse className="w-10 h-10 rounded-full" />
              </div>
              <Pulse className="h-9 w-28 rounded order-3" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// ─── Form Skeleton ────────────────────────────────────────────────────────────
export function FormSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Pulse className="h-4 w-28 rounded" />
          <Pulse className="h-10 w-full rounded-sm" />
        </div>
      ))}
      <Pulse className="h-11 w-36 rounded-sm mt-2" />
    </div>
  );
}

// ─── Credit Limit Skeleton ────────────────────────────────────────────────────
export function CreditLimitSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <Pulse className="h-4 w-32 rounded" />
      <Pulse className="h-2 w-full rounded-full" />
      <div className="flex justify-between">
        <Pulse className="h-3 w-20 rounded" />
        <Pulse className="h-3 w-20 rounded" />
      </div>
    </div>
  );
}

// ─── Forecast Skeleton ────────────────────────────────────────────────────────
// Matches /customer/forecast (and /customer/viewforcast which re-exports it):
// header (title + refresh) · "Upload Forecast" h2 · upload card with dashed
// drop zone + Choose File + Submit · 2-column files table.
export function ForecastSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex-1 w-full px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-10 bg-surfacePage min-w-0">
      {/* Header: title + refresh button */}
      <div className="flex justify-between items-center mb-6 md:mb-10">
        <Pulse className="h-7 md:h-8 w-40" />
        <Pulse className="h-9 w-28 rounded-sm border border-gray-200" />
      </div>

      {/* "Upload Forecast" section h2 */}
      <Pulse className="h-4 md:h-5 w-44 mb-3 md:mb-4" />

      {/* Upload card */}
      <div className="bg-white border border-gray-200 rounded-sm mb-8 md:mb-12 shadow-sm overflow-hidden">
        {/* Dashed drop zone */}
        <div className="p-4 md:p-8">
          <div className="border-2 border-dashed border-gray-200 rounded-sm bg-surfaceDp px-4 md:px-6 py-6 md:py-8 flex flex-col items-center gap-4 md:gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Pulse className="h-4 md:h-5 w-36" />
              <Pulse className="h-8 w-28 rounded-sm border border-gray-400" />
            </div>
            <Pulse className="h-3 md:h-4 w-72" />
          </div>
        </div>
        {/* Submit button row */}
        <div className="bg-white px-4 md:px-8 pb-4 md:pb-8 flex justify-center md:justify-end">
          <Pulse className="w-full sm:w-44 h-10 rounded-sm" />
        </div>
      </div>

      {/* Desktop table header */}
      <div className="hidden sm:grid grid-cols-2 bg-surfacePage border border-gray-200 py-3 md:py-4 mb-2">
        <div className="px-4 md:px-6"><Pulse className="h-3 w-24" /></div>
        <div className="px-4 md:px-6 text-center border-l border-gray-200">
          <Pulse className="h-3 w-28 mx-auto" />
        </div>
      </div>
      {/* Mobile header */}
      <div className="sm:hidden bg-surfacePage border border-gray-200 py-3 mb-2 px-4">
        <Pulse className="h-3 w-16" />
      </div>

      {/* Files list rows */}
      <div className="bg-white border border-gray-200 border-t-0 rounded-sm overflow-hidden">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="border-b border-gray-50 grid grid-cols-1 sm:grid-cols-2 px-4 md:px-6 py-3 md:py-4 gap-2">
            <Pulse className="h-4 w-48 sm:w-56" />
            <Pulse className="h-4 w-32 sm:mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Statement Skeleton ───────────────────────────────────────────────────────
// Matches /customer/statement (and /customer/mystatement which re-exports it):
// a single "Get Your Statement" download form card with date inputs + type
// dropdown + download button.
export function StatementSkeleton() {
  return (
    <div className="flex-1 w-full px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-10">
      {/* Title */}
      <Pulse className="h-7 md:h-8 w-40 mb-6 md:mb-10" />

      {/* Form card */}
      <div className="max-w-[700px] bg-white border border-gray-200 rounded-sm shadow-sm overflow-hidden">
        {/* Card header strip */}
        <div className="bg-surfaceMuted px-6 py-3 border-b border-gray-200">
          <Pulse className="h-5 w-44" />
        </div>
        {/* Card body */}
        <div className="p-4 md:p-8">
          {/* Date inputs (2 columns) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-4 md:mb-8">
            <div className="space-y-2">
              <Pulse className="h-4 w-24" />
              <Pulse className="w-full h-[45px] border border-gray-200 rounded-sm" />
            </div>
            <div className="space-y-2">
              <Pulse className="h-4 w-24" />
              <Pulse className="w-full h-[45px] border border-gray-200 rounded-sm" />
            </div>
          </div>
          {/* Statement type dropdown */}
          <div className="mb-6 md:mb-10 space-y-2">
            <Pulse className="h-4 w-16" />
            <Pulse className="w-full h-[45px] border border-gray-200 rounded-sm" />
          </div>
          {/* Download button */}
          <Pulse className="w-full sm:w-48 h-12 rounded-sm" />
        </div>
      </div>
    </div>
  );
}

// ─── Multi-Shipping Skeleton ──────────────────────────────────────────────────
// export function MultiShippingSkeleton() {
//   return (
//     <div className="max-w-4xl mx-auto px-4 py-6 animate-pulse space-y-6">
//       <Pulse className="h-7 w-48 rounded" />
//       {/* Step indicator */}
//       <div className="flex items-center gap-2">
//         {Array.from({ length: 4 }).map((_, i) => (
//           <div key={i} className="flex items-center gap-2">
//             <Pulse className="h-8 w-8 rounded-full" />
//             {i < 3 && <Pulse className="h-1 w-12 rounded" />}
//           </div>
//         ))}
//       </div>
//       {/* Address blocks */}
//       {Array.from({ length: 3 }).map((_, i) => (
//         <div key={i} className="bg-white rounded-sm border border-gray-100 p-5 space-y-3">
//           <Pulse className="h-5 w-40 rounded" />
//           {Array.from({ length: 3 }).map((_, j) => (
//             <div key={j} className="flex items-center gap-3">
//               <Pulse className="h-4 w-4 rounded" />
//               <Pulse className="h-4 flex-1 rounded" />
//               <Pulse className="h-4 w-16 rounded" />
//             </div>
//           ))}
//         </div>
//       ))}
//       <div className="flex justify-end gap-3">
//         <Pulse className="h-11 w-28 rounded-sm" />
//         <Pulse className="h-11 w-36 rounded-sm" />
//       </div>
//     </div>
//   );
// }

// ─── Quick Order Skeleton ─────────────────────────────────────────────────────
// Matches /quick-order real layout:
// Header (title + 2 buttons) · search bar · order table (desktop) / cards (mobile) +
// summary bar · "Add Multiple Products" section · 2-col boxes (SKU + file upload) ·
// clear-all button
export function QuickOrderSkeleton() {
  return (
    <div className="min-h-screen bg-white pb-32">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-14">
        {/* Top header: title + 2 buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-10 gap-4 md:gap-6">
          <Pulse className="h-9 md:h-[36px] w-48" />
          <div className="flex gap-3 md:gap-4 w-full sm:w-auto">
            <Pulse className="flex-1 sm:flex-none h-[38px] md:h-[40px] w-full sm:w-32 rounded-sm" />
            <Pulse className="flex-1 sm:flex-none h-[38px] md:h-[40px] w-full sm:w-32 rounded-sm" />
          </div>
        </div>

        {/* Search bar */}
        <div className="mb-8 md:mb-14">
          <Pulse className="w-full h-12 md:h-14 rounded-sm border border-gray-100" />
        </div>

        {/* Order Table */}
        <div className="bg-white border border-gray-100 rounded-sm overflow-hidden mb-20 flex flex-col">
          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-50">
                  {["w-20", "w-16", "w-12", "w-24", "w-16"].map((w, i) => (
                    <th key={i} className="px-6 lg:px-8 py-4">
                      <Pulse className={`h-3 ${w}`} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 lg:px-8 py-4">
                      <div className="flex items-center gap-4">
                        <Pulse className="w-10 h-10 border border-gray-50" />
                        <Pulse className="h-3 w-48" />
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4">
                      <Pulse className="h-3 w-20 mx-auto" />
                    </td>
                    <td className="px-4 lg:px-6 py-4">
                      <Pulse className="w-14 h-10 mx-auto rounded-sm" />
                    </td>
                    <td className="px-6 lg:px-8 py-4">
                      <Pulse className="h-3 w-20 ml-auto" />
                    </td>
                    <td className="px-4 lg:px-6 py-4">
                      <Pulse className="w-10 h-10 mx-auto rounded-full" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border-b border-gray-50 p-4">
                <div className="flex items-start gap-3">
                  <Pulse className="w-12 h-12 border border-gray-50" />
                  <div className="flex-1 space-y-1.5">
                    <Pulse className="h-3 w-24" />
                    <Pulse className="h-3 w-40" />
                    <div className="flex items-center justify-between mt-3">
                      <Pulse className="w-14 h-8 rounded-sm" />
                      <Pulse className="h-3 w-16" />
                    </div>
                  </div>
                  <Pulse className="w-10 h-10 rounded-full" />
                </div>
              </div>
            ))}
          </div>

          {/* Summary bar */}
          <div className="px-4 md:px-8 py-4 md:py-6 bg-white border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6">
            <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto justify-between md:justify-start">
              <Pulse className="h-3 w-24" />
              <Pulse className="h-7 w-32" />
            </div>
            <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
              <Pulse className="flex-1 md:flex-none h-[44px] md:h-[48px] w-full md:w-40 rounded-sm" />
              <Pulse className="flex-1 md:flex-none h-[44px] md:h-[48px] w-full md:w-40 rounded-sm" />
            </div>
          </div>
        </div>

        {/* Section title with primary left border */}
        <div className="mb-6 md:mb-10 border-l-[6px] border-primary pl-4 md:pl-6">
          <Pulse className="h-8 md:h-[36px] w-72" />
        </div>

        {/* 2-column boxes: SKU textarea + file upload */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10 mb-12 md:mb-20">
          {/* SKU textarea box */}
          <div className="bg-white border border-gray-100 rounded-sm p-5 md:p-10 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <Pulse className="h-[18px] w-[18px]" />
              <Pulse className="h-4 w-40" />
            </div>
            <Pulse className="w-full h-48 mb-6 rounded-sm border border-gray-100" />
            <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
              <Pulse className="h-7 w-44 rounded-full" />
              <Pulse className="h-[40px] w-full sm:w-40 rounded-sm" />
            </div>
          </div>

          {/* File upload box */}
          <div className="bg-white border border-gray-100 rounded-sm p-5 md:p-10 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <Pulse className="h-[18px] w-[18px]" />
              <Pulse className="h-4 w-40" />
            </div>
            <Pulse className="w-full h-[132px] mb-8 rounded-sm border-2 border-dashed border-gray-100" />
            <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
              <Pulse className="h-4 w-36" />
              <Pulse className="h-[40px] w-full sm:w-40 rounded-sm" />
            </div>
          </div>
        </div>

        {/* Clear all button */}
        <div className="flex justify-center md:justify-end mb-12 md:mb-20">
          <div className="flex items-center gap-4">
            <Pulse className="w-12 h-12 rounded-full" />
            <Pulse className="h-4 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Order Attachments Skeleton ───────────────────────────────────────────────
// Composite for /customer/order-attachments: title + search row + filters card
// (Doc type + Invoice due + Reset) + 6-column attachments table.
export function OrderAttachmentsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex-1 w-full px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-10">
      {/* Title */}
      <Pulse className="h-7 md:h-8 w-48 mb-6 md:mb-10" />

      {/* Search row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-6 md:mb-8">
        <Pulse className="w-full sm:w-[200px] h-[40px] rounded-sm border border-border" />
        <Pulse className="w-full sm:w-24 h-[40px] rounded-sm" />
      </div>

      {/* Filters card */}
      <div className="bg-white border border-border rounded-sm p-4 md:p-6 mb-6 md:mb-10 flex flex-col sm:flex-row gap-4 items-end">
        <div className="w-full sm:w-auto sm:min-w-[200px] space-y-2">
          <Pulse className="h-3 w-28" />
          <Pulse className="w-full h-[40px] rounded-sm border border-gray-200" />
        </div>
        <div className="w-full sm:w-auto sm:min-w-[200px] space-y-2">
          <Pulse className="h-3 w-28" />
          <Pulse className="w-full h-[40px] rounded-sm border border-gray-200" />
        </div>
        <Pulse className="w-full sm:w-32 h-[40px] rounded-sm" />
      </div>

      {/* Attachments table (desktop) */}
      <div className="hidden md:block border border-border rounded-sm overflow-hidden">
        <table className="w-full border-collapse bg-white">
          <thead className="bg-gray-50 border-b border-border">
            <tr className="h-[50px]">
              {["w-16", "w-32", "w-20", "w-24", "w-20", "w-20"].map((w, i) => (
                <th key={i} className="px-6 py-3">
                  <Pulse className={`h-3 ${w}`} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="px-6 py-4"><Pulse className="h-3 w-16 mx-auto" /></td>
                <td className="px-6 py-4"><Pulse className="h-3 w-40" /></td>
                <td className="px-6 py-4"><Pulse className="h-3 w-20 mx-auto" /></td>
                <td className="px-6 py-4"><Pulse className="h-3 w-24" /></td>
                <td className="px-6 py-4"><Pulse className="h-3 w-20" /></td>
                <td className="px-6 py-4"><Pulse className="h-3 w-20" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-sm p-4 space-y-2">
            <div className="flex justify-between">
              <Pulse className="h-3 w-24" />
              <Pulse className="h-3 w-16" />
            </div>
            <Pulse className="h-3 w-48" />
            <Pulse className="h-3 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page-level loading wrappers (for loading.tsx files) ──────────────────────

/** Full-width centered skeleton wrapper — used as Suspense fallbacks */
export function PageSkeleton({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[60vh]">{children}</div>;
}

// ─── Forgot-Password Skeleton ────────────────────────────────────────────────
export function ForgotPasswordSkeleton() {
  // Mirrors app/forgot-password/page.tsx so the swap-in causes no layout shift.
  // Real card: max-w-[440px], padded sections; title row has a bottom-border;
  // mode tabs match login; body has a multi-line subtitle, one input, submit
  // button, and a back-to-login link. NO password field (single-input form).
  return (
    <div className="flex-1 w-full min-h-full bg-surfaceSubtle flex flex-col">
      <main className="flex-1 w-full flex justify-center items-start pt-6 sm:pt-8 md:pt-16 pb-8 sm:pb-12 px-4 md:px-0">
        <div className="w-full max-w-[440px] bg-white rounded-[3px] shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-gray-100 flex flex-col overflow-hidden">

          {/* Header section: title + mode tabs */}
          <div className="p-4 sm:p-6 md:p-8 flex flex-col gap-6">
            {/* Title row with bottom border — title text-base sm:text-lg ≈ 22/26px */}
            <div className="pb-4 border-b-[0.80px] border-gray-200">
              <Pulse className="h-[22px] sm:h-[26px] w-40" />
            </div>

            {/* Mode tabs (OTP / Password) — flex of two equal-width pulses */}
            <div className="flex w-full rounded-[3px] overflow-hidden border border-gray-200">
              <Pulse className="flex-1 h-[45px] !rounded-none" />
              <Pulse className="flex-1 h-[45px] !rounded-none border-l border-gray-100" />
            </div>
          </div>

          {/* Body section: subtitle + form */}
          <div className="px-4 sm:px-6 md:px-8 pb-6 sm:pb-8 flex flex-col gap-6">
            {/* Subtitle — text-xs leading-5 (1.66), typically 2 lines = ~40px */}
            <div className="space-y-1.5">
              <Pulse className="h-3.5 w-full" />
              <Pulse className="h-3.5 w-4/5" />
            </div>

            {/* Form */}
            <div className="flex flex-col gap-3 sm:gap-5">
              {/* Single input (email OR mobile) — label + h-10 sm:h-11 input */}
              <div className="flex flex-col gap-1.5">
                <Pulse className="h-3 w-20" />
                <Pulse className="h-10 sm:h-11 w-full !rounded-[1px]" />
              </div>

              {/* Submit button */}
              <Pulse className="h-10 sm:h-11 w-full rounded-sm" />

              {/* Back-to-login link */}
              <div className="flex justify-center">
                <Pulse className="h-3.5 w-32" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Login Skeleton ──────────────────────────────────────────────────────────
export function LoginSkeleton() {
  // Mirrors the real login card from app/login/page.tsx pixel-for-pixel.
  // Pulse heights match the RENDERED text heights (font-size × line-height +
  // any inline padding) — not just the font-size — so swap-in to the real
  // form causes no vertical growth.
  //
  // Numbers derived from tailwind.config.js: text-body = 13px / 1.5,
  // text-label = 11px / 1.2. h1 inherits ~1.5 line-height.
  return (
    <div className="flex-1 w-full min-h-full bg-surfaceSubtle flex flex-col">
      <main className="flex-1 w-full flex justify-center items-start pt-6 sm:pt-8 md:pt-16 pb-8 sm:pb-12 px-4 md:px-0">
        <div className="w-full max-w-[440px] bg-white rounded-[3px] shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-gray-100">
          {/* Title section — px-4 sm:px-6 md:px-8 pt-5 sm:pt-7 pb-4 sm:pb-5 */}
          {/* Real h1: "REGISTERED CUSTOMERS" — text-[17px] sm:text-[18px] uppercase tracking-[0.5px] ≈ 200-220px wide */}
          <div className="px-4 sm:px-6 md:px-8 pt-5 sm:pt-7 pb-4 sm:pb-5">
            <Pulse className="h-[26px] sm:h-[27px] w-56 sm:w-60 max-w-full" />
          </div>

          {/* Mode tabs (OTP / Password) — px-4 sm:px-6 md:px-8 */}
          {/* Real button: py-2.5 sm:py-[14px] + text-[11px] sm:text-body leading-tight */}
          {/* Mobile: 20 + 11×1.25 = ~34px ; sm+: 28 + 13×1.25 = ~45px */}
          <div className="px-4 sm:px-6 md:px-8">
            <div className="flex w-full rounded-[3px] overflow-hidden border border-gray-200">
              <Pulse className="flex-1 h-[34px] sm:h-[45px] !rounded-none" />
              <Pulse className="flex-1 h-[34px] sm:h-[45px] !rounded-none border-l border-gray-100" />
            </div>
          </div>

          {/* Form body — px-4 sm:px-6 md:px-8 pt-4 sm:pt-5 pb-6 sm:pb-8 */}
          <div className="px-4 sm:px-6 md:px-8 pt-4 sm:pt-5 pb-6 sm:pb-8">
            {/* Subtitle — text-body leading-relaxed (1.625) = 13×1.625 ≈ 21px */}
            {/* Real: "If you have an account, sign in with your email address." — long, ≈ 300-320px */}
            <Pulse className="h-[21px] w-full max-w-[320px] mb-5" />

            <div className="flex flex-col gap-3 sm:gap-[14px]">
              {/* Email field — label text-body ≈ 20px + input h-[48px] */}
              <div className="flex flex-col gap-[5px]">
                <Pulse className="h-[20px] w-20" />
                <Pulse className="h-[48px] w-full !rounded-none border border-gray-300" />
              </div>

              {/* Password field — same shape */}
              <div className="flex flex-col gap-[5px]">
                <Pulse className="h-[20px] w-24" />
                <Pulse className="h-[48px] w-full !rounded-none border border-gray-300" />
              </div>

              {/* Submit button + forgot password — pt-2 gap-3 */}
              {/* Real forgot-pwd: "Forgot Your Password?" text-body (~20px) + py-2 inline-block (16) ≈ 36px, ~160px wide */}
              <div className="pt-2 flex flex-col gap-3">
                <Pulse className="h-10 sm:h-[46px] w-full rounded-sm" />
                <div className="flex justify-end">
                  <Pulse className="h-[36px] w-40" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Account Skeleton ─────────────────────────────────────────────────────────
export function AccountSkeleton() {
  // Sharp-cornered cards (rounded-none) like the real my-account page
  const card = "border border-gray-200 bg-white shadow-sm";
  return (
    <div className="flex-1 w-full px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-10 bg-surfacePage">
      {/* Title */}
      <Pulse className="h-7 w-48 rounded mb-6 md:mb-10" />

      <div className="space-y-8">
        {/* ACCOUNT INFORMATION */}
        <div>
          <Pulse className="h-5 w-44 rounded mb-3" />
          <hr className="border-gray-200 mb-6" />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
            <div className={card}>
              <div className="bg-surfaceHover px-4 py-3 border-b border-gray-200">
                <Pulse className="h-4 w-36 rounded" />
              </div>
              <div className="p-3 md:p-5 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Pulse key={i} className="h-3.5 w-full rounded" />
                ))}
                <div className="flex flex-col md:flex-row gap-3 pt-4">
                  <Pulse className="h-9 w-full md:w-24 rounded-sm" />
                  <Pulse className="h-9 w-full md:w-44 rounded-sm" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SALES + BEHAVIOR row — xl:grid-cols-2 to match real my-account page */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className={card}>
              <div className="bg-surfaceHover px-4 py-3 border-b border-gray-200">
                <Pulse className="h-4 w-36 rounded" />
              </div>
              <div className="p-3 md:p-5 space-y-2.5">
                <Pulse className="h-3.5 w-3/4 rounded" />
                <Pulse className="h-3.5 w-2/3 rounded" />
                <Pulse className="h-3.5 w-1/2 rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* CREDIT LIMIT */}
        <div className={card}>
          <div className="p-4 md:p-6 space-y-3">
            <Pulse className="h-4 w-36 rounded" />
            <Pulse className="h-3 w-full rounded-full" />
            <div className="flex justify-between">
              <Pulse className="h-3 w-20 rounded" />
              <Pulse className="h-3 w-20 rounded" />
            </div>
          </div>
        </div>

        {/* ADDRESS BOOK */}
        <div>
          <Pulse className="h-5 w-44 rounded mb-3" />
          <hr className="border-gray-200 mb-6" />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className={card}>
                <div className="bg-surfaceHover px-4 py-3 border-b border-gray-200">
                  <Pulse className="h-4 w-48 rounded" />
                </div>
                <div className="p-3 md:p-5 space-y-2">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <Pulse key={j} className="h-3.5 w-full rounded" />
                  ))}
                  {i === 1 && <Pulse className="h-10 w-44 rounded-none mt-4" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Address Book Skeleton ────────────────────────────────────────────────────
// Mirrors app/components/Addresses.tsx pixel-for-pixel:
//   • Header h1 (text-h3 md:text-h1-sm) — title only, no add button
//   • Section 1: h2 + gradient + 2 AddressCards (1-col, xl:2-col, gap-8)
//       AddressCard: bg-primary header strip + content (name/company/street/
//       city+zip/country + PHONE row + Edit button only on shipping card)
//   • Section 2: h2 + gradient + bordered card containing:
//       - md:hidden stacked cards with labeled fields
//       - hidden md:block 6-col table (min-w-[650px])
//       - Pagination footer (count + page buttons + page-size)
export function AddressBookSkeleton() {
  const FieldRow = ({ labelW, valueW }: { labelW: string; valueW: string }) => (
    <div className="flex items-start gap-2">
      <Pulse className={`h-3 ${labelW}`} />
      <Pulse className={`h-3 ${valueW}`} />
    </div>
  );

  return (
    <div className="flex-1 p-4 md:p-6 lg:p-8 bg-surfacePage">
      <div className="max-w-[1200px] w-full space-y-12">
        {/* Header — title only (text-h3 md:text-h1-sm → ~28/40px rendered) */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-gray-200">
          <Pulse className="h-7 md:h-9 w-48 md:w-56" />
        </div>

        {/* Section 1: Default Addresses */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <Pulse className="h-7 w-52" />
            <div className="h-[2px] flex-1 bg-gradient-to-r from-primary to-transparent" />
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="bg-white border border-border rounded-xl shadow-sm overflow-hidden flex flex-col h-full"
              >
                {/* Card header (bg-primary, h-12-ish) */}
                <div className="bg-primary px-5 py-4 border-b border-border">
                  <Pulse className="h-4 w-48 bg-black/10" />
                </div>
                {/* Card body */}
                <div className="p-6 flex-grow flex flex-col">
                  <div className="space-y-1.5">
                    {/* Name (font-bold text-black uppercase mb-3) */}
                    <Pulse className="h-4 w-40 mb-3" />
                    {/* Company */}
                    <Pulse className="h-3.5 w-36" />
                    {/* Street */}
                    <Pulse className="h-3.5 w-full max-w-[280px]" />
                    {/* City, ZIP */}
                    <Pulse className="h-3.5 w-3/5" />
                    {/* Country */}
                    <Pulse className="h-3.5 w-28" />
                    {/* Phone row (label + value with gap) — pt-3 in real */}
                    <div className="pt-3 flex items-center gap-2">
                      <Pulse className="h-3 w-12" />
                      <Pulse className="h-3 w-32" />
                    </div>
                  </div>
                  {/* Edit button — only on shipping card (i=1), sits at bottom of card */}
                  {i === 1 && (
                    <div className="pt-8 mt-auto">
                      <Pulse className="h-11 w-48 rounded-lg" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Additional Addresses */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <Pulse className="h-7 w-60" />
            <div className="h-[2px] flex-1 bg-gradient-to-r from-primary to-transparent" />
          </div>

          <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
            {/* Mobile cards — below md (matches real md:hidden divide-y) */}
            <div className="md:hidden divide-y divide-gray-100">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4">
                  {/* Name */}
                  <Pulse className="h-4 w-32 mb-2" />
                  <div className="space-y-1.5">
                    <FieldRow labelW="w-16" valueW="flex-1 max-w-[200px]" />
                    <FieldRow labelW="w-10" valueW="w-28" />
                    <FieldRow labelW="w-14" valueW="w-20" />
                    <FieldRow labelW="w-14" valueW="w-28" />
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table — md+ (matches real hidden md:block 6-col) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-gray-100 border-b border-border h-[60px]">
                    {["w-16", "w-16", "w-24", "w-12", "w-12", "w-14"].map((w, i) => (
                      <th key={i} className="px-6 py-4 text-left">
                        <Pulse className={`h-3 ${w}`} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-50">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="h-[70px]">
                      <td className="px-6 py-4"><Pulse className="h-3 w-20" /></td>
                      <td className="px-6 py-4"><Pulse className="h-3 w-20" /></td>
                      <td className="px-6 py-4"><Pulse className="h-3 w-32" /></td>
                      <td className="px-6 py-4"><Pulse className="h-3 w-16" /></td>
                      <td className="px-6 py-4"><Pulse className="h-3 w-14" /></td>
                      <td className="px-6 py-4"><Pulse className="h-3 w-24" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination footer — matches real Pagination component:
                  • flex-col md:flex-row (not sm:) — real uses md breakpoint
                  • round buttons h-9 md:h-10 — matches real button sizes
                  • count text on left, buttons centered, page-size selector on right */}
            <div className="px-4 py-2 border-t border-gray-50 bg-gray-50/30">
              <div className="flex flex-col md:flex-row items-center justify-between py-3 md:py-4 px-1 gap-4">
                <Pulse className="h-4 w-44 order-2 md:order-1" />
                <div className="flex items-center gap-1.5 md:gap-2 order-1 md:order-2">
                  <Pulse className="h-9 md:h-10 w-9 md:w-10 rounded-full" />
                  <Pulse className="h-9 md:h-10 w-9 md:w-10 rounded-full" />
                  <Pulse className="h-9 md:h-10 w-9 md:w-10 rounded-full" />
                </div>
                <Pulse className="h-9 md:h-10 w-24 rounded-full order-3" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── Checkout Success Skeleton ────────────────────────────────────────────────
// Matches the current simplified /checkout/success layout: confirmation card
// (Thank You title + order number + confirmation message) and a Continue
// Shopping button. Order Summary box was removed from the real page.
export function CheckoutSuccessSkeleton() {
  // Mirrors app/checkout/success/page.tsx pixel-for-pixel. Pulse heights
  // match the RENDERED text heights so swap-in causes no vertical shift.
  //
  // Real heights (font-size × line-height):
  //   • Title h5 (text-xl ... md:text-3xl lg:text-xl, leading-tight 1.25)
  //       mobile/sm/lg: 20 × 1.25 = 25px ; md: 30 × 1.25 = ~38px
  //   • Order number p (text-body-lg sm:text-h3-sm md:text-[18px], default ~1.5)
  //       mobile: 14×1.5 = 21px ; sm: 16×1.4 = ~22px ; md: 18×1.5 = ~27px
  //   • Confirmation message p (text-body sm:text-body-lg md:text-h3-sm,
  //       leading-relaxed 1.625) → wraps to 2 lines on phones, 1 line on md+
  //   • CTA button (px-12 py-3.5 text-body) → ~48px = h-12
  return (
    <div className="bg-surfacePage min-h-screen font-sans py-8 sm:py-12 md:py-16">
      <main className="max-w-4xl mx-auto px-4">
        {/* Confirmation card — matches real container classes exactly */}
        <div className="bg-white rounded-md border border-gray-200 shadow-sm p-6 sm:p-8 md:p-10 mb-8 text-center space-y-4 sm:space-y-6">
          {/* "Thank You" title */}
          <Pulse className="h-[25px] md:h-[38px] lg:h-[25px] w-40 sm:w-44 mx-auto" />
          {/* Order number line — single line */}
          <div className="space-y-2">
            <Pulse className="h-[21px] sm:h-[22px] md:h-[27px] w-2/5 max-w-[260px] mx-auto" />
            {/* Confirmation message — typically wraps to 2 lines on mobile,
                1 line on md+, so render two stacked pulses for the wrapped
                state and let the second one shrink for visual realism. */}
            <div className="space-y-1.5">
              <Pulse className="h-[21px] sm:h-[23px] md:h-[26px] w-3/4 max-w-lg mx-auto" />
              <Pulse className="h-[21px] sm:h-[23px] md:hidden w-1/2 max-w-md mx-auto" />
            </div>
          </div>
        </div>

        {/* Continue Shopping button — full-width on mobile, ~280px on sm+ */}
        <div className="text-center pt-2">
          <Pulse className="inline-block w-full sm:w-72 h-12 rounded-sm" />
        </div>
      </main>
    </div>
  );
}

// ─── Manage Accounts Skeleton ─────────────────────────────────────────────────
// Matches /customer/manage-accounts (and /customer/subaccounts/manage which it
// re-exports): title + bordered 4-column table (Name | Email | Status | Action)
// + mobile card variant.
export function ManageAccountsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex-1 w-full px-4 md:px-6 lg:px-8 py-10 bg-white">
      {/* Header action bar */}
      <div className="flex justify-between items-center mb-6 md:mb-10">
        <Pulse className="h-7 md:h-8 w-64" />
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-md p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0 flex-1 space-y-2">
                <Pulse className="h-3 w-32" />
                <Pulse className="h-3 w-48" />
              </div>
              <Pulse className="h-6 w-16 rounded-md flex-shrink-0" />
            </div>
            <Pulse className="w-full h-10 rounded-md" />
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block border border-gray-200 rounded-md shadow-sm overflow-hidden">
        <table className="w-full border-collapse bg-white">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="h-[50px]">
              <th className="px-6 py-3"><Pulse className="h-3 w-16" /></th>
              <th className="px-6 py-3"><Pulse className="h-3 w-16" /></th>
              <th className="px-6 py-3"><Pulse className="h-3 w-16" /></th>
              <th className="px-6 py-3"><Pulse className="h-3 w-16 mx-auto" /></th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} border-b border-gray-200`}>
                <td className="px-6 py-4"><Pulse className="h-3 w-32" /></td>
                <td className="px-6 py-4"><Pulse className="h-3 w-48" /></td>
                <td className="px-6 py-4"><Pulse className="h-6 w-16 rounded-md" /></td>
                <td className="px-6 py-4"><Pulse className="h-8 w-20 mx-auto rounded-md" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── CMS Page Skeleton ────────────────────────────────────────────────────────
// Matches /privacy-policy, /terms-conditions, /return-exchange-policy layout:
// centered title + intro paragraph + several H2 sections each with body lines.
export function CmsPageSkeleton({ sections = 5 }: { sections?: number }) {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16 py-8 sm:py-12 md:py-16 lg:py-20">
        {/* Centered title — matches h1 text-h3 sm:text-h2 md:text-h1-sm lg:text-h1 heights */}
        <div className="flex justify-center mb-8 sm:mb-10 md:mb-12">
          <Pulse className="h-7 sm:h-9 md:h-11 lg:h-12 w-64 sm:w-72 md:w-80 lg:w-96" />
        </div>

        {/* Intro paragraph — 4 lines, last shorter */}
        <div className="space-y-3 mb-8">
          <Pulse className="h-4 w-full" />
          <Pulse className="h-4 w-[95%]" />
          <Pulse className="h-4 w-[88%]" />
          <Pulse className="h-4 w-[70%]" />
        </div>

        {/* Sections — each H2 + 4 body lines, matches real mt-10 mb-4 spacing */}
        {Array.from({ length: sections }).map((_, i) => (
          <div key={i} className="mt-10 mb-4">
            {/* H2 placeholder — uppercase, narrower than body, varies for natural look */}
            <Pulse
              className={`h-6 sm:h-7 md:h-8 mb-4 ${i % 3 === 0 ? "w-1/3" : i % 3 === 1 ? "w-2/5" : "w-1/4"
                }`}
            />
            <div className="space-y-3">
              <Pulse className="h-4 w-full" />
              <Pulse className="h-4 w-[94%]" />
              <Pulse className="h-4 w-[88%]" />
              <Pulse className="h-4 w-[75%]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Footer Skeleton ──────────────────────────────────────────────────────────
export function FooterSkeleton() {
  return (
    <footer className="bg-black text-white py-12 md:py-20">
      <div className="w-full max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-0 items-start">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-10 h-10 mb-4 bg-white/10 rounded-full animate-pulse" />
              <div className="h-5 w-20 mb-3 bg-white/10 rounded animate-pulse" />
              <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="mt-16 md:mt-24 pt-8 border-t border-white/10">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            <div className="h-3 w-28 bg-white/10 rounded animate-pulse" />
            <div className="h-3 w-44 bg-white/10 rounded animate-pulse" />
            <div className="h-3 w-32 bg-white/10 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </footer>
  );
}

// Helper to extract base path from pathname, removing locale and store code prefixes
function getBasePath(pathname: string): string {
  if (!pathname) return "/";
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "/";

  const first = segments[0];
  const STORE_CODE_RE = /^[A-Za-z0-9_]+_(en|ar)$/;
  if (first === "ar" || first === "en" || STORE_CODE_RE.test(first)) {
    segments.shift();
  }

  if (segments.length > 0) {
    const second = segments[0];
    if (second === "ar" || second === "en") {
      segments.shift();
    }
  }

  return "/" + segments.join("/");
}

// ─── About Page Skeleton ──────────────────────────────────────────────────────
// Mirrors the About page body inside the same parent wrapper so the CMS swap-in
// causes no layout shift. Pulse heights map to real rendered text heights:
//   • Title  h1 text-2xl sm:text-3xl md:text-[2rem] × 1.5 ≈ 36/45/48px
//   • Body p text-[15px] leading-[1.9]                ≈ 29px per line
//   • H2     text-base font-black                     ≈ 24px
//
// Props:
//   hero — when true (default) renders the full page including the hero banner
//     placeholder. Used by loading.tsx (route transition).
//     When false renders just the body, for use INSIDE the page after the real
//     hero has mounted (during the CMS fetch).
export function AboutSkeleton({ hero = true }: { hero?: boolean } = {}) {
  const line = "h-7 bg-gray-200 rounded";

  const Paragraph = ({ lines = 3 }: { lines?: number }) => (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`${line} ${i === lines - 1 ? "w-3/4" : "w-full"}`}
        />
      ))}
    </div>
  );

  const SectionHeader = ({ w = "w-1/3" }: { w?: string }) => (
    <div className={`h-6 bg-gray-200 rounded ${w} mt-4 mb-2`} />
  );

  const ListItems = ({ items = 5 }: { items?: number }) => {
    const widths = ["w-3/5", "w-2/3", "w-3/4", "w-1/2", "w-7/12", "w-2/3"];
    return (
      <ul className="pl-5 space-y-2">
        {Array.from({ length: items }).map((_, i) => (
          <li key={i} className={`${line} ${widths[i % widths.length]}`} />
        ))}
      </ul>
    );
  };

  // The shared body — reused whether the hero is rendered above it or not.
  const Body = (
    <div className="space-y-6 animate-pulse">
      {/* Title — centered, uppercase */}
      <div className="flex justify-center mb-10 sm:mb-14">
        <div className="h-9 sm:h-[45px] md:h-12 bg-gray-200 rounded w-56 sm:w-64 md:w-72" />
      </div>

      {/* Intro paragraphs */}
      <Paragraph lines={3} />
      <Paragraph lines={3} />

      {/* Vision & Mission */}
      <SectionHeader w="w-2/5" />
      <div className="space-y-2">
        <div className="h-5 bg-gray-200 rounded w-24" />
        <Paragraph lines={2} />
      </div>
      <div className="space-y-2">
        <div className="h-5 bg-gray-200 rounded w-24" />
        <Paragraph lines={2} />
      </div>

      {/* Our Products list */}
      <SectionHeader w="w-1/4" />
      <ListItems items={6} />

      {/* Brands */}
      <SectionHeader w="w-1/3" />
      <Paragraph lines={2} />

      {/* Core Values list */}
      <SectionHeader w="w-1/3" />
      <ListItems items={5} />

      {/* Branch Network */}
      <SectionHeader w="w-1/3" />
      <Paragraph lines={3} />

      {/* Closing */}
      <SectionHeader w="w-1/4" />
      <Paragraph lines={2} />
    </div>
  );

  // Without a hero, just return the body — page.tsx wraps it with its own
  // body container so we don't double-nest the max-width / padding.
  if (!hero) return Body;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero banner placeholder — matches the real hero's pb-[17.7%] aspect
          ratio (340/1920) so the swap-in causes zero CLS. */}
      <div className="w-full pb-[17.7%] bg-slate-100 animate-pulse" />

      <div className="max-w-[1000px] mx-auto px-5 sm:px-8 md:px-12 py-10 sm:py-16 md:py-20 pb-28">
        {Body}
      </div>
    </div>
  );
}

// ─── Locations / Branch-Locations Skeleton ───────────────────────────────────
// Mirrors app/locations/page.tsx — full-width map banner above, title, then a
// 4/8 grid on lg+ with an address card and the contact form. Heights match
// the real components so the swap-in causes no layout shift.
export function LocationsSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      {/* Full-width map placeholder — same responsive height as real <MapSection> wrapper */}
      <div className="w-full h-[300px] sm:h-[420px] border-b border-gray-100 bg-gray-100 animate-pulse" />

      <div className="max-w-[1170px] mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        {/* Title pulse — real h1 text-2xl sm:text-3xl × 1.5 ≈ 36/45px */}
        <div className="flex justify-center mb-14">
          <Pulse className="h-9 sm:h-[45px] w-64 sm:w-80" />
        </div>

        {/* Address + Form grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          {/* Address Card */}
          <div className="lg:col-span-4">
            <div className="border border-gray-100 p-6 sm:p-8 shadow-sm space-y-3">
              <Pulse className="h-5 w-40" />
              <Pulse className="h-4 w-full" />
              <Pulse className="h-4 w-5/6" />
              <Pulse className="h-4 w-3/4" />
              <div className="pt-4">
                <Pulse className="h-4 w-32" />
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-8">
            <div className="space-y-4">
              <Pulse className="h-9 sm:h-10 w-full !rounded-none" />
              <Pulse className="h-9 sm:h-10 w-full !rounded-none" />
              <Pulse className="h-9 sm:h-10 w-full !rounded-none" />
              <Pulse className="h-28 w-full !rounded-none" />
              <Pulse className="h-10 sm:h-[46px] w-full sm:w-40 rounded-sm" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Route Aware Skeleton ───────────────────────────────────────────────────
export function RouteAwareSkeleton() {
  const pathname = usePathname();
  const base = getBasePath(pathname);

  // Match ProtectedLayout's footer-hiding logic — auth pages have no footer.
  const hideFooter = ["/login", "/register", "/forgot-password"].some((p) => base.startsWith(p));

  // Helper function to render page-specific skeleton wrapped in layout
  const renderContent = () => {
    // Auth pages
    if (base.startsWith("/login") || base.startsWith("/change-password")) return <LoginSkeleton />;
    if (base.startsWith("/forgot-password")) return <ForgotPasswordSkeleton />;

    // Cart / Checkout / Quick Order
    // NOTE: /checkout/success must be matched BEFORE /checkout because
    // startsWith("/checkout") also matches the success URL.
    if (base.startsWith("/cart")) return <CartPageSkeleton />;
    if (base.startsWith("/checkout/success")) return <CheckoutSuccessSkeleton />;
    if (base.startsWith("/checkout")) return <CheckoutSkeleton />;
    if (base.startsWith("/quick-order")) return <QuickOrderSkeleton />;
    // if (base.startsWith("/multi-location-delivery")) return <MultiShippingSkeleton />;

    // Top-level wishlist / favorites (NOT inside dashboard layout)
    if (base.startsWith("/favorites")) {
      return (
        <div className="min-h-screen flex flex-col w-full bg-white">
          <div className="flex flex-col lg:flex-row flex-1 w-full">
            <SidebarSkeleton />
            <main className="flex-1 w-full px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-10 bg-white min-w-0">
              <FavouriteProductsSkeleton count={8} />
            </main>
          </div>
        </div>
      );
    }
    if (base.startsWith("/wishlist")) {
      // /wishlist re-exports the favorites page (FavouriteProducts component),
      // so use FavouriteProductsSkeleton here, NOT WishlistSkeleton (which is
      // a generic product card grid and would cause a layout shift).
      return (
        <div className="min-h-screen flex flex-col w-full bg-white">
          <div className="flex flex-col lg:flex-row flex-1 w-full">
            <SidebarSkeleton />
            <main className="flex-1 w-full px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-10 bg-white min-w-0">
              <FavouriteProductsSkeleton count={8} />
            </main>
          </div>
        </div>
      );
    }

    // For dashboard / user profile pages that require a Sidebar layout
    const isDashboardRoute =
      base.startsWith("/my-account") ||
      base.startsWith("/customer/") ||
      base.startsWith("/my-orders") ||
      base.startsWith("/address-book");

    if (isDashboardRoute) {
      let pageSkeleton: React.ReactNode = <DashboardSkeleton />;

      // ORDER detail comes BEFORE the list check — /my-orders/[id]
      if (/^\/my-orders\/[^/]+/.test(base)) {
        pageSkeleton = <OrderDetailSkeleton />;
      } else if (base.includes("/order-attachments")) {
        pageSkeleton = <OrderAttachmentsSkeleton />;
      } else if (base.startsWith("/my-orders")) {
        pageSkeleton = <MyOrdersSkeleton />;
      } else if (base.includes("/orders") || base.includes("/orderupload")) {
        pageSkeleton = <OrdersTableSkeleton />;
      } else if (base.includes("/statement") || base.includes("/mystatement")) {
        pageSkeleton = <StatementSkeleton />;
      } else if (base.includes("/forecast") || base.includes("/viewforcast")) {
        pageSkeleton = <ForecastSkeleton />;
      } else if (base.includes("/usernotifications") || base.includes("/notifications")) {
        pageSkeleton = <NotificationsSkeleton />;
      } else if (base.includes("/favourite-products") || base.includes("/wishlist")) {
        // Both /favourite-products and /wishlist render the FavouriteProducts
        // component, so they share the same skeleton.
        pageSkeleton = <FavouriteProductsSkeleton />;
      } else if (base.includes("/address-book") || base.includes("/address")) {
        pageSkeleton = <AddressBookSkeleton />;
      } else if (base.includes("/manage-accounts") || base.includes("/subaccounts")) {
        pageSkeleton = <ManageAccountsSkeleton />;
      } else if (
        base.startsWith("/my-account") ||
        base.includes("/account")
      ) {
        pageSkeleton = <AccountSkeleton />;
      } else if (base.startsWith("/customer/dashboard")) {
        pageSkeleton = <DashboardSkeleton />;
      }

      return (
        <div className="flex flex-col lg:flex-row flex-1 w-full max-w-7xl mx-auto">
          <SidebarSkeleton />
          <div className="flex-1 min-w-0">
            {pageSkeleton}
          </div>
        </div>
      );
    }

    // CMS pages (privacy, terms, return-exchange — also reachable via Magento
    // CMS slugs like /privacy, /terms, /returns-exchange)
    if (
      base.startsWith("/privacy-policy") ||
      base.startsWith("/privacy") ||
      base.startsWith("/terms-conditions") ||
      base.startsWith("/terms") ||
      base.startsWith("/return-exchange-policy") ||
      base.startsWith("/returns-exchange") ||
      base.startsWith("/about")
    ) {
      return <CmsPageSkeleton sections={6} />;
    }

    // Default fallback: product listing style or generic grid
    return <ProductListingSkeleton />;
  };

  return (
    <div className="flex flex-col min-h-screen bg-white max-w-[1920px] mx-auto w-full">
      <NavbarSkeleton />
      <main className="flex-1 flex flex-col w-full relative">
        {renderContent()}
      </main>
      {!hideFooter && <FooterSkeleton />}
    </div>
  );
}

