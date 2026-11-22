/**
 * Small buzz under the finger. Android: Vibration API. iPhone (iOS 18+): Safari has no Vibration
 * API but gives a system tick when a native `<input type="checkbox" switch>` is toggled, so we keep one
 * hidden and toggle it through its label. Silently does nothing where neither exists (desktop).
 */
export type Haptic = "tap" | "success" | "error";

const PATTERNS: Record<Haptic, number | number[]> = { tap: 8, success: [12, 60, 18], error: [30, 50, 30, 50, 30] };
const IOS_TICKS: Record<Haptic, number> = { tap: 1, success: 2, error: 3 };

let iosLabel: HTMLLabelElement | null = null;

function iosTick() {
  if (!iosLabel) {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    input.id = "kre-haptic";
    input.tabIndex = -1;
    input.setAttribute("aria-hidden", "true");
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
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  if (typeof navigator.vibrate === "function") {
    navigator.vibrate(PATTERNS[kind]);
    return;
  }
  if (!/iPhone|iPad|iPod/.test(navigator.userAgent)) return;
  for (let i = 0; i < IOS_TICKS[kind]; i++) setTimeout(iosTick, i * 90);
}
