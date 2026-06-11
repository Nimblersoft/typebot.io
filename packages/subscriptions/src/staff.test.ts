import { beforeEach, describe, expect, it, mock } from "bun:test";

const envMock: { ADMIN_EMAIL: string[] | undefined } = {
  ADMIN_EMAIL: undefined,
};
mock.module("@typebot.io/env", () => ({ env: envMock }));

const { isStaff, assertStaff } = await import("./staff");

describe("isStaff", () => {
  beforeEach(() => {
    envMock.ADMIN_EMAIL = ["Admin@Nimblersoft.com"];
  });

  it("matches the allowlist case-insensitively and trimmed", () => {
    expect(isStaff({ email: "  admin@nimblersoft.com  " })).toBe(true);
  });

  it("rejects an email not on the allowlist", () => {
    expect(isStaff({ email: "someone@else.com" })).toBe(false);
  });

  it("rejects an empty email", () => {
    expect(isStaff({ email: "" })).toBe(false);
    expect(isStaff({ email: null })).toBe(false);
  });

  it("rejects everyone when ADMIN_EMAIL is unset", () => {
    envMock.ADMIN_EMAIL = undefined;
    expect(isStaff({ email: "admin@nimblersoft.com" })).toBe(false);
  });
});

describe("assertStaff", () => {
  beforeEach(() => {
    envMock.ADMIN_EMAIL = ["admin@nimblersoft.com"];
  });

  it("passes for a staff user", () => {
    expect(() => assertStaff({ email: "admin@nimblersoft.com" })).not.toThrow();
  });

  it("throws for a non-staff user", () => {
    expect(() => assertStaff({ email: "nope@else.com" })).toThrow();
  });
});
