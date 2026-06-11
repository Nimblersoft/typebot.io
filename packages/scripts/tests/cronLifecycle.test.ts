import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { createPrismaAdapter } from "@typebot.io/prisma/createPrismaAdapter";
import { activateSubscription } from "@typebot.io/subscriptions/activate";
import { beforeAll, describe, expect, inject, it } from "vitest";
import { enterGrace } from "../src/cronJobs/nimblerbot/enterGrace";
import { enterQuarantine } from "../src/cronJobs/nimblerbot/enterQuarantine";
import { generateDueInvoices } from "../src/cronJobs/nimblerbot/generateDueInvoices";

let db: PrismaClient;
beforeAll(() => {
  db = new PrismaClient({
    adapter: createPrismaAdapter(inject("pgContainerDatabaseUri")),
  });
});

const activateWorkspace = async () => {
  const workspace = await db.workspace.create({
    data: { name: `ws-${randomUUID()}`, plan: "FREE" },
  });
  const { invoice } = await activateSubscription(
    workspace.id,
    "BUSINESS",
    {},
    db,
  );
  return { workspaceId: workspace.id, invoiceId: invoice.id };
};

const daysAgo = (days: number) => new Date(Date.now() - days * 86400000);

describe("enterGrace", () => {
  it("flips a past-due workspace into grace and marks the invoice OVERDUE", async () => {
    const { workspaceId, invoiceId } = await activateWorkspace();
    await db.invoice.update({
      where: { id: invoiceId },
      data: { status: "ISSUED", dueAt: daysAgo(1) },
    });

    await enterGrace(db);

    const invoice = await db.invoice.findUniqueOrThrow({
      where: { id: invoiceId },
    });
    const workspace = await db.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
    });
    const sub = await db.subscription.findUniqueOrThrow({
      where: { workspaceId },
    });
    expect(invoice.status).toBe("OVERDUE");
    expect(workspace.isPastDue).toBe(true);
    expect(workspace.isQuarantined).toBe(false); // bots still allowed in grace
    expect(sub.status).toBe("IN_GRACE");
  });
});

describe("enterQuarantine", () => {
  it("quarantines a workspace whose grace window has fully elapsed", async () => {
    const { workspaceId, invoiceId } = await activateWorkspace();
    await db.invoice.update({
      where: { id: invoiceId },
      data: { status: "OVERDUE", dueAt: daysAgo(8) },
    });
    await db.workspace.update({
      where: { id: workspaceId },
      data: { isPastDue: true },
    });
    await db.subscription.update({
      where: { workspaceId },
      data: { status: "IN_GRACE" },
    });

    await enterQuarantine(db);

    const workspace = await db.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
    });
    const sub = await db.subscription.findUniqueOrThrow({
      where: { workspaceId },
    });
    expect(workspace.isQuarantined).toBe(true);
    expect(sub.status).toBe("QUARANTINED");
  });
});

describe("generateDueInvoices", () => {
  it("invoices only ACTIVE subscriptions whose period has ended", async () => {
    const active = await activateWorkspace();
    const inGrace = await activateWorkspace();

    await db.subscription.update({
      where: { workspaceId: active.workspaceId },
      data: { currentPeriodEnd: daysAgo(1) },
    });
    await db.subscription.update({
      where: { workspaceId: inGrace.workspaceId },
      data: { status: "IN_GRACE", currentPeriodEnd: daysAgo(1) },
    });

    await generateDueInvoices(db);

    const activeInvoices = await db.invoice.count({
      where: { workspaceId: active.workspaceId },
    });
    const inGraceInvoices = await db.invoice.count({
      where: { workspaceId: inGrace.workspaceId },
    });
    // ACTIVE got a 2nd (period) invoice; IN_GRACE stayed at its activation one.
    expect(activeInvoices).toBe(2);
    expect(inGraceInvoices).toBe(1);
  });
});
