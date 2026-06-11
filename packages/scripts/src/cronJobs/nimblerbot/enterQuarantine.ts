import { sendQuarantineNoticeEmail } from "@typebot.io/emails/transactional/QuarantineNoticeEmail";
import prisma from "@typebot.io/prisma";

const GRACE_DAYS = 7;

export const enterQuarantine = async (db: typeof prisma = prisma) => {
  const now = new Date();
  const graceCutoff = new Date(now.getTime() - GRACE_DAYS * 86400000);

  const expiredInvoices = await db.invoice.findMany({
    where: {
      status: "OVERDUE",
      dueAt: { lt: graceCutoff },
      workspace: { isQuarantined: false, isPastDue: true },
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

  const affectedWorkspaceIds = [
    ...new Set(expiredInvoices.map((i) => i.workspaceId)),
  ];

  if (affectedWorkspaceIds.length === 0) {
    console.log("[nimblerbot-cron] enterQuarantine: no workspaces to process");
    return;
  }

  await db.$transaction([
    db.workspace.updateMany({
      where: { id: { in: affectedWorkspaceIds } },
      data: { isQuarantined: true },
    }),
    db.subscription.updateMany({
      where: {
        workspaceId: { in: affectedWorkspaceIds },
        status: "IN_GRACE",
      },
      data: { status: "QUARANTINED" },
    }),
  ]);

  for (const invoice of expiredInvoices) {
    const adminEmail = invoice.workspace.members[0]?.user.email;
    if (!adminEmail) continue;

    await sendQuarantineNoticeEmail({
      to: adminEmail,
      workspaceName: invoice.workspace.name,
      amountUsd: Number(invoice.totalUsd),
      invoiceId: invoice.id,
    }).catch((err: unknown) =>
      console.error(`Failed to send quarantine email to ${adminEmail}:`, err),
    );
  }

  console.log(
    `[nimblerbot-cron] enterQuarantine: ${affectedWorkspaceIds.length} workspaces quarantined`,
  );
};
