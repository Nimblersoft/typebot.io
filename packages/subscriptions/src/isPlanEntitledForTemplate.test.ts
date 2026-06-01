import { describe, expect, it } from "bun:test";
import { Plan } from "@typebot.io/prisma/enum";
import { isPlanEntitledForTemplate } from "./isPlanEntitledForTemplate";

describe("isPlanEntitledForTemplate", () => {
  it("allows any plan when the template has no requirement", () => {
    expect(isPlanEntitledForTemplate(Plan.FREE, undefined)).toBe(true);
  });

  it("blocks FREE from BUSINESS-gated templates", () => {
    expect(isPlanEntitledForTemplate(Plan.FREE, "BUSINESS")).toBe(false);
  });

  it("allows BUSINESS and ENTERPRISE for BUSINESS-gated templates", () => {
    expect(isPlanEntitledForTemplate(Plan.BUSINESS, "BUSINESS")).toBe(true);
    expect(isPlanEntitledForTemplate(Plan.ENTERPRISE, "BUSINESS")).toBe(true);
  });

  it("blocks BUSINESS from ENTERPRISE-gated templates", () => {
    expect(isPlanEntitledForTemplate(Plan.BUSINESS, "ENTERPRISE")).toBe(false);
  });

  it("allows ENTERPRISE for ENTERPRISE-gated templates", () => {
    expect(isPlanEntitledForTemplate(Plan.ENTERPRISE, "ENTERPRISE")).toBe(true);
  });
});
