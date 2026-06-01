import { ORPCError } from "@orpc/server";
import type { Plan } from "@typebot.io/prisma/enum";
import { type Feature, tierConfig } from "./tiers";

export const planFeatures = (plan: Plan): ReadonlyArray<Feature> =>
  tierConfig[plan].features;

export const hasFeature = (plan: Plan, feature: Feature): boolean =>
  planFeatures(plan).includes(feature);

export const assertFeature = (plan: Plan, feature: Feature): void => {
  if (!hasFeature(plan, feature))
    throw new ORPCError("FORBIDDEN", {
      message: `Your plan does not include access to this feature.`,
    });
};
