import { authenticatedProcedure } from "@typebot.io/config/orpc/builder/middlewares";
import prisma from "@typebot.io/prisma";
import { z } from "zod";
import { activateSubscription } from "../activate";
import { cancelSubscription } from "../cancel";
import { changeTier } from "../changeTier";
import { confirmInvoicePayment } from "../confirmInvoicePayment";
import { getAiUsage } from "../getAiUsage";
import { assertWorkspaceMember } from "./assertWorkspaceMember";
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

    changeTier: staffProcedure
      .input(
        z.object({
          workspaceId: z.string(),
          tier: activatablePlanSchema,
        }),
      )
      .handler(async ({ input }) => {
        await changeTier(input.workspaceId, input.tier);
        return { success: true };
      }),

    getByWorkspace: authenticatedProcedure
      .input(z.object({ workspaceId: z.string() }))
      .handler(async ({ input, context }) => {
        await assertWorkspaceMember(context.user, input.workspaceId);
        return prisma.subscription.findUnique({
          where: { workspaceId: input.workspaceId },
          include: { invoices: { orderBy: { createdAt: "desc" }, take: 12 } },
        });
      }),

    getAiUsage: authenticatedProcedure
      .input(z.object({ workspaceId: z.string() }))
      .handler(async ({ input, context }) => {
        await assertWorkspaceMember(context.user, input.workspaceId);
        return getAiUsage(input.workspaceId);
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
      .handler(async ({ input, context }) => {
        const { workspaceId, take, cursor } = input;
        await assertWorkspaceMember(context.user, workspaceId);
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
          allowPartial: z.boolean().optional(),
        }),
      )
      .handler(async ({ input, context }) =>
        confirmInvoicePayment({
          invoiceId: input.invoiceId,
          method: input.method,
          providerRef: input.providerRef,
          amountUsd: input.amountUsd,
          allowPartial: input.allowPartial,
          confirmedByUserId: context.user.id,
        }),
      ),

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
