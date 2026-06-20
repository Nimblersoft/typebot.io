import { Accordion } from "@typebot.io/ui/components/Accordion";
import { Button } from "@typebot.io/ui/components/Button";
import { bankTransferDetails, billingContact } from "./nimblerbotBillingConfig";

type Props = {
  invoiceId: string;
  status: string;
  totalUsd: number;
  paymentLink: string | null;
};

// Payment options for an unpaid invoice. DeUna link only appears once a link
// has been generated (Phase 3.4 wiring); bank transfer is always available.
export const InvoicePaymentAction = ({
  invoiceId,
  status,
  totalUsd,
  paymentLink,
}: Props) => {
  if (status !== "ISSUED" && status !== "OVERDUE") return null;

  return (
    <div className="flex flex-col gap-3">
      {paymentLink && (
        <Button
          render={(props) => (
            <a
              {...props}
              href={paymentLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              Pay ${totalUsd.toFixed(2)} with DeUna
            </a>
          )}
        />
      )}
      <Accordion.Root>
        <Accordion.Item value="bank-transfer">
          <Accordion.Trigger>Pay by bank transfer</Accordion.Trigger>
          <Accordion.Panel className="text-sm text-gray-11">
            <p>
              Transfer{" "}
              <span className="font-medium">${totalUsd.toFixed(2)}</span> to:
            </p>
            <ul className="flex flex-col gap-0.5">
              <li>Bank: {bankTransferDetails.bankName}</li>
              <li>
                {bankTransferDetails.accountType} #
                {bankTransferDetails.accountNumber}
              </li>
              <li>Beneficiary: {bankTransferDetails.beneficiary}</li>
              <li>{bankTransferDetails.taxId}</li>
            </ul>
            <p>
              Use invoice <span className="font-mono">{invoiceId}</span> as the
              transfer reference, then email proof to{" "}
              <a
                className="underline"
                href={`mailto:${billingContact.supportEmail}?subject=Payment for invoice ${invoiceId}`}
              >
                {billingContact.supportEmail}
              </a>
              . We confirm payments manually within one business day.
            </p>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion.Root>
    </div>
  );
};
