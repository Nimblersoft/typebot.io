import { Plan } from "@typebot.io/prisma/enum";
import type { Workspace } from "@typebot.io/workspaces/schemas";
import { seatsLimits } from "../constants";

export const getSeatsLimit = ({
  plan,
  customSeatsLimit,
}: Pick<Workspace, "plan" | "customSeatsLimit">) => {
  if (customSeatsLimit) return customSeatsLimit;
  if (plan === Plan.UNLIMITED || plan === Plan.CUSTOM || plan === Plan.BUSINESS)
    return "inf";
  return seatsLimits[plan];
};
