import { Plan } from "@typebot.io/prisma/enum";

export type TemplatePlanRequirement = "BUSINESS" | "ENTERPRISE";

const businessOrHigher = new Set<Plan>([
  Plan.BUSINESS,
  Plan.PRO,
  Plan.ENTERPRISE,
  Plan.UNLIMITED,
  Plan.LIFETIME,
  Plan.CUSTOM,
  Plan.OFFERED,
]);

const enterpriseOrHigher = new Set<Plan>([
  Plan.ENTERPRISE,
  Plan.UNLIMITED,
  Plan.LIFETIME,
  Plan.CUSTOM,
]);

export const isPlanEntitledForTemplate = (
  plan: Plan,
  requiredPlan: TemplatePlanRequirement | undefined,
): boolean => {
  if (!requiredPlan) return true;
  if (requiredPlan === "BUSINESS") return businessOrHigher.has(plan);
  return enterpriseOrHigher.has(plan);
};
