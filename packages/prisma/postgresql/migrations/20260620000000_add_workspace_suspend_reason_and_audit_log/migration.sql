-- Persist the staff-entered suspension reason on the workspace.
ALTER TABLE "Workspace" ADD COLUMN "suspendReason" TEXT;

-- Append-only audit log of staff lifecycle actions on a workspace.
CREATE TABLE "WorkspaceAuditLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workspaceId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "performedByUserId" TEXT,
    "performedByEmail" TEXT,

    CONSTRAINT "WorkspaceAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorkspaceAuditLog_workspaceId_createdAt_idx" ON "WorkspaceAuditLog"("workspaceId", "createdAt");

ALTER TABLE "WorkspaceAuditLog" ADD CONSTRAINT "WorkspaceAuditLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
