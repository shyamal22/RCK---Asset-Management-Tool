"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isTabRoot } from "@/lib/nav/parent";
import { BackButton } from "./back-bar";

/**
 * Phone header. Tab screens show the full brand block. Screens below a tab get a slim bar that
 * stays put while scrolling, with "‹ Back" and the company name, like a native app's title bar.
 */
export function PhoneHeader({ brand, initials, companyName, done, hasSetup }: { brand: React.ReactNode; initials: string; companyName: string; done: React.ReactNode; hasSetup: boolean }) {
  const path = usePathname();
  if (isTabRoot(path))
    return (
      <header className="flex items-center justify-between gap-3 px-5 select-none pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-5 md:hidden">
        {brand}
        <div className="flex shrink-0 items-center gap-2">
          {done}
          {/* Me lives here on phones (the bottom bar keeps to five tabs, as iOS does). */}
          <Link
            href="/me"
            aria-label="Me"
            data-press-instant
            className="press flex size-11 items-center justify-center rounded-full bg-white/15 text-footnote font-bold text-white ring-1 ring-white/25"
          >
            {initials}
          </Link>
        </div>
      </header>
    );
  return (
    <header data-press-instant className="sticky top-0 z-40 flex select-none items-center justify-between gap-3 bg-[var(--onyx)] px-3 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-3 text-white md:hidden">
      <BackButton hasSetup={hasSetup} className="text-white" />
      <p className="truncate text-footnote font-semibold text-white/70">{companyName}</p>
      {done}
    </header>
  );
}
