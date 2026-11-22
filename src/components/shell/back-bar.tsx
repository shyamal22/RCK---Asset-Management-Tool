"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { parentOf } from "@/lib/nav/parent";
import { ScreenStack } from "@/lib/nav/screen-stack";

// One per browser tab (module level, so it survives screen changes).
const screens = new ScreenStack();

function useTrackScreens() {
  const path = usePathname();
  const search = useSearchParams().toString();
  useEffect(() => {
    screens.visit(search ? `${path}?${search}` : path);
  }, [path, search]);
}

/**
 * "‹ Back" for screens below the main tabs. An installed iPhone app has no browser back button.
 * When stepping back in history lands on the right screen, go back (the list keeps its filters and
 * scroll); otherwise (opened straight onto this screen, or arrived from elsewhere) open the parent.
 */
export function BackButton({ hasSetup, className }: { hasSetup: boolean; className?: string }) {
  useTrackScreens();
  const router = useRouter();
  const path = usePathname();
  const search = useSearchParams().toString();
  const parent = parentOf(path, search ? `?${search}` : "", hasSetup);
  if (!parent) return null;
  return (
    <button
      type="button"
      onClick={() => (screens.backReaches(parent, path) ? router.back() : router.push(parent))}
      className={cn("press inline-flex min-h-11 items-center gap-0.5 rounded-full pr-3 text-base font-semibold", className)}
    >
      <ChevronLeft className="size-6" aria-hidden />
      Back
    </button>
  );
}

/** Keeps track of screens even on tab roots (where no Back button shows). */
export function ScreenTracker() {
  useTrackScreens();
  return null;
}
