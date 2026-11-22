/**
 * Every screen glides in (opacity + 8 px rise, 200 ms, ease-out). Used as each section's template.tsx,
 * one level below the app shell, so it replays for detail screens too (/assets → /assets/[id]) —
 * a single template at the top only fired when switching tabs, so some screens glided and others snapped.
 */
export function ScreenTemplate({ children }: { children: React.ReactNode }) {
  return <div className="screen-in">{children}</div>;
}
