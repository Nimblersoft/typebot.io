import { createHmac } from "node:crypto";
import { z } from "zod";
import type {
  InvoiceForLink,
  PaymentLinkResult,
  PaymentProvider,
  WebhookPaymentResult,
} from "./PaymentProvider";

// TODO(phase-3.4): confirm exact endpoint, auth header names, and webhook
// signature scheme with DeUna merchant credentials before wiring.
// Reconcile whether this is deuna.ec (Banco Pichincha wallet) or deuna.com
// (payment orchestrator) — each has a different merchant portal and API key.

export type DeUnaConfig = {
  /** Base URL, e.g. "https://apigw.getduna.com" */
  apiBaseUrl: string;
  apiKey: string;
  merchantId: string;
  /** HMAC-SHA256 secret from the DeUna merchant dashboard webhook settings */
  webhookSecret: string;
  successRedirectUrl?: string;
  failureRedirectUrl?: string;
};

const toCents = (usd: number): number => Math.round(usd * 100);

// DeUna webhook payload schema — based on DeUna payment orchestrator contract.
// Update if the actual payload shape differs from merchant portal docs.
const deUnaWebhookSchema = z.object({
  order: z.object({
    order_id: z.string(),
    status: z.string(),
    amount: z.number(), // in cents
    metadata: z.record(z.string(), z.string()).optional(),
  }),
});

export const createDeUnaProvider = (config: DeUnaConfig): PaymentProvider => ({
  method: "DEUNA",

  async createPaymentLink(invoice: InvoiceForLink): Promise<PaymentLinkResult> {
    const amountCents = toCents(invoice.totalUsd);
    const payload = {
      order_id: invoice.id,
      currency: "USD",
      amount: amountCents,
      order_type: "PAYMENT_LINK",
      items: [
        {
          id: invoice.id,
          name: "Nimblersoft subscription",
          unit_price: amountCents,
          quantity: 1,
          total_price: amountCents,
        },
      ],
      metadata: { nimblerbotInvoiceId: invoice.id },
      ...(config.successRedirectUrl || config.failureRedirectUrl
        ? {
            redirect_urls: {
              success: config.successRedirectUrl,
              failure: config.failureRedirectUrl,
            },
          }
        : {}),
    };

    const response = await fetch(`${config.apiBaseUrl}/merchants/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "x-merchant-id": config.merchantId,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`DeUna createOrder failed ${response.status}: ${text}`);
    }

    const data = (await response.json()) as {
      payment_link: string;
      order_token?: string;
      order_id: string;
    };

    return {
      providerRef: data.order_token ?? data.order_id,
      paymentLink: data.payment_link,
    };
  },

  async verifyWebhook(
    payload: unknown,
    signature: string,
  ): Promise<WebhookPaymentResult> {
    const rawBody =
      typeof payload === "string" ? payload : JSON.stringify(payload);

    const expected = createHmac("sha256", config.webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (signature !== expected) {
      throw new Error("DeUna webhook signature mismatch");
    }

    const parsed = deUnaWebhookSchema.parse(
      typeof payload === "string" ? JSON.parse(payload) : payload,
    );

    const invoiceId = parsed.order.metadata?.nimblerbotInvoiceId;
    if (!invoiceId) {
      throw new Error(
        "DeUna webhook: missing nimblerbotInvoiceId in order metadata",
      );
    }

    return {
      invoiceId,
      providerRef: parsed.order.order_id,
      amountUsd: parsed.order.amount / 100,
      status: parsed.order.status === "succeeded" ? "succeeded" : "failed",
    };
  },
});
