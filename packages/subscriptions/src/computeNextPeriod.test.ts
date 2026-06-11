import { describe, expect, it } from "bun:test";
import { computeNextPeriod } from "./computeNextPeriod";

const ymd = (d: Date) => [d.getFullYear(), d.getMonth() + 1, d.getDate()];

describe("computeNextPeriod", () => {
  it("advances a normal month keeping the anchor day", () => {
    const { periodStart, periodEnd, dueAt } = computeNextPeriod(
      15,
      new Date(2026, 2, 15),
    );
    expect(ymd(periodStart)).toEqual([2026, 3, 15]);
    expect(ymd(periodEnd)).toEqual([2026, 4, 15]);
    expect(ymd(dueAt)).toEqual([2026, 3, 22]);
  });

  it("clamps anchor 31 to Feb 28 in a non-leap year", () => {
    const { periodEnd } = computeNextPeriod(31, new Date(2026, 0, 31));
    expect(ymd(periodEnd)).toEqual([2026, 2, 28]);
  });

  it("clamps anchor 31 to Feb 29 in a leap year", () => {
    const { periodEnd } = computeNextPeriod(31, new Date(2024, 0, 31));
    expect(ymd(periodEnd)).toEqual([2024, 2, 29]);
  });

  it("clamps anchor 30 to the last day of February", () => {
    const { periodEnd } = computeNextPeriod(30, new Date(2025, 0, 30));
    expect(ymd(periodEnd)).toEqual([2025, 2, 28]);
  });

  it("keeps anchor 28 exactly (valid in every month)", () => {
    const { periodEnd } = computeNextPeriod(28, new Date(2026, 0, 28));
    expect(ymd(periodEnd)).toEqual([2026, 2, 28]);
  });

  it("recovers the anchor day after a short month", () => {
    const { periodEnd } = computeNextPeriod(31, new Date(2026, 1, 28));
    expect(ymd(periodEnd)).toEqual([2026, 3, 31]);
  });

  it("rolls over the year in December", () => {
    const { periodStart, periodEnd } = computeNextPeriod(
      15,
      new Date(2026, 11, 15),
    );
    expect(ymd(periodStart)).toEqual([2026, 12, 15]);
    expect(ymd(periodEnd)).toEqual([2027, 1, 15]);
  });
});
