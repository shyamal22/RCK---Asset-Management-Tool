"use client";
import { useEffect } from "react";
import { haptic } from "@/lib/feedback/haptics";

const TAPPABLE = 'button, a[href], [role="button"], [role="switch"], [role="radio"], [role="tab"], [role="checkbox"], summary';

/**
 * One place for touch feedback across the app:
 *  - a light tick on every button / link / switch tap (not on disabled ones);
 *  - a stronger buzz when an error appears (role="alert"), a double tick when a "Saved" note appears (role="status").
 */
export function TapFeedback() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.(TAPPABLE);
      if (!el || el.closest("[data-no-haptic]")) return;
      if (el.matches(":disabled, [aria-disabled='true']")) return;
      haptic("tap");
    };
    document.addEventListener("click", onClick, { capture: true });

    const seen = new WeakSet<Element>();
    const check = (el: Element) => {
      if (seen.has(el) || !el.textContent?.trim()) return;
      seen.add(el);
      const role = el.getAttribute("role");
      if (role === "alert" && !el.hasAttribute("data-quiet")) haptic("error");
      else if (role === "status" && el.hasAttribute("data-saved")) haptic("success");
    };
    const mo = new MutationObserver((records) => {
      for (const r of records)
        for (const n of r.addedNodes) {
          if (!(n instanceof Element)) continue;
          if (n.matches('[role="alert"], [role="status"]')) check(n);
          n.querySelectorAll?.('[role="alert"], [role="status"]').forEach(check);
        }
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      mo.disconnect();
    };
  }, []);
  return null;
}
