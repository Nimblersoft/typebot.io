import { describe, expect, it } from "vitest";
import { getTypebotsLimit } from "../src/getTypebotsLimit";
import { isOverBotLimit } from "../src/isOverBotLimit";
import { createTestTypebot, createTestWorkspace, testDb } from "./helpers";

// Mirrors the create-path guard (handleCreateTypebot / handleImportTypebot):
// count non-archived bots, then compare against the plan limit.
const countActiveBots = (workspaceId: string) =>
  testDb().typebot.count({
    where: { workspaceId, isArchived: { not: true } },
  });

describe("bot-limit guard", () => {
  it("excludes archived bots from the count and blocks the 3rd FREE bot", async () => {
    const workspace = await createTestWorkspace("FREE");
    await createTestTypebot(workspace.id);
    await createTestTypebot(workspace.id);
    await createTestTypebot(workspace.id, { isArchived: true });

    const count = await countActiveBots(workspace.id);
    expect(count).toBe(2); // archived one excluded

    const limit = getTypebotsLimit(workspace.plan);
    expect(isOverBotLimit(limit, count)).toBe(true);
  });

  it("allows a Business workspace below its 10-bot limit", async () => {
    const workspace = await createTestWorkspace("BUSINESS");
    await createTestTypebot(workspace.id);

    const count = await countActiveBots(workspace.id);
    const limit = getTypebotsLimit(workspace.plan);
    expect(isOverBotLimit(limit, count)).toBe(false);
  });
});
