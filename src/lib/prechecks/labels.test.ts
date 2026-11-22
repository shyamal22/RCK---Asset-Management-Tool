import { describe, expect, it } from "vitest";
import { answerLabel, flagFor, worst } from "./labels";

describe("pre-check flags (same rules as the database)", () => {
  it("Fine / Usable / Broken → green / yellow / red", () => {
    expect(["fine", "usable", "broken"].map((a) => flagFor("condition", a, null))).toEqual(["green", "yellow", "red"]);
  });
  it("Yes/No: only the problem answer is red", () => {
    expect(flagFor("yes_no", "yes", "yes")).toBe("red");
    expect(flagFor("yes_no", "no", "yes")).toBe("green");
    expect(flagFor("yes_no", "no", "no")).toBe("red");
  });
  it("free text never flags; overall = worst", () => {
    expect(flagFor("text", "anything", null)).toBe("green");
    expect(worst(["green", "yellow"])).toBe("yellow");
    expect(worst(["yellow", "red", "green"])).toBe("red");
    expect(worst([])).toBe("green");
  });
  it("reads answers back", () => {
    expect(answerLabel("condition", "usable")).toBe("Usable");
    expect(answerLabel("yes_no", "no")).toBe("No");
  });
});
