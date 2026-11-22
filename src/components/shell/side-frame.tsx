"use client";
import { useCallback, useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";

import { SIDE_COOKIE } from "@/lib/nav/side";

/**
 * Desktop / tablet frame with a collapsible side menu. Collapsed, the menu slides away and the
 * main panel takes the whole width; a small button (or Ctrl/⌘+B) brings it back. The choice is
 * remembered in a cookie so the next page renders the same way with no jump. Phones use the bottom nav.
 */
export function SideFrame({ initialCollapsed, aside, children }: { initialCollapsed: boolean; aside: React.ReactNode; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const toggle = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      document.cookie = `${SIDE_COOKIE}=${next ? "collapsed" : "open"}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "b" && (e.metaKey || e.ctrlKey) && !e.altKey) {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  return (
    <div data-collapsed={collapsed} className="side-frame group/side app-theme md:grid">
      <aside inert={collapsed} aria-hidden={collapsed || undefined} className="side-menu hidden md:flex md:flex-col md:gap-8 md:p-6">
        <button
          type="button"
          onClick={toggle}
          aria-label="Hide menu"
          title="Hide menu (Ctrl+B)"
          className="press flex size-10 items-center justify-center self-end rounded-full text-white/75 hover:bg-white/10 hover:text-white"
        >
          <PanelLeftClose className="size-5" aria-hidden />
        </button>
        {aside}
      </aside>
      <button
        type="button"
        onClick={toggle}
        aria-label="Show menu"
        title="Show menu (Ctrl+B)"
        className={cn(
          "press fixed top-6 left-6 z-40 hidden size-10 items-center justify-center rounded-full bg-[var(--onyx)] text-white shadow-lg",
          collapsed && "md:flex",
        )}
      >
        <PanelLeftOpen className="size-5" aria-hidden />
      </button>
      {children}
    </div>
  );
}
