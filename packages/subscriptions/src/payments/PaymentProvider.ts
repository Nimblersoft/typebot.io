export type InvoiceForLink = {
  id: string;
  workspaceId: string;
  totalUsd: number;
  dueAt: Date | null;
};

export type PaymentLinkResult = {
  providerRef: string;
  paymentLink: string;
};

export type WebhookPaymentResult = {
  invoiceId: string;
  providerRef: string;
  amountUsd: number;
  status: "succeeded" | "failed";
};

export interface PaymentProvider {
  readonly method: "BANK_TRANSFER" | "DEUNA";
  createPaymentLink?(invoice: InvoiceForLink): Promise<PaymentLinkResult>;
  verifyWebhook?(
    payload: unknown,
    signature: string,
  ): Promise<WebhookPaymentResult>;
}
