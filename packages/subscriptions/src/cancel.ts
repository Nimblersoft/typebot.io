import prisma from "@typebot.io/prisma";

export const cancelSubscription = async (
  workspaceId: string,
  db: typeof prisma = prisma,
) => {
  await db.subscription.update({
    where: { workspaceId },
    data: { status: "CANCELED" },
  });
};
