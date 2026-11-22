/** Re-mounts on each new screen so it can glide in (see .screen-in in globals.css). */
export default function ScreenTemplate({ children }: { children: React.ReactNode }) {
  return <div className="screen-in">{children}</div>;
}
