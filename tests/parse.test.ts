import { describe, expect, it } from "vitest";
import { parseViewCount, parseRelativeTime } from "@/lib/parse";

describe("parseViewCount", () => {
  it("returns 0 for empty string", () => {
    expect(parseViewCount("")).toBe("0");
  });

  it("returns 0 for non-numeric input", () => {
    expect(parseViewCount("abc")).toBe("0");
  });

  it("strips the Chinese 觀看次數 prefix and units", () => {
    expect(parseViewCount("觀看次數：109,126次")).toBe("109126");
  });

  it("strips English units and commas", () => {
    expect(parseViewCount("1,234,567 views")).toBe("1234567");
  });

  it("preserves plain numbers", () => {
    expect(parseViewCount("999")).toBe("999");
  });
});

describe("parseRelativeTime", () => {
  it("returns epoch for empty string", () => {
    expect(parseRelativeTime("")).toBe(new Date(0).toISOString());
  });

  it("returns epoch for unparseable input", () => {
    expect(parseRelativeTime("just now")).toBe(new Date(0).toISOString());
  });

  it("subtracts 13 hours from 2026-01-01T00:00:00Z", () => {
    const result = parseRelativeTime("13 小時前");
    expect(new Date(result).toISOString()).toBe("2025-12-31T11:00:00.000Z");
  });

  it("subtracts 2 days", () => {
    const result = parseRelativeTime("2 天前");
    expect(new Date(result).toISOString()).toBe("2025-12-30T00:00:00.000Z");
  });

  it("subtracts 3 months", () => {
    const result = parseRelativeTime("3 月前");
    expect(new Date(result).toISOString()).toBe("2025-10-01T00:00:00.000Z");
  });

  it("subtracts 1 year", () => {
    const result = parseRelativeTime("1 年前");
    expect(new Date(result).toISOString()).toBe("2025-01-01T00:00:00.000Z");
  });
});
