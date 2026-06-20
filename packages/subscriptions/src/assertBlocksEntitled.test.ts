import { describe, expect, it } from "bun:test";
import { Plan } from "@typebot.io/prisma/enum";
import { assertBlocksEntitled } from "./assertBlocksEntitled";

const groupsWithCalCom = [{ blocks: [{ type: "text" }, { type: "cal-com" }] }];
const groupsWithoutCalCom = [
  { blocks: [{ type: "text" }, { type: "open-router" }] },
];

describe("assertBlocksEntitled", () => {
  it("throws for FREE when a cal-com block is present", () => {
    expect(() => assertBlocksEntitled(Plan.FREE, groupsWithCalCom)).toThrow();
  });

  it("allows BUSINESS to use a cal-com block", () => {
    expect(() =>
      assertBlocksEntitled(Plan.BUSINESS, groupsWithCalCom),
    ).not.toThrow();
  });

  it("allows ENTERPRISE to use a cal-com block", () => {
    expect(() =>
      assertBlocksEntitled(Plan.ENTERPRISE, groupsWithCalCom),
    ).not.toThrow();
  });

  it("does not throw for FREE when no gated block is present", () => {
    expect(() =>
      assertBlocksEntitled(Plan.FREE, groupsWithoutCalCom),
    ).not.toThrow();
  });

  it("does not throw on an empty flow", () => {
    expect(() => assertBlocksEntitled(Plan.FREE, [])).not.toThrow();
  });
});
