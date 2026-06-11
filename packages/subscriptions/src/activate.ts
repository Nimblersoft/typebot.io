import prisma from "@typebot.io/prisma";
import type { Plan } from "@typebot.io/prisma/enum";
import { computeNextPeriod } from "./computeNextPeriod";
import { tierConfig } from "./tiers";

export type ActivatablePlan = Extract<Plan, "BUSINESS" | "ENTERPRISE">;

type ActivateOptions = {
  includedAiCreditUsd?: number;
  overageMarkupPct?: number;
  aiHardCeilingUsd?: number | null;
};

export const activateSubscription = async (
  workspaceId: string,
  tier: ActivatablePlan,
  options: ActivateOptions = {},
  db: typeof prisma = prisma,
) => {
  const config = tierConfig[tier];
  const now = new Date();
  const anchorDay = now.getDate();
  // Anchor the first period to the activation day too, so a 31st activation
  // doesn't overflow into the month after next.
  const { periodEnd, dueAt } = computeNextPeriod(anchorDay, now);
  const baseAmount = config.priceUsd ?? 0;
  const periodLabel = formatPeriod(now, periodEnd);

  const includedAiCreditUsd =
    options.includedAiCreditUsd ?? config.includedAiCreditUsd;
  const overageMarkupPct = options.overageMarkupPct ?? config.overageMarkupPct;
  const aiHardCeilingUsd =
    options.aiHardCeilingUsd === undefined
      ? config.defaultAiHardCeilingUsd
      : options.aiHardCeilingUsd;

  return db.$transaction(async (tx) => {
    // Upsert so re-activating a CANCELED workspace revives the existing row
    // instead of hitting the @unique(workspaceId) constraint (P2002).
    const subscription = await tx.subscription.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        tier,
        status: "ACTIVE",
        billingAnchorDay: anchorDay,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        includedAiCreditUsd,
        overageMarkupPct,
        aiHardCeilingUsd,
      },
      update: {
        tier,
        status: "ACTIVE",
        billingAnchorDay: anchorDay,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        includedAiCreditUsd,
        overageMarkupPct,
        aiHardCeilingUsd,
      },
    });

    const invoice = await tx.invoice.create({
      data: {
        workspaceId,
        subscriptionId: subscription.id,
        periodStart: now,
        periodEnd,
        status: "ISSUED",
        baseAmountUsd: baseAmount,
        overageAmountUsd: 0,
        totalUsd: baseAmount,
        dueAt,
        issuedAt: now,
        lineItems: {
          create: {
            kind: "SUBSCRIPTION",
            description: `${tier} plan — ${periodLabel}`,
            amountUsd: baseAmount,
          },
        },
      },
    });

    await tx.workspace.update({
      where: { id: workspaceId },
      data: { plan: tier },
    });

    return { subscription, invoice };
  });
};

export const formatPeriod = (start: Date, end: Date): string => {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  return `${fmt(start)} – ${fmt(end)}`;
};
