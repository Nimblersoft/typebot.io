import { ORPCError } from "@orpc/server";
import prisma from "@typebot.io/prisma";

type ConfirmPaymentParams = {
  invoiceId: string;
  method: "BANK_TRANSFER" | "DEUNA";
  providerRef?: string | null;
  amountUsd: number;
  confirmedByUserId: string;
  // Default behavior rejects amounts that don't equal the invoice total. Set
  // this to record an under/over payment anyway (e.g. negotiated settlement).
  allowPartial?: boolean;
};

export const confirmInvoicePayment = async (
  params: ConfirmPaymentParams,
  db: typeof prisma = prisma,
) => {
  const now = new Date();
  const invoice = await db.invoice.findUniqueOrThrow({
    where: { id: params.invoiceId },
  });

  if (invoice.status === "PAID" || invoice.status === "VOID")
    throw new ORPCError("BAD_REQUEST", {
      message: `Invoice is already ${invoice.status}`,
    });

  if (!params.allowPartial && params.amountUsd !== Number(invoice.totalUsd))
    throw new ORPCError("BAD_REQUEST", {
      message: `Payment amount ${params.amountUsd} does not match invoice total ${Number(invoice.totalUsd)}`,
    });

  await db.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        invoiceId: params.invoiceId,
        workspaceId: invoice.workspaceId,
        method: params.method,
        provider: params.method === "BANK_TRANSFER" ? "manual" : "deuna",
        providerRef: params.providerRef ?? null,
        amountUsd: params.amountUsd,
        status: "CONFIRMED",
        confirmedByUserId: params.confirmedByUserId,
        confirmedAt: now,
      },
    });

    await tx.invoice.update({
      where: { id: params.invoiceId },
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
};
