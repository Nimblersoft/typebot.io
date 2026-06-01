import { Plan } from "@typebot.io/prisma/enum";

export type Feature = "calCom" | "advancedModules";

export type TierConfig = {
  priceUsd: number | null;
  botLimit: number | "inf";
  features: ReadonlyArray<Feature>;
};

export const tierConfig: Record<Plan, TierConfig> = {
  [Plan.FREE]: {
    priceUsd: 0,
    botLimit: 2,
    features: [],
  },
  [Plan.BUSINESS]: {
    priceUsd: 150,
    botLimit: 10,
    features: ["calCom", "advancedModules"],
  },
  [Plan.ENTERPRISE]: {
    priceUsd: null,
    botLimit: "inf",
    features: ["calCom", "advancedModules"],
  },
  // Legacy Stripe plans — treated as unlimited for backward compat
  [Plan.UNLIMITED]: {
    priceUsd: null,
    botLimit: "inf",
    features: ["calCom", "advancedModules"],
  },
  [Plan.LIFETIME]: {
    priceUsd: null,
    botLimit: "inf",
    features: ["calCom", "advancedModules"],
  },
  [Plan.CUSTOM]: {
    priceUsd: null,
    botLimit: "inf",
    features: ["calCom", "advancedModules"],
  },
  [Plan.OFFERED]: {
    priceUsd: null,
    botLimit: "inf",
    features: ["calCom", "advancedModules"],
  },
  [Plan.STARTER]: {
    priceUsd: null,
    botLimit: 2,
    features: [],
  },
  [Plan.PRO]: {
    priceUsd: null,
    botLimit: 10,
    features: ["calCom", "advancedModules"],
  },
};
