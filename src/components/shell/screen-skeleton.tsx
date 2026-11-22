/**
 * Placeholder shown the instant a bottom-tab screen is tapped, while the server prepares it (dynamic
 * pages can't be prefetched without a loading boundary). Only the tab pages use it (their loading.tsx
 * sits in a route group next to the page): a loading boundary starts streaming before the page runs,
 * after which notFound() can no longer send a 404, and detail/Setup screens rely on real 404s.
 * Not on Assets or Reports: their filters/Open-Closed are same-page search-param changes, and with a
 * loading boundary there Next 15.5 sometimes received the new page but never showed it (found 22/11/2026).
 */
export function ScreenSkeleton() {
  return (
    <div className="grid max-w-5xl gap-4" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-9 w-44 rounded-xl" />
      <div className="skeleton h-28 rounded-[1.25rem]" />
      <div className="grid grid-cols-2 gap-3">
        <div className="skeleton h-24 rounded-[1.25rem]" />
        <div className="skeleton h-24 rounded-[1.25rem]" />
      </div>
      <div className="skeleton h-40 rounded-[1.25rem]" />
    </div>
  );
}
