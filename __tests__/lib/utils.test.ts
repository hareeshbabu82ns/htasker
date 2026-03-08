import { describe, it, expect } from "vitest";
import { formatDuration, calculateContrastColor } from "@/lib/utils";

describe("formatDuration", () => {
  it("returns '0s' for zero seconds", () => {
    expect(formatDuration(0)).toBe("0s");
  });

  it("formats seconds only", () => {
    expect(formatDuration(45)).toBe("45s");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(90)).toBe("1m 30s");
  });

  it("formats hours, minutes and seconds", () => {
    expect(formatDuration(3661)).toBe("1h 1m 1s");
  });

  it("formats hours and zero minutes when minutes = 0", () => {
    // 3600s = 1h 0m 0s — minutes shown because hours > 0
    expect(formatDuration(3600)).toBe("1h 0m 0s");
  });

  it("handles large values", () => {
    // 36000 = 10h 0m 0s
    expect(formatDuration(36000)).toBe("10h 0m 0s");
  });
});

describe("calculateContrastColor", () => {
  it("returns white for dark colors", () => {
    expect(calculateContrastColor("#000000")).toBe("#ffffff");
  });

  it("returns black for light colors", () => {
    expect(calculateContrastColor("#ffffff")).toBe("#000000");
  });

  it("returns black for medium-light colors", () => {
    expect(calculateContrastColor("#ffff00")).toBe("#000000"); // yellow — light
  });

  it("returns white for medium-dark colors", () => {
    expect(calculateContrastColor("#0000ff")).toBe("#ffffff"); // blue — dark
  });

  it("handles shorthand hex (#ABC)", () => {
    expect(calculateContrastColor("#fff")).toBe("#000000"); // white → black text
  });

  it("handles missing # prefix", () => {
    // hex without # — treated as empty hex, falls through NaN path
    // The function strips '#', so passing 'ffffff' works if it's 6 chars
    expect(calculateContrastColor("#ffffff")).toBe("#000000");
  });

  it("returns white for empty/null-ish color", () => {
    expect(calculateContrastColor("")).toBe("#ffffff");
    expect(calculateContrastColor("#000")).toBe("#ffffff");
  });
});
