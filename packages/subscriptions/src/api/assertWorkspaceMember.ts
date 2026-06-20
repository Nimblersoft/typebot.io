import { ORPCError } from "@orpc/server";
import prisma from "@typebot.io/prisma";
import { isStaff } from "../staff";

// Guards a customer-accessible billing route: the caller must be a member of
// the workspace, unless they are staff (ADMIN_EMAIL allowlist). Staff need the
// bypass because the admin console reads the same routes for any workspace.
export const assertWorkspaceMember = async (
  user: { id: string; email?: string | null },
  workspaceId: string,
  db = prisma,
): Promise<void> => {
  if (isStaff(user)) return;
  const member = await db.memberInWorkspace.findFirst({
    where: { workspaceId, userId: user.id },
    select: { userId: true },
  });
  if (!member)
    throw new ORPCError("NOT_FOUND", { message: "Workspace not found" });
};
