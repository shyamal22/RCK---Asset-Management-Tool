"use client";
import { useEffect } from "react";
import { haptic, installHapticTriggers, isIos } from "@/lib/feedback/haptics";
import { installPressController } from "@/lib/feedback/press";

/**
 * One place for touch feedback across the app:
 *  - the press controller: every control shows its pressed look the moment the finger lands
 *    (data-pressed, styled in globals.css "Press");
 *  - a buzz on press-down (Android), and a real system tick on iPhone switches/toggles/options;
 *  - a stronger buzz when an error appears (role="alert"), a double one when a "Saved" note appears.
 */
export function TapFeedback() {
  useEffect(() => {
    const ios = isIos();
    // Android buzzes when a press completes (finger lifted on the control): never for a touch that
    // turned into a scroll, and pointerup counts as a user gesture so even the first tap can vibrate.
    const stopPress = installPressController(undefined, (el) => {
      if (!ios && !el.closest("[data-no-haptic]")) haptic("tap");
    });
    const stopTriggers = installHapticTriggers();

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
      stopPress();
      stopTriggers();
      mo.disconnect();
    };
  }, []);
  return null;
}
