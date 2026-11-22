"use client";
import { useEffect, useState } from "react";
import { Smartphone, X } from "lucide-react";
import { inBrowserOnIos } from "@/lib/feedback/standalone";

const KEY = "kre-hint-dismissed";

/**
 * Links tapped in other apps (Claude, Teams, Outlook, email) always open in that app's browser sheet,
 * with an X, the address and Safari buttons. No website can change that. When we're running that way on
 * an iPhone, say so once, and point to the home-screen icon. Dismissed for the rest of the session.
 */
export function OpenInAppHint() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(KEY) === "1";
    } catch {}
    const nav = navigator as Navigator & { standalone?: boolean };
    if (!dismissed && inBrowserOnIos(nav, window.matchMedia("(display-mode: standalone)").matches)) setShow(true);
  }, []);
  if (!show) return null;
  return (
    <aside aria-label="Open the app" className="open-in-app-hint">
      <Smartphone className="mt-0.5 size-5 shrink-0 text-[var(--tangerine)]" aria-hidden />
      <p className="flex-1 text-footnote leading-snug">For full screen, open KRE Assets from your home screen. Not there? Safari → Share → Add to Home Screen.</p>
      <button
        type="button"
        aria-label="Hide this tip"
        className="press -m-1 flex size-10 shrink-0 items-center justify-center rounded-full text-white/80"
        onClick={() => {
          setShow(false);
          try {
            sessionStorage.setItem(KEY, "1");
          } catch {}
        }}
      >
        <X className="size-5" aria-hidden />
      </button>
    </aside>
  );
}
