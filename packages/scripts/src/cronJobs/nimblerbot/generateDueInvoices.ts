import { sendInvoiceIssuedEmail } from "@typebot.io/emails/transactional/InvoiceIssuedEmail";
import prisma from "@typebot.io/prisma";
import { generatePeriodInvoice } from "@typebot.io/subscriptions/generatePeriodInvoice";

export const generateDueInvoices = async (db: typeof prisma = prisma) => {
  const now = new Date();

  // Only ACTIVE subscriptions are invoiced here; IN_GRACE/QUARANTINED subs are
  // frozen until payment clears them back to ACTIVE.
  const dueSubscriptions = await db.subscription.findMany({
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
      const invoice = await generatePeriodInvoice(subscription.id, db);
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
