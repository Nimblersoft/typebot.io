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
  invoiceId: string;
}

export const QuarantineNoticeEmail = ({
  workspaceName,
  amountUsd,
  invoiceId,
}: Props) => {
  const formattedAmount = `$${amountUsd.toFixed(2)}`;

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Logo />
          <Text style={paragraph}>
            Your workspace <strong>{workspaceName}</strong> has been suspended
            due to a non-payment of <strong>{formattedAmount}</strong>.
            <br />
            <br />
            Your bots are currently offline. To reactivate your service, please
            pay the outstanding invoice as soon as possible. Your workspace data
            and bots are preserved.
            <br />
            <br />
            Once payment is confirmed by our team, your service will be restored
            within minutes.
          </Text>
          <Button
            href={`${process.env.NEXTAUTH_URL}/billing?invoice=${invoiceId}`}
            style={primaryButton}
          >
            Pay outstanding invoice
          </Button>
          <Hr style={hr} />
          <Text style={footerText}>Nimblersoft — nimblersoft.com</Text>
        </Container>
      </Body>
    </Html>
  );
};

QuarantineNoticeEmail.PreviewProps = {
  workspaceName: "Acme Corp",
  amountUsd: 150,
  invoiceId: "cuid-preview",
} as Props;

export default QuarantineNoticeEmail;

export const sendQuarantineNoticeEmail = async ({
  to,
  ...props
}: Pick<SendMailOptions, "to"> &
  ComponentProps<typeof QuarantineNoticeEmail>) =>
  sendEmail({
    to,
    subject: "Your Nimblersoft workspace has been suspended — payment required",
    html: await render(<QuarantineNoticeEmail {...props} />),
  });
