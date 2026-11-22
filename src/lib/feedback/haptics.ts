/**
 * Small buzz under the finger.
 * - Android: Vibration API (fired on press-down by the press controller).
 * - iPhone: Safari has no Vibration API. Toggling a native `<input type="checkbox" switch>` plays the
 *   system tick, but since iOS 26.5 only when the user's own tap toggles it (ios-haptics, tijnjh). So
 *   `installHapticTriggers` puts an invisible label + hidden switch inside switches, toggles and pick-one
 *   options (plain type="button" controls only: inside a link or submit button the label would swallow
 *   the navigation/submit). The older code-triggered tick is kept for iOS 17.4–26.4.
 * Haptics aren't motion, so Reduce Motion doesn't turn them off.
 */
export type Haptic = "tap" | "success" | "error";

const PATTERNS: Record<Haptic, number | number[]> = { tap: 12, success: [14, 60, 20], error: [30, 50, 30, 50, 30] };
const IOS_TICKS: Record<Haptic, number> = { tap: 1, success: 2, error: 3 };

export const isIos = () =>
  typeof navigator !== "undefined" && (/iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1));

let iosLabel: HTMLLabelElement | null = null;
function iosTick() {
  if (!iosLabel) {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    input.id = "kre-haptic";
    input.tabIndex = -1;
    iosLabel = document.createElement("label");
    iosLabel.htmlFor = input.id;
    iosLabel.setAttribute("aria-hidden", "true");
    iosLabel.style.cssText = "position:fixed;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;left:-9px;top:0";
    iosLabel.append(input);
    document.body.append(iosLabel);
  }
  iosLabel.click();
}

export function haptic(kind: Haptic = "tap") {
  if (typeof window === "undefined") return;
  if (typeof navigator.vibrate === "function") {
    navigator.vibrate(PATTERNS[kind]);
    return;
  }
  if (!isIos()) return;
  for (let i = 0; i < IOS_TICKS[kind]; i++) setTimeout(iosTick, i * 90);
}

/** Controls that get a real iPhone tick from the user's own tap. */
export const HAPTIC_TARGETS =
  'button[type="button"][data-slot="switch"], button[type="button"][data-slot="toggle-group-item"], button[type="button"][data-slot="toggle"], button[type="button"][data-haptic]';

export function addHapticTrigger(el: HTMLElement) {
  if (el.querySelector(":scope > [data-haptic-trigger]")) return;
  const label = document.createElement("label");
  label.setAttribute("data-haptic-trigger", "");
  label.setAttribute("aria-hidden", "true");
  label.style.cssText = "position:absolute;inset:0;border-radius:inherit;-webkit-tap-highlight-color:transparent;cursor:inherit";
  const sw = document.createElement("input");
  sw.type = "checkbox";
  sw.setAttribute("switch", "");
  sw.tabIndex = -1;
  // Never under the finger (WebKit would treat the touch as handled and stop scrolling).
  sw.style.cssText = "position:absolute;width:1px;height:1px;margin:0;visibility:hidden;pointer-events:none";
  // The label passes its click on to the switch; don't let that copy reach the control's own handlers.
  sw.addEventListener("click", (e) => e.stopPropagation());
  label.append(sw);
  if (getComputedStyle(el).position === "static") el.style.position = "relative";
  el.append(label);
}

/** Adds triggers to matching controls now and as they appear. iPhone only. */
export function installHapticTriggers(): () => void {
  if (!isIos()) return () => {};
  const scan = (root: ParentNode) => root.querySelectorAll<HTMLElement>(HAPTIC_TARGETS).forEach(addHapticTrigger);
  scan(document);
  const mo = new MutationObserver((records) => {
    for (const r of records)
      for (const n of r.addedNodes)
        if (n instanceof HTMLElement) {
          if (n.matches(HAPTIC_TARGETS)) addHapticTrigger(n);
          scan(n);
        }
  });
  mo.observe(document.body, { childList: true, subtree: true });
  return () => mo.disconnect();
}
