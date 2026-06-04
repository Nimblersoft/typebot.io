import prisma from "@typebot.io/prisma";

export const cancelSubscription = async (workspaceId: string) => {
  await prisma.subscription.update({
    where: { workspaceId },
    data: { status: "CANCELED" },
  });
};
