"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { parentOf } from "@/lib/nav/parent";

// The previous screen in this session (module level so it survives screen changes).
let current: string | null = null;
let previous: string | null = null;

function useTrackScreens() {
  const path = usePathname();
  const search = useSearchParams().toString();
  useEffect(() => {
    const here = search ? `${path}?${search}` : path;
    if (here !== current) {
      previous = current;
      current = here;
    }
  }, [path, search]);
}

/**
 * "‹ Back" for screens below the main tabs. An installed iPhone app has no browser back button.
 * If we came from the parent screen, go back in history (keeps its filters and scroll); otherwise
 * (opened straight onto this screen, or arrived from somewhere else) go to the parent screen.
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
      onClick={() => {
        const prevPath = previous?.split("?")[0];
        if (prevPath && prevPath === parent.split("?")[0] && window.history.length > 1) router.back();
        else router.push(parent);
      }}
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
