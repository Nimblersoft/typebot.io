import prisma from "@typebot.io/prisma";
import { formatPeriod } from "./activate";
import { computeNextPeriod } from "./computeNextPeriod";
import { computeOverageUsd } from "./computeOverageUsd";
import { tierConfig } from "./tiers";

export const generatePeriodInvoice = async (
  subscriptionId: string,
  db: typeof prisma = prisma,
) => {
  // Only ACTIVE subscriptions accrue new periods (see generateDueInvoices'
  // status filter). IN_GRACE/QUARANTINED subs are frozen until payment clears
  // them back to ACTIVE, so they never stack up unbilled periods here.
  const subscription = await db.subscription.findUniqueOrThrow({
    where: { id: subscriptionId },
  });

  const { periodStart, periodEnd, dueAt } = computeNextPeriod(
    subscription.billingAnchorDay,
    subscription.currentPeriodEnd,
  );
  const config = tierConfig[subscription.tier];
  const baseAmount = config.priceUsd ?? 0;
  const periodLabel = formatPeriod(periodStart, periodEnd);

  return db.$transaction(async (tx) => {
    // Idempotency: a concurrent/retried cron run must not double-generate the
    // same period. periodStart is deterministic (= currentPeriodEnd), so an
    // existing invoice for it means this period was already billed. Advancing
    // currentPeriodEnd below also guarantees a single catch-up invoice per
    // overdue period rather than one per cron day.
    const existing = await tx.invoice.findFirst({
      where: { subscriptionId, periodStart },
    });
    if (existing) return existing;

    // 4.3: Sum LLM usage cost for the closing period (read inside the tx with
    // the same period bounds so the figure can't drift between runs).
    const usageAggregate = await tx.lLMUsageLog.aggregate({
      where: {
        workspaceId: subscription.workspaceId,
        createdAt: { gte: subscription.currentPeriodStart, lt: periodStart },
      },
      _sum: { costUsd: true },
    });
    const rawCostUsd = Number(usageAggregate._sum.costUsd ?? 0);
    const overageAmountUsd = computeOverageUsd({
      rawCostUsd,
      includedAiCreditUsd: Number(subscription.includedAiCreditUsd),
      overageMarkupPct: Number(subscription.overageMarkupPct),
    });
    const totalUsd = baseAmount + overageAmountUsd;

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
