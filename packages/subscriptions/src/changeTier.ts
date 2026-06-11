import prisma from "@typebot.io/prisma";
import type { ActivatablePlan } from "./activate";

// Changes the tier of an existing subscription and keeps workspace.plan in
// sync, in one transaction. No new invoice is generated and proration is out of
// scope: the base-price change takes effect on the next billing cycle.
export const changeTier = async (
  workspaceId: string,
  tier: ActivatablePlan,
  db: typeof prisma = prisma,
) => {
  await db.$transaction([
    db.subscription.update({
      where: { workspaceId },
      data: { tier },
    }),
    db.workspace.update({
      where: { id: workspaceId },
      data: { plan: tier },
    }),
  ]);
};
