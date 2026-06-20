import { env } from "@typebot.io/env";

// Nimblerbot is always self-hosted and never uses Stripe, so the only
// environment that should keep the upstream Stripe billing UI is the Typebot
// cloud. Unlike `isSelfHostedInstance`, this treats localhost as a Nimblerbot
// instance so the custom billing UI renders (and is testable) in local dev.
export const isNimblerbotInstance = () => {
  if (typeof window !== "undefined") {
    return (
      window.location.hostname !== "app.typebot.com" &&
      window.location.hostname !== "app.typebot.io"
    );
  }
  return (
    env.NEXTAUTH_URL !== "https://app.typebot.com" &&
    env.NEXTAUTH_URL !== "https://app.typebot.io"
  );
};
