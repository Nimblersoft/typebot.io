import { ORPCError } from "@orpc/server";
import prisma from "@typebot.io/prisma";
import type { ActivatablePlan } from "./activate";

// Changes the tier of an existing, live subscription and keeps workspace.plan
// in sync, in one transaction. No new invoice is generated and proration is out
// of scope: the base-price change takes effect on the next billing cycle. A
// CANCELED (or absent) subscription must be re-activated, not tier-changed —
// this mirrors the admin UI, which routes those to the activation form.
export const changeTier = async (
  workspaceId: string,
  tier: ActivatablePlan,
  db: typeof prisma = prisma,
) => {
  await db.$transaction(async (tx) => {
    const subscription = await tx.subscription.findUnique({
      where: { workspaceId },
      select: { status: true },
    });
    if (!subscription || subscription.status === "CANCELED")
      throw new ORPCError("BAD_REQUEST", {
        message:
          "Cannot change tier of a canceled subscription; reactivate it.",
      });
    await tx.subscription.update({
      where: { workspaceId },
      data: { tier },
    });
    await tx.workspace.update({
      where: { id: workspaceId },
      data: { plan: tier },
    });
  });
};
