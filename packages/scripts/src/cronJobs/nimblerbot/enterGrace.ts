import { sendGraceWarningEmail } from "@typebot.io/emails/transactional/GraceWarningEmail";
import prisma from "@typebot.io/prisma";

export const enterGrace = async () => {
  const now = new Date();

  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      status: { in: ["ISSUED", "OVERDUE"] },
      dueAt: { lt: now },
      workspace: { isPastDue: false },
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
    ...new Set(overdueInvoices.map((i) => i.workspaceId)),
  ];

  if (affectedWorkspaceIds.length === 0) {
    console.log("[nimblerbot-cron] enterGrace: no workspaces to process");
    return;
  }

  await prisma.$transaction([
    prisma.invoice.updateMany({
      where: {
        id: { in: overdueInvoices.map((i) => i.id) },
      },
      data: { status: "OVERDUE" },
    }),
    prisma.workspace.updateMany({
      where: { id: { in: affectedWorkspaceIds } },
      data: { isPastDue: true },
    }),
    prisma.subscription.updateMany({
      where: {
        workspaceId: { in: affectedWorkspaceIds },
        status: "ACTIVE",
      },
      data: { status: "IN_GRACE" },
    }),
  ]);

  for (const invoice of overdueInvoices) {
    const adminEmail = invoice.workspace.members[0]?.user.email;
    if (!adminEmail) continue;

    const graceDaysLeft = invoice.dueAt
      ? Math.max(
          0,
          Math.ceil(
            (invoice.dueAt.getTime() + 7 * 86400000 - now.getTime()) / 86400000,
          ),
        )
      : 7;

    await sendGraceWarningEmail({
      to: adminEmail,
      workspaceName: invoice.workspace.name,
      amountUsd: Number(invoice.totalUsd),
      graceDaysLeft,
      invoiceId: invoice.id,
    }).catch((err: unknown) =>
      console.error(`Failed to send grace email to ${adminEmail}:`, err),
    );
  }

  console.log(
    `[nimblerbot-cron] enterGrace: ${affectedWorkspaceIds.length} workspaces entered grace`,
  );
};
