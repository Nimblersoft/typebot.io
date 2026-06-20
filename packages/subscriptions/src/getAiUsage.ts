import prisma from "@typebot.io/prisma";
import { computeOverageUsd } from "./computeOverageUsd";

export type AiUsageSummary = {
  rawCostUsd: number;
  includedAiCreditUsd: number;
  overageMarkupPct: number;
  overageUsd: number;
  aiHardCeilingUsd: number | null;
  periodStart: Date;
  periodEnd: Date;
};

// Current-period AI usage for a workspace, for the customer billing UI.
// Aggregates LLMUsageLog cost from the subscription's period start up to now
// and derives the accruing overage with the locked formula. Deliberately
// returns no model/provider names — usage is customer-facing and generic.
// Returns null when the workspace has no subscription.
export const getAiUsage = async (
  workspaceId: string,
  db = prisma,
): Promise<AiUsageSummary | null> => {
  const subscription = await db.subscription.findUnique({
    where: { workspaceId },
  });
  if (!subscription) return null;

  const usageAggregate = await db.lLMUsageLog.aggregate({
    where: {
      workspaceId,
      createdAt: { gte: subscription.currentPeriodStart },
    },
    _sum: { costUsd: true },
  });

  const rawCostUsd = Number(usageAggregate._sum.costUsd ?? 0);
  const includedAiCreditUsd = Number(subscription.includedAiCreditUsd);
  const overageMarkupPct = Number(subscription.overageMarkupPct);
  const aiHardCeilingUsd =
    subscription.aiHardCeilingUsd === null
      ? null
      : Number(subscription.aiHardCeilingUsd);

  return {
    rawCostUsd,
    includedAiCreditUsd,
    overageMarkupPct,
    overageUsd: computeOverageUsd({
      rawCostUsd,
      includedAiCreditUsd,
      overageMarkupPct,
    }),
    aiHardCeilingUsd,
    periodStart: subscription.currentPeriodStart,
    periodEnd: subscription.currentPeriodEnd,
  };
};
