import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { activateSubscription } from "../src/activate";
import { assertWorkspaceMember } from "../src/api/assertWorkspaceMember";
import { getAiUsage } from "../src/getAiUsage";
import { createTestWorkspace, testDb } from "./helpers";

let db: ReturnType<typeof testDb>;
beforeAll(() => {
  db = testDb();
});

const createTestUser = () =>
  db.user.create({
    data: {
      email: `user-${randomUUID()}@example.com`,
      onboardingCategories: [],
    },
  });

describe("getAiUsage", () => {
  it("returns null for a workspace with no subscription", async () => {
    const workspace = await createTestWorkspace("FREE");
    expect(await getAiUsage(workspace.id, db)).toBeNull();
  });

  it("aggregates period cost and derives the marked-up overage", async () => {
    const workspace = await createTestWorkspace("FREE");
    const { subscription } = await activateSubscription(
      workspace.id,
      "BUSINESS",
      { includedAiCreditUsd: 20, overageMarkupPct: 20 },
      db,
    );

    await db.lLMUsageLog.create({
      data: {
        workspaceId: workspace.id,
        model: "openai/gpt-4o",
        provider: "openai",
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        costUsd: 30,
        createdAt: new Date(subscription.currentPeriodStart.getTime() + 1000),
      },
    });

    const usage = await getAiUsage(workspace.id, db);
    expect(usage).not.toBeNull();
    expect(usage!.rawCostUsd).toBeCloseTo(30);
    expect(usage!.includedAiCreditUsd).toBe(20);
    // (30 - 20) * 1.2 = 12
    expect(usage!.overageUsd).toBeCloseTo(12);
  });

  it("ignores usage logged before the current period start", async () => {
    const workspace = await createTestWorkspace("FREE");
    const { subscription } = await activateSubscription(
      workspace.id,
      "BUSINESS",
      {},
      db,
    );

    await db.lLMUsageLog.create({
      data: {
        workspaceId: workspace.id,
        model: "openai/gpt-4o",
        provider: "openai",
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        costUsd: 99,
        createdAt: new Date(subscription.currentPeriodStart.getTime() - 1000),
      },
    });

    const usage = await getAiUsage(workspace.id, db);
    expect(usage!.rawCostUsd).toBe(0);
  });
});

describe("assertWorkspaceMember", () => {
  it("resolves for a member of the workspace", async () => {
    const workspace = await createTestWorkspace("FREE");
    const user = await createTestUser();
    await db.memberInWorkspace.create({
      data: { workspaceId: workspace.id, userId: user.id, role: "ADMIN" },
    });

    await expect(
      assertWorkspaceMember(user, workspace.id, db),
    ).resolves.toBeUndefined();
  });

  it("rejects a non-member with NOT_FOUND", async () => {
    const workspace = await createTestWorkspace("FREE");
    const stranger = await createTestUser();

    await expect(
      assertWorkspaceMember(stranger, workspace.id, db),
    ).rejects.toThrow(/not found/i);
  });
});
