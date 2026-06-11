import { describe, expect, it } from "bun:test";
import { isOverCeiling } from "./isOverCeiling";

describe("isOverCeiling", () => {
  it("is false under the ceiling", () => {
    expect(isOverCeiling({ periodCostUsd: 50, aiHardCeilingUsd: 100 })).toBe(
      false,
    );
  });

  it("trips exactly at the ceiling", () => {
    expect(isOverCeiling({ periodCostUsd: 100, aiHardCeilingUsd: 100 })).toBe(
      true,
    );
  });

  it("trips over the ceiling", () => {
    expect(isOverCeiling({ periodCostUsd: 150, aiHardCeilingUsd: 100 })).toBe(
      true,
    );
  });

  it("never trips when the ceiling is null", () => {
    expect(
      isOverCeiling({ periodCostUsd: 1_000_000, aiHardCeilingUsd: null }),
    ).toBe(false);
  });
});
