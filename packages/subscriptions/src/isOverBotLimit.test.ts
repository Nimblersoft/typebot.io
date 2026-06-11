import { describe, expect, it } from "bun:test";
import { isOverBotLimit } from "./isOverBotLimit";

describe("isOverBotLimit", () => {
  it("rejects the 3rd bot on a 2-bot (FREE) plan", () => {
    expect(isOverBotLimit(2, 1)).toBe(false);
    expect(isOverBotLimit(2, 2)).toBe(true);
  });

  it("allows up to 10 bots on a Business plan", () => {
    expect(isOverBotLimit(10, 9)).toBe(false);
    expect(isOverBotLimit(10, 10)).toBe(true);
  });

  it("never trips on an unlimited plan", () => {
    expect(isOverBotLimit("inf", 1_000)).toBe(false);
  });
});
