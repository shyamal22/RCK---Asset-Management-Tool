import { describe, expect, it } from "vitest";
import { nearest, pose, relativeAngle, targetFor } from "./orbit-math";

describe("orbit geometry", () => {
  it("front item is full size at the centre; opposite item is half size and dim", () => {
    const front = pose(0, 200, 40);
    expect(front.matrix).toBe("matrix(1.0000, 0, 0, 1.0000, 0.00, 0.00)");
    expect(front.opacity).toBe(1);
    const back = pose(Math.PI, 200, 40);
    expect(back.matrix.startsWith("matrix(0.4200, 0, 0, 0.4200,")).toBe(true);
    expect(back.z).toBe(0);
    expect(back.opacity).toBeCloseTo(0.2);
  });
  it("small fleets wrap round the ring; big fleets use a window", () => {
    expect(relativeAngle(3, 0, 4)).toBeCloseTo(-Math.PI / 2); // wraps to the left
    expect(relativeAngle(20, 0, 30)).toBeCloseTo(4 * Math.PI); // big fleet: far away, hidden
    expect(pose(relativeAngle(20, 0, 30), 200, 40).hidden).toBe(true);
  });
  it("snaps to the nearest machine the short way round", () => {
    expect(nearest(3.6, 4)).toBe(0);
    expect(nearest(-0.4, 4)).toBe(0);
    expect(targetFor(3, 0, 4)).toBe(-1);
    expect(nearest(40.2, 30)).toBe(29);
  });
});
