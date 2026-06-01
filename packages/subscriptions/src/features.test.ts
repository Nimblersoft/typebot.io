import { describe, expect, it } from "bun:test";
import { Plan } from "@typebot.io/prisma/enum";
import { assertFeature, hasFeature, planFeatures } from "./features";

describe("features", () => {
  it("grants calCom + advancedModules to BUSINESS", () => {
    expect(hasFeature(Plan.BUSINESS, "calCom")).toBe(true);
    expect(hasFeature(Plan.BUSINESS, "advancedModules")).toBe(true);
  });

  it("denies all gated features to FREE", () => {
    expect(hasFeature(Plan.FREE, "calCom")).toBe(false);
    expect(hasFeature(Plan.FREE, "advancedModules")).toBe(false);
    expect(planFeatures(Plan.FREE)).toHaveLength(0);
  });

  it("assertFeature throws FORBIDDEN for non-entitled plans", () => {
    expect(() => assertFeature(Plan.FREE, "calCom")).toThrow();
  });

  it("assertFeature does not throw for entitled plans", () => {
    expect(() => assertFeature(Plan.BUSINESS, "calCom")).not.toThrow();
  });
});
