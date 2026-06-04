import type { PaymentProvider } from "./PaymentProvider";

// ManualProvider represents bank-transfer payments confirmed manually by staff.
// No createPaymentLink — customer pays out-of-band via wire transfer.
// No verifyWebhook — staff confirms in /admin via invoice.confirmPayment.
export const manualProvider: PaymentProvider = {
  method: "BANK_TRANSFER",
};
