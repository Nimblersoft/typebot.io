import { describe, expect, it } from "bun:test";
import { computeOverageUsd } from "./computeOverageUsd";

describe("computeOverageUsd", () => {
  it("is zero when raw cost is under the included allowance", () => {
    expect(
      computeOverageUsd({
        rawCostUsd: 5,
        includedAiCreditUsd: 20,
        overageMarkupPct: 20,
      }),
    ).toBe(0);
  });

  it("marks up only the excess above the allowance", () => {
    expect(
      computeOverageUsd({
        rawCostUsd: 30,
        includedAiCreditUsd: 20,
        overageMarkupPct: 20,
      }),
    ).toBeCloseTo(12); // (30 - 20) * 1.2
  });

  it("applies no markup when markup is zero", () => {
    expect(
      computeOverageUsd({
        rawCostUsd: 30,
        includedAiCreditUsd: 20,
        overageMarkupPct: 0,
      }),
    ).toBeCloseTo(10);
  });

  it("marks up the whole cost when allowance is zero", () => {
    expect(
      computeOverageUsd({
        rawCostUsd: 30,
        includedAiCreditUsd: 0,
        overageMarkupPct: 20,
      }),
    ).toBeCloseTo(36);
  });
});
