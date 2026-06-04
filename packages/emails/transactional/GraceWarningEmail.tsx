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
  graceDaysLeft: number;
  invoiceId: string;
}

export const GraceWarningEmail = ({
  workspaceName,
  amountUsd,
  graceDaysLeft,
  invoiceId,
}: Props) => {
  const formattedAmount = `$${amountUsd.toFixed(2)}`;
  const dayWord = graceDaysLeft === 1 ? "day" : "days";

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Logo />
          <Text style={paragraph}>
            Your workspace <strong>{workspaceName}</strong> has an overdue
            invoice of <strong>{formattedAmount}</strong>.
            <br />
            <br />
            Your bots are still running, but you have{" "}
            <strong>
              {graceDaysLeft} {dayWord}
            </strong>{" "}
            left to pay before your service is suspended.
            <br />
            <br />
            Please pay via bank transfer or DeUna as soon as possible to avoid
            any disruption.
          </Text>
          <Button
            href={`${process.env.NEXTAUTH_URL}/billing?invoice=${invoiceId}`}
            style={primaryButton}
          >
            Pay now
          </Button>
          <Hr style={hr} />
          <Text style={footerText}>Nimblersoft — nimblersoft.com</Text>
        </Container>
      </Body>
    </Html>
  );
};

GraceWarningEmail.PreviewProps = {
  workspaceName: "Acme Corp",
  amountUsd: 150,
  graceDaysLeft: 5,
  invoiceId: "cuid-preview",
} as Props;

export default GraceWarningEmail;

export const sendGraceWarningEmail = async ({
  to,
  ...props
}: Pick<SendMailOptions, "to"> & ComponentProps<typeof GraceWarningEmail>) =>
  sendEmail({
    to,
    subject: `Action required: payment overdue — ${props.graceDaysLeft} day${props.graceDaysLeft === 1 ? "" : "s"} before suspension`,
    html: await render(<GraceWarningEmail {...props} />),
  });
