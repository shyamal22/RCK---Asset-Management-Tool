import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn knows the Apple text styles", () => {
  it("keeps a text style and a text colour together", () => {
    expect(cn("text-headline", "text-primary-foreground")).toBe("text-headline text-primary-foreground");
    expect(cn("text-footnote text-muted-foreground")).toBe("text-footnote text-muted-foreground");
  });
  it("a later text style still replaces an earlier one", () => {
    expect(cn("text-body", "text-title1")).toBe("text-title1");
  });
});
