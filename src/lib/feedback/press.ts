/**
 * One press controller for the whole app (after Ionic's tap-click, React Aria's usePress and
 * Framework7's active-state). It sets `data-pressed` on the tapped control the moment the finger lands,
 * instead of waiting for Safari's `:active` (which arrives late, or never, on a quick tap):
 *  - instant in fixed bars and with a mouse; 50 ms inside the scrolling page, so starting a scroll
 *    doesn't flash rows (Framework7 80 ms, Ionic 100 ms; we go shorter so taps feel immediate);
 *  - a quick tap still shows, and the look is held for at least 120 ms (Ionic 150 ms, Material 225 ms);
 *  - moving more than 8 px (Motion's hold slop), pointercancel (the browser took the touch for a
 *    scroll), any scroll, or a long-press menu cancels it at once.
 */
export const PRESSABLE =
  'button, a[href], [role="button"], [role="tab"], [role="radio"], [role="switch"], [role="checkbox"], [role="option"], [role="menuitem"], summary, label[for], select, [data-pressable]';
/** Controls that never scroll with the page: press shows instantly. */
const FIXED_CHROME = 'nav, header, dialog, [role="dialog"], [data-press-instant]';

export const PRESS_DEFER_MS = 50;
export const PRESS_MIN_HOLD_MS = 120;
export const PRESS_SLOP_PX = 8;

export type PressTiming = { defer: number; minHold: number; slop: number };

export function pressableFrom(target: EventTarget | null): HTMLElement | null {
  const el = (target as Element | null)?.closest?.(PRESSABLE) as HTMLElement | null;
  if (!el || el.closest("[data-no-press]")) return null;
  if (el.matches(':disabled, [aria-disabled="true"]')) return null;
  return el;
}

export function deferFor(el: Element, pointerType: string): number {
  return pointerType === "mouse" || el.closest(FIXED_CHROME) ? 0 : PRESS_DEFER_MS;
}

/** How long to keep the pressed look after release so it was visible for at least the minimum. */
export function holdRemaining(shownAt: number, now: number, minHold = PRESS_MIN_HOLD_MS): number {
  return Math.max(0, minHold - (now - shownAt));
}

export function movedTooFar(x0: number, y0: number, x: number, y: number, slop = PRESS_SLOP_PX): boolean {
  return Math.abs(x - x0) > slop || Math.abs(y - y0) > slop;
}

/** Wires the controller to the document. Returns a cleanup function. */
export function installPressController(onShow?: (el: HTMLElement) => void): () => void {
  let cur: { el: HTMLElement; id: number; x: number; y: number; timer?: number; shownAt?: number } | null = null;
  const releaseTimers = new Map<HTMLElement, number>();

  const show = () => {
    if (!cur || cur.shownAt !== undefined) return;
    const t = releaseTimers.get(cur.el);
    if (t) clearTimeout(t);
    cur.el.setAttribute("data-pressed", "");
    cur.shownAt = performance.now();
    onShow?.(cur.el);
  };
  const clear = (el: HTMLElement) => el.removeAttribute("data-pressed");
  const cancel = () => {
    if (!cur) return;
    clearTimeout(cur.timer);
    clear(cur.el);
    cur = null;
  };
  const down = (e: PointerEvent) => {
    if (!e.isPrimary || e.button !== 0) return;
    cancel();
    const el = pressableFrom(e.target);
    if (!el) return;
    cur = { el, id: e.pointerId, x: e.clientX, y: e.clientY };
    const defer = deferFor(el, e.pointerType);
    if (defer === 0) show();
    else cur.timer = window.setTimeout(show, defer);
  };
  const move = (e: PointerEvent) => {
    if (cur && e.pointerId === cur.id && movedTooFar(cur.x, cur.y, e.clientX, e.clientY)) cancel();
  };
  const up = (e: PointerEvent) => {
    if (!cur || e.pointerId !== cur.id) return;
    clearTimeout(cur.timer);
    show(); // a tap quicker than the defer still flashes
    const { el, shownAt } = cur;
    cur = null;
    const wait = holdRemaining(shownAt ?? performance.now(), performance.now());
    releaseTimers.set(el, window.setTimeout(() => (releaseTimers.delete(el), clear(el)), wait));
  };
  const opts = { capture: true, passive: true } as const;
  document.addEventListener("pointerdown", down, opts);
  document.addEventListener("pointermove", move, opts);
  document.addEventListener("pointerup", up, opts);
  document.addEventListener("pointercancel", cancel, opts);
  document.addEventListener("contextmenu", cancel, opts);
  window.addEventListener("scroll", cancel, opts);
  document.addEventListener("visibilitychange", cancel);
  return () => {
    cancel();
    document.removeEventListener("pointerdown", down, opts);
    document.removeEventListener("pointermove", move, opts);
    document.removeEventListener("pointerup", up, opts);
    document.removeEventListener("pointercancel", cancel, opts);
    document.removeEventListener("contextmenu", cancel, opts);
    window.removeEventListener("scroll", cancel, opts);
    document.removeEventListener("visibilitychange", cancel);
  };
}
