import { beforeAll, describe, expect, it } from "vitest";
import { activateSubscription } from "../src/activate";
import { cancelSubscription } from "../src/cancel";
import { changeTier } from "../src/changeTier";
import { confirmInvoicePayment } from "../src/confirmInvoicePayment";
import { generatePeriodInvoice } from "../src/generatePeriodInvoice";
import { createTestWorkspace, testDb } from "./helpers";

let db: ReturnType<typeof testDb>;
beforeAll(() => {
  db = testDb();
});

describe("activateSubscription", () => {
  it("creates a subscription, a first ISSUED invoice, and sets workspace.plan", async () => {
    const workspace = await createTestWorkspace("FREE");
    const { subscription, invoice } = await activateSubscription(
      workspace.id,
      "BUSINESS",
      {},
      db,
    );

    expect(subscription.status).toBe("ACTIVE");
    expect(subscription.tier).toBe("BUSINESS");
    expect(Number(subscription.includedAiCreditUsd)).toBe(20);
    expect(Number(subscription.overageMarkupPct)).toBe(20);

    expect(invoice.status).toBe("ISSUED");
    expect(Number(invoice.totalUsd)).toBe(150);
    const sevenDaysMs = 7 * 86400000;
    expect(invoice.dueAt!.getTime() - invoice.issuedAt!.getTime()).toBeCloseTo(
      sevenDaysMs,
      -5,
    );

    const lineItems = await db.invoiceLineItem.findMany({
      where: { invoiceId: invoice.id },
    });
    expect(lineItems).toHaveLength(1);
    expect(lineItems[0]!.kind).toBe("SUBSCRIPTION");

    const refreshed = await db.workspace.findUniqueOrThrow({
      where: { id: workspace.id },
    });
    expect(refreshed.plan).toBe("BUSINESS");
  });

  it("revives a CANCELED subscription on re-activation without hitting P2002", async () => {
    const workspace = await createTestWorkspace("FREE");
    const first = await activateSubscription(workspace.id, "BUSINESS", {}, db);
    await cancelSubscription(workspace.id, db);

    const second = await activateSubscription(
      workspace.id,
      "ENTERPRISE",
      {},
      db,
    );

    expect(second.subscription.id).toBe(first.subscription.id);
    expect(second.subscription.status).toBe("ACTIVE");
    expect(second.subscription.tier).toBe("ENTERPRISE");

    const count = await db.subscription.count({
      where: { workspaceId: workspace.id },
    });
    expect(count).toBe(1);
  });
});

describe("cancelSubscription", () => {
  it("flips status to CANCELED", async () => {
    const workspace = await createTestWorkspace("FREE");
    await activateSubscription(workspace.id, "BUSINESS", {}, db);
    await cancelSubscription(workspace.id, db);

    const sub = await db.subscription.findUniqueOrThrow({
      where: { workspaceId: workspace.id },
    });
    expect(sub.status).toBe("CANCELED");
  });
});

describe("changeTier", () => {
  it("updates subscription.tier and workspace.plan together", async () => {
    const workspace = await createTestWorkspace("FREE");
    await activateSubscription(workspace.id, "BUSINESS", {}, db);

    await changeTier(workspace.id, "ENTERPRISE", db);

    const sub = await db.subscription.findUniqueOrThrow({
      where: { workspaceId: workspace.id },
    });
    const refreshed = await db.workspace.findUniqueOrThrow({
      where: { id: workspace.id },
    });
    expect(sub.tier).toBe("ENTERPRISE");
    expect(refreshed.plan).toBe("ENTERPRISE");
  });

  it("rejects a tier change on a canceled subscription", async () => {
    const workspace = await createTestWorkspace("FREE");
    await activateSubscription(workspace.id, "BUSINESS", {}, db);
    await cancelSubscription(workspace.id, db);

    await expect(changeTier(workspace.id, "ENTERPRISE", db)).rejects.toThrow();

    const sub = await db.subscription.findUniqueOrThrow({
      where: { workspaceId: workspace.id },
    });
    expect(sub.tier).toBe("BUSINESS");
  });
});

describe("generatePeriodInvoice", () => {
  const pinPeriod = async (workspaceId: string) => {
    // Deterministic anchor-15 period: Feb 15 → Mar 15.
    await db.subscription.update({
      where: { workspaceId },
      data: {
        billingAnchorDay: 15,
        currentPeriodStart: new Date(2026, 1, 15),
        currentPeriodEnd: new Date(2026, 2, 15),
      },
    });
  };

  it("creates a base-only invoice and advances the anchored period", async () => {
    const workspace = await createTestWorkspace("FREE");
    const { subscription } = await activateSubscription(
      workspace.id,
      "BUSINESS",
      {},
      db,
    );
    await pinPeriod(workspace.id);

    const invoice = await generatePeriodInvoice(subscription.id, db);

    expect(Number(invoice.totalUsd)).toBe(150);
    expect(Number(invoice.overageAmountUsd)).toBe(0);
    expect(invoice.periodStart.getTime()).toBe(new Date(2026, 2, 15).getTime());
    expect(invoice.periodEnd.getTime()).toBe(new Date(2026, 3, 15).getTime());

    const sub = await db.subscription.findUniqueOrThrow({
      where: { id: subscription.id },
    });
    expect(sub.currentPeriodEnd.getTime()).toBe(
      new Date(2026, 3, 15).getTime(),
    );
  });

  it("adds an AI_OVERAGE line item with marked-up excess", async () => {
    const workspace = await createTestWorkspace("FREE");
    const { subscription } = await activateSubscription(
      workspace.id,
      "BUSINESS",
      { includedAiCreditUsd: 20, overageMarkupPct: 20 },
      db,
    );
    await pinPeriod(workspace.id);

    await db.lLMUsageLog.create({
      data: {
        workspaceId: workspace.id,
        model: "openai/gpt-4o",
        provider: "openai",
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        costUsd: 30,
        createdAt: new Date(2026, 2, 1),
      },
    });

    const invoice = await generatePeriodInvoice(subscription.id, db);

    // (30 - 20) * 1.2 = 12 ; total = 150 + 12
    expect(Number(invoice.overageAmountUsd)).toBeCloseTo(12);
    expect(Number(invoice.totalUsd)).toBeCloseTo(162);

    const lineItems = await db.invoiceLineItem.findMany({
      where: { invoiceId: invoice.id },
    });
    expect(lineItems.map((l) => l.kind).sort()).toEqual([
      "AI_OVERAGE",
      "SUBSCRIPTION",
    ]);
  });

  it("is idempotent: a second run for the same period does not duplicate", async () => {
    const workspace = await createTestWorkspace("FREE");
    const { subscription } = await activateSubscription(
      workspace.id,
      "BUSINESS",
      {},
      db,
    );
    await pinPeriod(workspace.id);

    // Pre-existing invoice for the period the next run would generate (Mar 15).
    await db.invoice.create({
      data: {
        workspaceId: workspace.id,
        subscriptionId: subscription.id,
        periodStart: new Date(2026, 2, 15),
        periodEnd: new Date(2026, 3, 15),
        status: "ISSUED",
        baseAmountUsd: 150,
        totalUsd: 150,
      },
    });

    const result = await generatePeriodInvoice(subscription.id, db);

    const invoices = await db.invoice.findMany({
      where: {
        subscriptionId: subscription.id,
        periodStart: new Date(2026, 2, 15),
      },
    });
    expect(invoices).toHaveLength(1);
    expect(result.id).toBe(invoices[0]!.id);

    // Period must NOT advance when we short-circuit on an existing invoice.
    const sub = await db.subscription.findUniqueOrThrow({
      where: { id: subscription.id },
    });
    expect(sub.currentPeriodEnd.getTime()).toBe(
      new Date(2026, 2, 15).getTime(),
    );
  });
});

describe("confirmInvoicePayment", () => {
  const setupOverdue = async (status: "IN_GRACE" | "QUARANTINED") => {
    const workspace = await createTestWorkspace("FREE");
    const { invoice } = await activateSubscription(
      workspace.id,
      "BUSINESS",
      {},
      db,
    );
    await db.workspace.update({
      where: { id: workspace.id },
      data: {
        isPastDue: true,
        isQuarantined: status === "QUARANTINED",
      },
    });
    await db.subscription.update({
      where: { workspaceId: workspace.id },
      data: { status },
    });
    return { workspaceId: workspace.id, invoiceId: invoice.id };
  };

  it.each([
    "IN_GRACE",
    "QUARANTINED",
  ] as const)("clears flags and revives the subscription from %s", async (status) => {
    const { workspaceId, invoiceId } = await setupOverdue(status);

    await confirmInvoicePayment(
      {
        invoiceId,
        method: "BANK_TRANSFER",
        amountUsd: 150,
        confirmedByUserId: "staff-1",
      },
      db,
    );

    const invoice = await db.invoice.findUniqueOrThrow({
      where: { id: invoiceId },
    });
    const workspace = await db.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
    });
    const sub = await db.subscription.findUniqueOrThrow({
      where: { workspaceId },
    });
    const payment = await db.payment.findFirstOrThrow({
      where: { invoiceId },
    });

    expect(invoice.status).toBe("PAID");
    expect(invoice.paidAt).not.toBeNull();
    expect(workspace.isPastDue).toBe(false);
    expect(workspace.isQuarantined).toBe(false);
    expect(sub.status).toBe("ACTIVE");
    expect(payment.status).toBe("CONFIRMED");
    expect(payment.confirmedByUserId).toBe("staff-1");
  });

  it("rejects confirming an already-paid invoice", async () => {
    const { invoiceId } = await setupOverdue("IN_GRACE");
    await confirmInvoicePayment(
      {
        invoiceId,
        method: "BANK_TRANSFER",
        amountUsd: 150,
        confirmedByUserId: "staff-1",
      },
      db,
    );

    await expect(
      confirmInvoicePayment(
        {
          invoiceId,
          method: "BANK_TRANSFER",
          amountUsd: 150,
          confirmedByUserId: "staff-1",
        },
        db,
      ),
    ).rejects.toThrow(/already PAID/);
  });

  it("rejects a mismatched amount unless allowPartial is set", async () => {
    const { invoiceId } = await setupOverdue("IN_GRACE");

    await expect(
      confirmInvoicePayment(
        {
          invoiceId,
          method: "BANK_TRANSFER",
          amountUsd: 100,
          confirmedByUserId: "staff-1",
        },
        db,
      ),
    ).rejects.toThrow(/does not match/);

    await expect(
      confirmInvoicePayment(
        {
          invoiceId,
          method: "BANK_TRANSFER",
          amountUsd: 100,
          confirmedByUserId: "staff-1",
          allowPartial: true,
        },
        db,
      ),
    ).resolves.toEqual({ success: true });
  });
});
