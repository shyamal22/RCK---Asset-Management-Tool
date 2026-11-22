/**
 * Orbit wheel geometry. Each item's angle on the ring → sin/cos → one CSS matrix() transform.
 * `pos` is the (fractional) index at the front; `n` items.
 * Fleets up to 16 wrap all the way round; bigger ones use a fixed 36° step and show a window
 * of the ring around the front (no wrap), so 40 machines don't pile on top of each other.
 */
export const WRAP_MAX = 16;

export function relativeAngle(i: number, pos: number, n: number): number {
  if (n <= WRAP_MAX) {
    const step = (2 * Math.PI) / n;
    let d = (i - pos) % n;
    if (d > n / 2) d -= n;
    if (d < -n / 2) d += n;
    return d * step;
  }
  return (i - pos) * (Math.PI / 5);
}

export type OrbitPose = { matrix: string; z: number; opacity: number; front: number; hidden: boolean };

/** rx/ry: ring radii in px. front: 1 at the front, 0 at the back. */
export function pose(theta: number, rx: number, ry: number): OrbitPose {
  const sin = Math.sin(theta);
  const cos = Math.cos(theta);
  const front = (cos + 1) / 2;
  const s = 0.42 + 0.58 * front;
  const x = rx * sin;
  const y = -ry * (1 - front);
  return {
    matrix: `matrix(${s.toFixed(4)}, 0, 0, ${s.toFixed(4)}, ${x.toFixed(2)}, ${y.toFixed(2)})`,
    z: Math.round(front * 1000),
    opacity: Math.abs(theta) > Math.PI ? 0 : 0.2 + 0.8 * front ** 1.6,
    front,
    hidden: Math.abs(theta) > Math.PI,
  };
}

/** Nearest whole index to `pos` (wrapping for small fleets, clamped for big ones). */
export function nearest(pos: number, n: number): number {
  if (n <= WRAP_MAX) return ((Math.round(pos) % n) + n) % n;
  return Math.max(0, Math.min(n - 1, Math.round(pos)));
}

/** Shortest target for snapping/stepping to index `i` from `pos` (avoids spinning the long way round). */
export function targetFor(i: number, pos: number, n: number): number {
  if (n > WRAP_MAX) return Math.max(0, Math.min(n - 1, i));
  let d = (i - pos) % n;
  if (d > n / 2) d -= n;
  if (d < -n / 2) d += n;
  return pos + d;
}
