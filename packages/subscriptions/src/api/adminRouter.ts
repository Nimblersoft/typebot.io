import prisma from "@typebot.io/prisma";
import { z } from "zod";
import { setWorkspaceSuspension } from "../setWorkspaceSuspension";
import { staffProcedure } from "./staffProcedure";

export const adminRouter = {
  admin: {
    listWorkspaces: staffProcedure
      .input(
        z.object({
          search: z.string().optional(),
          plan: z.enum(["FREE", "BUSINESS", "ENTERPRISE"]).optional(),
          status: z
            .enum(["ACTIVE", "IN_GRACE", "QUARANTINED", "CANCELED"])
            .optional(),
          cursor: z.string().optional(),
          take: z.number().int().min(1).max(100).default(50),
        }),
      )
      .handler(async ({ input }) => {
        const { search, plan, status, cursor, take } = input;

        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const workspaces = await prisma.workspace.findMany({
          where: {
            ...(search
              ? {
                  OR: [
                    { name: { contains: search, mode: "insensitive" } },
                    { id: { contains: search } },
                  ],
                }
              : {}),
            ...(plan ? { plan } : {}),
            ...(status ? { subscription: { status } } : {}),
          },
          include: {
            subscription: true,
            invoices: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: { payments: true },
            },
            members: {
              where: { role: "ADMIN" },
              include: { user: { select: { email: true, name: true } } },
              take: 1,
            },
            _count: { select: { typebots: { where: { isArchived: false } } } },
          },
          orderBy: { createdAt: "desc" },
          take: take + 1,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });

        const workspaceIds = workspaces.map((w) => w.id);

        const aiUsageByWorkspace = await prisma.lLMUsageLog.groupBy({
          by: ["workspaceId"],
          where: {
            workspaceId: { in: workspaceIds },
            createdAt: { gte: periodStart },
          },
          _sum: { costUsd: true },
        });

        const usageMap = new Map(
          aiUsageByWorkspace.map((u) => [
            u.workspaceId,
            Number(u._sum.costUsd ?? 0),
          ]),
        );

        const hasMore = workspaces.length > take;
        const items = hasMore ? workspaces.slice(0, take) : workspaces;

        return {
          items: items.map((w) => ({
            ...w,
            currentPeriodAiCostUsd: usageMap.get(w.id) ?? 0,
          })),
          nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
        };
      }),

    getWorkspace: staffProcedure
      .input(z.object({ workspaceId: z.string() }))
      .handler(async ({ input }) => {
        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const workspace = await prisma.workspace.findUniqueOrThrow({
          where: { id: input.workspaceId },
          include: {
            subscription: true,
            invoices: {
              orderBy: { createdAt: "desc" },
              take: 24,
              include: { lineItems: true, payments: true },
            },
            members: {
              include: {
                user: {
                  select: { id: true, email: true, name: true, image: true },
                },
              },
            },
            _count: { select: { typebots: { where: { isArchived: false } } } },
          },
        });

        const aiUsage = await prisma.lLMUsageLog.aggregate({
          where: {
            workspaceId: input.workspaceId,
            createdAt: { gte: periodStart },
          },
          _sum: { costUsd: true, inputTokens: true, outputTokens: true },
        });

        return {
          ...workspace,
          currentPeriodAiCostUsd: Number(aiUsage._sum.costUsd ?? 0),
          currentPeriodInputTokens: aiUsage._sum.inputTokens ?? 0,
          currentPeriodOutputTokens: aiUsage._sum.outputTokens ?? 0,
        };
      }),

    suspendWorkspace: staffProcedure
      .input(z.object({ workspaceId: z.string(), reason: z.string().min(1) }))
      .handler(async ({ input, context }) => {
        await setWorkspaceSuspension({
          workspaceId: input.workspaceId,
          isSuspended: true,
          reason: input.reason,
          performedBy: context.user,
        });
        return { success: true };
      }),

    unsuspendWorkspace: staffProcedure
      .input(z.object({ workspaceId: z.string() }))
      .handler(async ({ input, context }) => {
        await setWorkspaceSuspension({
          workspaceId: input.workspaceId,
          isSuspended: false,
          performedBy: context.user,
        });
        return { success: true };
      }),

    clearQuarantine: staffProcedure
      .input(z.object({ workspaceId: z.string() }))
      .handler(async ({ input }) => {
        await prisma.$transaction(async (tx) => {
          await tx.workspace.update({
            where: { id: input.workspaceId },
            data: { isQuarantined: false, isPastDue: false },
          });
          await tx.subscription.updateMany({
            where: {
              workspaceId: input.workspaceId,
              status: { in: ["IN_GRACE", "QUARANTINED"] },
            },
            data: { status: "ACTIVE" },
          });
        });
        return { success: true };
      }),

    updateSubscription: staffProcedure
      .input(
        z.object({
          workspaceId: z.string(),
          includedAiCreditUsd: z.number().nonnegative().optional(),
          overageMarkupPct: z.number().nonnegative().optional(),
          aiHardCeilingUsd: z.number().positive().nullable().optional(),
        }),
      )
      .handler(async ({ input }) => {
        const { workspaceId, ...updates } = input;
        const data: Record<string, unknown> = {};
        if (updates.includedAiCreditUsd !== undefined)
          data.includedAiCreditUsd = updates.includedAiCreditUsd;
        if (updates.overageMarkupPct !== undefined)
          data.overageMarkupPct = updates.overageMarkupPct;
        if (updates.aiHardCeilingUsd !== undefined)
          data.aiHardCeilingUsd = updates.aiHardCeilingUsd;

        await prisma.subscription.update({
          where: { workspaceId },
          data,
        });
        return { success: true };
      }),

    usageByWorkspace: staffProcedure
      .input(
        z.object({
          workspaceId: z.string(),
          periodStart: z.string().datetime().optional(),
          periodEnd: z.string().datetime().optional(),
        }),
      )
      .handler(async ({ input }) => {
        const now = new Date();
        const periodStart = input.periodStart
          ? new Date(input.periodStart)
          : new Date(now.getFullYear(), now.getMonth(), 1);
        const periodEnd = input.periodEnd ? new Date(input.periodEnd) : now;

        const byModel = await prisma.lLMUsageLog.groupBy({
          by: ["model", "provider"],
          where: {
            workspaceId: input.workspaceId,
            createdAt: { gte: periodStart, lte: periodEnd },
          },
          _sum: {
            costUsd: true,
            inputTokens: true,
            outputTokens: true,
            totalTokens: true,
          },
          _count: { id: true },
          orderBy: { _sum: { costUsd: "desc" } },
        });

        const total = byModel.reduce(
          (acc, row) => acc + Number(row._sum.costUsd ?? 0),
          0,
        );

        return {
          periodStart,
          periodEnd,
          totalCostUsd: total,
          byModel: byModel.map((row) => ({
            model: row.model,
            provider: row.provider,
            costUsd: Number(row._sum.costUsd ?? 0),
            inputTokens: row._sum.inputTokens ?? 0,
            outputTokens: row._sum.outputTokens ?? 0,
            totalTokens: row._sum.totalTokens ?? 0,
            callCount: row._count.id,
          })),
        };
      }),
  },
};
