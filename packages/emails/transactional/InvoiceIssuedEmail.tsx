import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Text,
} from "@react-email/components";
import { render } from "@react-email/render";
import type { SendMailOptions } from "nodemailer";
import type { ComponentProps } from "react";
import * as React from "react";
import { sendEmail } from "../helpers/sendEmail";
import { Logo } from "./components/Logo";
import {
  container,
  footerText,
  hr,
  main,
  paragraph,
  primaryButton,
} from "./styles";

void React;

interface Props {
  workspaceName: string;
  amountUsd: number;
  dueAt: Date;
  invoiceId: string;
}

export const InvoiceIssuedEmail = ({
  workspaceName,
  amountUsd,
  dueAt,
  invoiceId,
}: Props) => {
  const formattedAmount = `$${amountUsd.toFixed(2)}`;
  const formattedDue = dueAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Logo />
          <Text style={paragraph}>
            A new invoice has been issued for your workspace{" "}
            <strong>{workspaceName}</strong>.
            <br />
            <br />
            <strong>Amount due:</strong> {formattedAmount}
            <br />
            <strong>Due date:</strong> {formattedDue}
            <br />
            <br />
            To avoid any interruption to your service, please pay before the due
            date via bank transfer or DeUna. Your bots will continue running
            during the 7-day grace period after the due date.
          </Text>
          <Button
            href={`${process.env.NEXTAUTH_URL}/billing?invoice=${invoiceId}`}
            style={primaryButton}
          >
            View invoice
          </Button>
          <Hr style={hr} />
          <Text style={footerText}>Nimblersoft — nimblersoft.com</Text>
        </Container>
      </Body>
    </Html>
  );
};

InvoiceIssuedEmail.PreviewProps = {
  workspaceName: "Acme Corp",
  amountUsd: 150,
  dueAt: new Date(Date.now() + 7 * 86400000),
  invoiceId: "cuid-preview",
} as Props;

export default InvoiceIssuedEmail;

export const sendInvoiceIssuedEmail = async ({
  to,
  ...props
}: Pick<SendMailOptions, "to"> & ComponentProps<typeof InvoiceIssuedEmail>) =>
  sendEmail({
    to,
    subject: `Invoice issued — $${props.amountUsd.toFixed(2)} due ${props.dueAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
    html: await render(<InvoiceIssuedEmail {...props} />),
  });
