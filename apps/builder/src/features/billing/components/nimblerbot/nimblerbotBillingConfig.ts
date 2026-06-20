import { env } from "@typebot.io/env";

export const billingContact = {
  salesEmail: env.NEXT_PUBLIC_NIMBLERBOT_BILLING_SALES_EMAIL ?? "",
  supportEmail: env.NEXT_PUBLIC_NIMBLERBOT_BILLING_SUPPORT_EMAIL ?? "",
};

export const bankTransferDetails = {
  bankName: env.NEXT_PUBLIC_NIMBLERBOT_BILLING_BANK_NAME ?? "",
  accountType: env.NEXT_PUBLIC_NIMBLERBOT_BILLING_ACCOUNT_TYPE ?? "",
  accountNumber: env.NEXT_PUBLIC_NIMBLERBOT_BILLING_ACCOUNT_NUMBER ?? "",
  beneficiary: env.NEXT_PUBLIC_NIMBLERBOT_BILLING_BENEFICIARY ?? "",
  taxId: env.NEXT_PUBLIC_NIMBLERBOT_BILLING_TAX_ID ?? "",
};
