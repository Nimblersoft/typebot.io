import prisma from "@typebot.io/prisma";
import { formatPeriod } from "./activate";
import { tierConfig } from "./tiers";

export const generatePeriodInvoice = async (subscriptionId: string) => {
  const subscription = await prisma.subscription.findUniqueOrThrow({
    where: { id: subscriptionId },
  });

  const periodStart = new Date(subscription.currentPeriodEnd);
  const periodEnd = addMonths(periodStart, 1);
  const dueAt = addDays(periodStart, 7);
  const config = tierConfig[subscription.tier];
  const baseAmount = config.priceUsd ?? 0;
  const periodLabel = formatPeriod(periodStart, periodEnd);

  // 4.3: Sum LLM usage cost for the closing period to compute AI overage
  const usageAggregate = await prisma.lLMUsageLog.aggregate({
    where: {
      workspaceId: subscription.workspaceId,
      createdAt: { gte: subscription.currentPeriodStart, lt: periodStart },
    },
    _sum: { costUsd: true },
  });
  const rawCostUsd = Number(usageAggregate._sum.costUsd ?? 0);
  // Apply the overage markup and subtract the included AI credit allowance
  const markedUpCostUsd =
    rawCostUsd * (1 + Number(subscription.overageMarkupPct) / 100);
  const overageAmountUsd = Math.max(
    0,
    markedUpCostUsd - Number(subscription.includedAiCreditUsd),
  );
  const totalUsd = baseAmount + overageAmountUsd;

  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.create({
      data: {
        workspaceId: subscription.workspaceId,
        subscriptionId,
        periodStart,
        periodEnd,
        status: "ISSUED",
        baseAmountUsd: baseAmount,
        overageAmountUsd,
        totalUsd,
        dueAt,
        issuedAt: periodStart,
        lineItems: {
          create: [
            {
              kind: "SUBSCRIPTION",
              description: `${subscription.tier} plan — ${periodLabel}`,
              amountUsd: baseAmount,
            },
            ...(overageAmountUsd > 0
              ? [
                  {
                    kind: "AI_OVERAGE" as const,
                    description: `AI usage overage — ${periodLabel}`,
                    amountUsd: overageAmountUsd,
                  },
                ]
              : []),
          ],
        },
      },
    });

    await tx.subscription.update({
      where: { id: subscriptionId },
      data: {
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
    });

    return invoice;
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
