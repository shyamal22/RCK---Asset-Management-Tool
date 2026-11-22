import { describe, expect, it } from "vitest";
import { isCommon, passwordStrength, suggestPassword } from "./password-strength";

describe("passwordStrength", () => {
  it("counts down to the minimum length", () => {
    expect(passwordStrength("abc")).toMatchObject({ label: "Too short", hint: "Add 5 more characters", ok: false });
    expect(passwordStrength("abcdefg").hint).toBe("Add 1 more character");
  });
  it("refuses common passwords, including with digits on the end", () => {
    expect(isCommon("Password123!")).toBe(true);
    expect(isCommon("allblacks2026")).toBe(true);
    expect(passwordStrength("letmein99")).toMatchObject({ label: "Too common", ok: false });
  });
  it("rates by length and variety", () => {
    expect(passwordStrength("abcdefgh").label).toBe("Weak");
    expect(passwordStrength("Paver-Roller-42").label).toBe("Strong");
    expect(passwordStrength("Correct-Horse-9").ok).toBe(true);
  });
});

describe("suggestPassword", () => {
  it("makes three different machinery words and two digits, and passes the checker", () => {
    let i = 0;
    const seq = [0, 0, 1, 2, 37];
    const pw = suggestPassword((n) => seq[i++] % n);
    expect(pw).toBe("Roller-Paver-Miller-47");
    for (let k = 0; k < 50; k++) expect(passwordStrength(suggestPassword()).label).toBe("Strong");
  });
});
