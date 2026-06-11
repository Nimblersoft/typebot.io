import { describe, expect, it, spyOn } from "bun:test";
import { computeTokenCost } from "./tokenCost";

describe("computeTokenCost", () => {
  it("computes cost for a known model from the static map", () => {
    // gpt-4o: $2.5/1M input, $10/1M output
    const cost = computeTokenCost("openai/gpt-4o", 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(12.5);
  });

  it("prefers the provider-reported cost when present", () => {
    const cost = computeTokenCost("openai/gpt-4o", 1_000_000, 1_000_000, 0.42);
    expect(cost).toBe(0.42);
  });

  it("falls back to the map when reported cost is zero", () => {
    const cost = computeTokenCost("openai/gpt-4o", 1_000_000, 0, 0);
    expect(cost).toBeCloseTo(2.5);
  });

  it("returns 0 and warns for an unknown model with no reported cost", () => {
    const warnSpy = spyOn(console, "warn").mockImplementation(() => {});
    const cost = computeTokenCost("acme/unknown-model", 1000, 1000);
    expect(cost).toBe(0);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
