"use client";
import { useEffect, useRef } from "react";

/** Horizontal rail that glides the selected bay/chip into view when the selection changes. */
export function BayRail({ label, className, children }: { label: string; className: string; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const last = useRef<string | null>(null);
  useEffect(() => {
    const r = ref.current;
    const active = r?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!r || !active) return;
    const key = active.getAttribute("href");
    if (key === last.current) return; // only move when the choice changed, never fight the finger
    const first = last.current === null;
    last.current = key;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    r.scrollTo({ left: active.offsetLeft - r.clientWidth / 2 + active.offsetWidth / 2, behavior: first || reduce ? "auto" : "smooth" });
  });
  return (
    <nav ref={ref} aria-label={label} className={className}>
      {children}
    </nav>
  );
}
