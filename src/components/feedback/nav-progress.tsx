"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Thin tangerine bar across the top while the next screen loads, so a tap never feels ignored.
 * Starts on any same-site link tap; finishes when the URL changes.
 */
export function NavProgress() {
  const path = usePathname();
  const params = useSearchParams();
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      clearTimeout(timer.current);
      setState("busy");
    };
    // Bubble phase, so links that cancel the click (orbit cards spinning to the front) don't start it.
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    setState((s) => (s === "busy" ? "done" : s));
    timer.current = setTimeout(() => setState("idle"), 350);
    return () => clearTimeout(timer.current);
  }, [path, params]);

  if (state === "idle") return null;
  return <div aria-hidden className="nav-progress" data-state={state} />;
}
