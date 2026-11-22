"use client";
import { CircleCheck } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * "Saved" confirmation that can't be missed on a phone: a pill that rises above the bottom nav,
 * buzzes twice (TapFeedback) and fades after a few seconds. Same message again = shows again.
 */
export function StatusNote({ message, stamp }: { message: string | null; stamp?: unknown }) {
  const [shown, setShown] = useState(message);
  useEffect(() => {
    setShown(message);
    if (!message) return;
    const t = setTimeout(() => setShown(null), 4000);
    return () => clearTimeout(t);
  }, [message, stamp]);
  if (!shown) return null;
  return (
    <p role="status" data-saved className="status-note">
      <CircleCheck className="size-5 text-[var(--tangerine)]" aria-hidden />
      {shown}
    </p>
  );
}
