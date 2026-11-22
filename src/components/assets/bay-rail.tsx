"use client";
import { useEffect, useRef } from "react";

/** Horizontal rail that keeps the selected bay/chip in view after navigation. */
export function BayRail({ label, className, children }: { label: string; className: string; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const active = ref.current?.querySelector<HTMLElement>('[aria-current="true"]');
    if (active && ref.current) {
      const r = ref.current;
      r.scrollLeft = active.offsetLeft - r.clientWidth / 2 + active.offsetWidth / 2;
    }
  });
  return (
    <nav ref={ref} aria-label={label} className={className}>
      {children}
    </nav>
  );
}
