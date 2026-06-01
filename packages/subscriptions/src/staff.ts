import { ORPCError } from "@orpc/server";
import { env } from "@typebot.io/env";

const normalizeEmail = (email?: string | null): string | undefined =>
  email?.trim().toLowerCase() || undefined;

export const isStaff = (user: { email?: string | null }): boolean => {
  const userEmail = normalizeEmail(user.email);
  if (!userEmail) return false;
  return (
    env.ADMIN_EMAIL?.some(
      (adminEmail) => normalizeEmail(adminEmail) === userEmail,
    ) ?? false
  );
};

export const assertStaff = (user: { email?: string | null }): void => {
  if (!isStaff(user)) throw new ORPCError("FORBIDDEN");
};
