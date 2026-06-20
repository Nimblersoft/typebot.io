import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { setWorkspaceSuspension } from "../src/setWorkspaceSuspension";
import { createTestWorkspace, testDb } from "./helpers";

let db: ReturnType<typeof testDb>;
beforeAll(() => {
  db = testDb();
});

const staff = { id: "staff-user", email: "staff@example.com" };

describe("setWorkspaceSuspension", () => {
  it("suspends a workspace, persists the reason, and audit-logs the action", async () => {
    const workspace = await createTestWorkspace("BUSINESS");

    await setWorkspaceSuspension(
      {
        workspaceId: workspace.id,
        isSuspended: true,
        reason: "ToS violation: spam",
        performedBy: staff,
      },
      db,
    );

    const updated = await db.workspace.findUniqueOrThrow({
      where: { id: workspace.id },
    });
    expect(updated.isSuspended).toBe(true);
    expect(updated.suspendReason).toBe("ToS violation: spam");

    const logs = await db.workspaceAuditLog.findMany({
      where: { workspaceId: workspace.id },
    });
    expect(logs).toHaveLength(1);
    expect(logs[0]?.action).toBe("SUSPEND");
    expect(logs[0]?.reason).toBe("ToS violation: spam");
    expect(logs[0]?.performedByUserId).toBe(staff.id);
    expect(logs[0]?.performedByEmail).toBe(staff.email);
  });

  it("reactivation clears the reason and records an UNSUSPEND entry", async () => {
    const workspace = await createTestWorkspace("BUSINESS");
    await setWorkspaceSuspension(
      {
        workspaceId: workspace.id,
        isSuspended: true,
        reason: "abuse",
        performedBy: staff,
      },
      db,
    );

    await setWorkspaceSuspension(
      { workspaceId: workspace.id, isSuspended: false, performedBy: staff },
      db,
    );

    const updated = await db.workspace.findUniqueOrThrow({
      where: { id: workspace.id },
    });
    expect(updated.isSuspended).toBe(false);
    expect(updated.suspendReason).toBeNull();

    const logs = await db.workspaceAuditLog.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "asc" },
    });
    expect(logs.map((l) => l.action)).toEqual(["SUSPEND", "UNSUSPEND"]);
    expect(logs[1]?.reason).toBeNull();
  });

  it("keeps an append-only history across multiple suspensions", async () => {
    const workspace = await createTestWorkspace("BUSINESS");
    const reasons = [`r1-${randomUUID()}`, `r2-${randomUUID()}`];
    for (const reason of reasons) {
      await setWorkspaceSuspension(
        {
          workspaceId: workspace.id,
          isSuspended: true,
          reason,
          performedBy: staff,
        },
        db,
      );
      await setWorkspaceSuspension(
        { workspaceId: workspace.id, isSuspended: false, performedBy: staff },
        db,
      );
    }

    const logs = await db.workspaceAuditLog.findMany({
      where: { workspaceId: workspace.id },
    });
    expect(logs).toHaveLength(4);
  });
});
