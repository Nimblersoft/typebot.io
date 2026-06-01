import { ORPCError } from "@orpc/server";
import prisma from "@typebot.io/prisma";
import type { User } from "@typebot.io/user/schemas";
import { z } from "zod";
import { getUserModeInWorkspace } from "@/features/workspace/helpers/getUserRoleInWorkspace";

export const countWorkspaceTypebotsInputSchema = z.object({
  workspaceId: z.string(),
});

export const handleCountWorkspaceTypebots = async ({
  input: { workspaceId },
  context: { user },
}: {
  input: z.infer<typeof countWorkspaceTypebotsInputSchema>;
  context: { user: Pick<User, "id"> };
}) => {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { members: { select: { userId: true, role: true } } },
  });
  const userRole = getUserModeInWorkspace(user.id, workspace?.members);
  if (!workspace || userRole === undefined)
    throw new ORPCError("NOT_FOUND", { message: "Workspace not found" });

  const count = await prisma.typebot.count({
    where: { workspaceId, isArchived: { not: true } },
  });

  return { count };
};
