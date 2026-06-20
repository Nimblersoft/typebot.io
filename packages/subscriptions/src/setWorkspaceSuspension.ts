import prisma from "@typebot.io/prisma";

type SetWorkspaceSuspensionParams = {
  workspaceId: string;
  isSuspended: boolean;
  reason?: string;
  performedBy: { id: string; email?: string | null };
};

// Suspends or reactivates a workspace and records the action in the append-only
// WorkspaceAuditLog, in one transaction. Suspension is reserved for ToS/abuse —
// non-payment uses the grace/quarantine flags instead. Reactivating clears the
// stored reason; history stays queryable via the audit log.
export const setWorkspaceSuspension = (
  {
    workspaceId,
    isSuspended,
    reason,
    performedBy,
  }: SetWorkspaceSuspensionParams,
  db = prisma,
) =>
  db.$transaction([
    db.workspace.update({
      where: { id: workspaceId },
      data: {
        isSuspended,
        suspendReason: isSuspended ? reason : null,
      },
    }),
    db.workspaceAuditLog.create({
      data: {
        workspaceId,
        action: isSuspended ? "SUSPEND" : "UNSUSPEND",
        reason: isSuspended ? reason : undefined,
        performedByUserId: performedBy.id,
        performedByEmail: performedBy.email ?? undefined,
      },
    }),
  ]);
