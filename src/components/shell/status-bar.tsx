/**
 * Installed on an iPhone the app runs under a see-through status bar. Once the page scrolls, white
 * content would sit behind the white clock and battery; this onyx strip keeps them readable.
 * Zero height everywhere else (no notch, or a normal browser tab).
 */
export function StatusBarBackdrop() {
  return <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[env(safe-area-inset-top)] bg-[var(--onyx)] md:hidden" />;
}
