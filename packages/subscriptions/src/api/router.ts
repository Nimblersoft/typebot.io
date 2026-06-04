import { authenticatedProcedure } from "@typebot.io/config/orpc/builder/middlewares";
import prisma from "@typebot.io/prisma";
import { z } from "zod";
import { activateSubscription } from "../activate";
import { cancelSubscription } from "../cancel";
import { staffProcedure } from "./staffProcedure";

const activatablePlanSchema = z.enum(["BUSINESS", "ENTERPRISE"]);

export const subscriptionRouter = {
  subscription: {
    activate: staffProcedure
      .input(
        z.object({
          workspaceId: z.string(),
          plan: activatablePlanSchema,
          includedAiCreditUsd: z.number().nonnegative().optional(),
          overageMarkupPct: z.number().nonnegative().optional(),
          aiHardCeilingUsd: z.number().positive().optional(),
        }),
      )
      .handler(async ({ input }) => {
        const { workspaceId, plan, ...options } = input;
        return activateSubscription(workspaceId, plan, options);
      }),

    cancel: staffProcedure
      .input(z.object({ workspaceId: z.string() }))
      .handler(async ({ input }) => {
        await cancelSubscription(input.workspaceId);
        return { success: true };
      }),

    getByWorkspace: authenticatedProcedure
      .input(z.object({ workspaceId: z.string() }))
      .handler(async ({ input }) => {
        return prisma.subscription.findUnique({
          where: { workspaceId: input.workspaceId },
          include: { invoices: { orderBy: { createdAt: "desc" }, take: 12 } },
        });
      }),
  },

  invoice: {
    list: authenticatedProcedure
      .input(
        z.object({
          workspaceId: z.string(),
          take: z.number().int().min(1).max(50).default(12),
          cursor: z.string().optional(),
        }),
      )
      .handler(async ({ input }) => {
        const { workspaceId, take, cursor } = input;
        const items = await prisma.invoice.findMany({
          where: { workspaceId },
          orderBy: { createdAt: "desc" },
          take: take + 1,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          include: { lineItems: true, payments: true },
        });
        const hasMore = items.length > take;
        return {
          items: hasMore ? items.slice(0, take) : items,
          nextCursor: hasMore ? items[take - 1]?.id : undefined,
        };
      }),

    confirmPayment: staffProcedure
      .input(
        z.object({
          invoiceId: z.string(),
          method: z.enum(["BANK_TRANSFER", "DEUNA"]),
          providerRef: z.string().optional(),
          amountUsd: z.number().positive(),
        }),
      )
      .handler(async ({ input, context }) => {
        const now = new Date();
        const invoice = await prisma.invoice.findUniqueOrThrow({
          where: { id: input.invoiceId },
        });

        await prisma.$transaction(async (tx) => {
          await tx.payment.create({
            data: {
              invoiceId: input.invoiceId,
              workspaceId: invoice.workspaceId,
              method: input.method,
              provider: input.method === "BANK_TRANSFER" ? "manual" : "deuna",
              providerRef: input.providerRef ?? null,
              amountUsd: input.amountUsd,
              status: "CONFIRMED",
              confirmedByUserId: context.user.id,
              confirmedAt: now,
            },
          });

          await tx.invoice.update({
            where: { id: input.invoiceId },
            data: { status: "PAID", paidAt: now },
          });

          await tx.workspace.update({
            where: { id: invoice.workspaceId },
            data: { isPastDue: false, isQuarantined: false },
          });

          await tx.subscription.updateMany({
            where: {
              workspaceId: invoice.workspaceId,
              status: { in: ["IN_GRACE", "QUARANTINED"] },
            },
            data: { status: "ACTIVE" },
          });
        });

        return { success: true };
      }),

    void: staffProcedure
      .input(z.object({ invoiceId: z.string() }))
      .handler(async ({ input }) => {
        await prisma.invoice.update({
          where: { id: input.invoiceId },
          data: { status: "VOID" },
        });
        return { success: true };
      }),
  },
};
