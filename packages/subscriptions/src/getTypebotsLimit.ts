import type { Plan } from "@typebot.io/prisma/enum";
import { tierConfig } from "./tiers";

export const getTypebotsLimit = (plan: Plan): number | "inf" =>
  tierConfig[plan].botLimit;
