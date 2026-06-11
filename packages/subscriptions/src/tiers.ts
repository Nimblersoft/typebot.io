import { Plan } from "@typebot.io/prisma/enum";

export type Feature = "calCom" | "advancedModules";

export type TierConfig = {
  priceUsd: number | null;
  botLimit: number | "inf";
  features: ReadonlyArray<Feature>;
  // AI metering defaults applied at activation when the caller omits options.
  // Numbers below are placeholders pending product-owner confirmation; they
  // match the current admin-UI literals (20 / 20 / none).
  includedAiCreditUsd: number;
  overageMarkupPct: number;
  defaultAiHardCeilingUsd: number | null;
};

const paidAiDefaults = {
  includedAiCreditUsd: 20,
  overageMarkupPct: 20,
  defaultAiHardCeilingUsd: null,
} as const;

const noAiDefaults = {
  includedAiCreditUsd: 0,
  overageMarkupPct: 0,
  defaultAiHardCeilingUsd: null,
} as const;

export const tierConfig: Record<Plan, TierConfig> = {
  [Plan.FREE]: {
    priceUsd: 0,
    botLimit: 2,
    features: [],
    ...noAiDefaults,
  },
  [Plan.BUSINESS]: {
    priceUsd: 150,
    botLimit: 10,
    features: ["calCom", "advancedModules"],
    ...paidAiDefaults,
  },
  [Plan.ENTERPRISE]: {
    priceUsd: null,
    botLimit: "inf",
    features: ["calCom", "advancedModules"],
    ...paidAiDefaults,
  },
  // Legacy Stripe plans — treated as unlimited for backward compat
  [Plan.UNLIMITED]: {
    priceUsd: null,
    botLimit: "inf",
    features: ["calCom", "advancedModules"],
    ...paidAiDefaults,
  },
  [Plan.LIFETIME]: {
    priceUsd: null,
    botLimit: "inf",
    features: ["calCom", "advancedModules"],
    ...paidAiDefaults,
  },
  [Plan.CUSTOM]: {
    priceUsd: null,
    botLimit: "inf",
    features: ["calCom", "advancedModules"],
    ...paidAiDefaults,
  },
  [Plan.OFFERED]: {
    priceUsd: null,
    botLimit: "inf",
    features: ["calCom", "advancedModules"],
    ...paidAiDefaults,
  },
  [Plan.STARTER]: {
    priceUsd: null,
    botLimit: 2,
    features: [],
    ...noAiDefaults,
  },
  [Plan.PRO]: {
    priceUsd: null,
    botLimit: 10,
    features: ["calCom", "advancedModules"],
    ...paidAiDefaults,
  },
};
