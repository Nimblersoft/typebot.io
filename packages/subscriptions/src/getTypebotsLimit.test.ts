import { describe, expect, it } from "bun:test";
import { Plan } from "@typebot.io/prisma/enum";
import { getTypebotsLimit } from "./getTypebotsLimit";

describe("getTypebotsLimit", () => {
  it("caps FREE at 2 bots", () => {
    expect(getTypebotsLimit(Plan.FREE)).toBe(2);
  });

  it("caps BUSINESS at 10 bots", () => {
    expect(getTypebotsLimit(Plan.BUSINESS)).toBe(10);
  });

  it("returns inf (no cap) for ENTERPRISE", () => {
    expect(getTypebotsLimit(Plan.ENTERPRISE)).toBe("inf");
  });

  it("returns inf for legacy unlimited Stripe plans", () => {
    expect(getTypebotsLimit(Plan.UNLIMITED)).toBe("inf");
    expect(getTypebotsLimit(Plan.LIFETIME)).toBe("inf");
    expect(getTypebotsLimit(Plan.CUSTOM)).toBe("inf");
    expect(getTypebotsLimit(Plan.OFFERED)).toBe("inf");
  });

  it("never returns 0 or undefined for any plan", () => {
    for (const plan of Object.values(Plan)) {
      const limit = getTypebotsLimit(plan);
      expect(limit === "inf" || limit > 0).toBe(true);
    }
  });
});
