import { describe, expect, it } from "vitest";
import { createAssetSchema, readingInput } from "./schema";
import { formatReading } from "./labels";

const valid = {
  assetTypeId: "6f1d6c64-9d0a-4c64-8f3c-1b2a3c4d5e6f",
  code: " rol-08 ",
  name: "Roller 8",
  make: "Hamm",
  model: "HD12",
  year: "2019",
  trackingUnit: "hours",
  reading: "1,234.5",
  siteId: "",
};

describe("createAssetSchema", () => {
  it("normalises code, year, reading and empty selects", () => {
    expect(createAssetSchema.parse(valid)).toMatchObject({ code: "ROL-08", year: 2019, reading: 1234.5, siteId: undefined });
  });
  it("requires the six fixed details and a tracking unit (never guessed)", () => {
    const r = createAssetSchema.safeParse({ ...valid, make: " ", trackingUnit: undefined });
    expect(r.success).toBe(false);
    const msgs = r.error!.issues.map((i) => i.message);
    expect(msgs).toContain("Enter the make");
    expect(msgs).toContain("Choose Hours or Kilometres");
  });
  it("rejects silly years and negative readings", () => {
    expect(createAssetSchema.safeParse({ ...valid, year: "19" }).success).toBe(false);
    expect(createAssetSchema.safeParse({ ...valid, year: String(new Date().getFullYear() + 2) }).success).toBe(false);
    expect(readingInput.safeParse("-5").success).toBe(false);
    expect(readingInput.parse("")).toBeUndefined();
  });
});

describe("formatReading", () => {
  it("formats per unit, NZ style", () => {
    expect(formatReading(1234.5, "hours")).toBe("1,234.5 hr");
    expect(formatReading("182300", "km")).toBe("182,300 km");
    expect(formatReading(null, "km")).toBe("No reading");
  });
});
