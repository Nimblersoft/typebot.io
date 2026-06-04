import { sendInvoiceIssuedEmail } from "@typebot.io/emails/transactional/InvoiceIssuedEmail";
import prisma from "@typebot.io/prisma";
import { generatePeriodInvoice } from "@typebot.io/subscriptions/generatePeriodInvoice";

export const generateDueInvoices = async () => {
  const now = new Date();

  const dueSubscriptions = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      currentPeriodEnd: { lte: now },
    },
    include: {
      workspace: {
        include: {
          members: {
            where: { role: "ADMIN" },
            include: { user: { select: { email: true, name: true } } },
            take: 1,
          },
        },
      },
    },
  });

  let generated = 0;
  for (const subscription of dueSubscriptions) {
    try {
      const invoice = await generatePeriodInvoice(subscription.id);
      generated++;

      const adminEmail = subscription.workspace.members[0]?.user.email;
      if (adminEmail) {
        await sendInvoiceIssuedEmail({
          to: adminEmail,
          workspaceName: subscription.workspace.name,
          amountUsd: Number(invoice.totalUsd),
          dueAt: invoice.dueAt!,
          invoiceId: invoice.id,
        }).catch((err: unknown) =>
          console.error(`Failed to send invoice email to ${adminEmail}:`, err),
        );
      }
    } catch (err) {
      console.error(
        `Failed to generate invoice for subscription ${subscription.id}:`,
        err,
      );
    }
  }

  console.log(
    `[nimblerbot-cron] generateDueInvoices: ${generated}/${dueSubscriptions.length} generated`,
  );
};
