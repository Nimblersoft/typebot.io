import prisma from "@typebot.io/prisma";
import type { Plan } from "@typebot.io/prisma/enum";
import { tierConfig } from "./tiers";

export type ActivatablePlan = Extract<Plan, "BUSINESS" | "ENTERPRISE">;

type ActivateOptions = {
  includedAiCreditUsd?: number;
  overageMarkupPct?: number;
  aiHardCeilingUsd?: number;
};

export const activateSubscription = async (
  workspaceId: string,
  tier: ActivatablePlan,
  options: ActivateOptions = {},
) => {
  const config = tierConfig[tier];
  const now = new Date();
  const periodEnd = addMonths(now, 1);
  const dueAt = addDays(now, 7);
  const baseAmount = config.priceUsd ?? 0;
  const periodLabel = formatPeriod(now, periodEnd);

  return prisma.$transaction(async (tx) => {
    const subscription = await tx.subscription.create({
      data: {
        workspaceId,
        tier,
        status: "ACTIVE",
        billingAnchorDay: now.getDate(),
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        includedAiCreditUsd: options.includedAiCreditUsd ?? 0,
        overageMarkupPct: options.overageMarkupPct ?? 0,
        aiHardCeilingUsd: options.aiHardCeilingUsd ?? null,
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

const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
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
