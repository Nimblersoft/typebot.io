import { cn } from "@typebot.io/ui/lib/cn";

type Plan =
  | "FREE"
  | "STARTER"
  | "PRO"
  | "LIFETIME"
  | "OFFERED"
  | "CUSTOM"
  | "UNLIMITED"
  | "ENTERPRISE"
  | "BUSINESS";

const planStyles: Record<Plan, string> = {
  FREE: "bg-gray-3 text-gray-11",
  STARTER: "bg-gray-3 text-gray-11",
  PRO: "bg-teal-3 text-teal-11",
  LIFETIME: "bg-teal-3 text-teal-11",
  OFFERED: "bg-orange-3 text-orange-11",
  CUSTOM: "bg-orange-3 text-orange-11",
  UNLIMITED: "bg-purple-3 text-purple-11",
  ENTERPRISE: "bg-purple-3 text-purple-11",
  BUSINESS: "bg-blue-3 text-blue-11",
};

const planLabels: Record<Plan, string> = {
  FREE: "Starter",
  STARTER: "Starter (legacy)",
  PRO: "Pro",
  LIFETIME: "Lifetime",
  OFFERED: "Offered",
  CUSTOM: "Custom",
  UNLIMITED: "Unlimited",
  ENTERPRISE: "Enterprise",
  BUSINESS: "Business",
};

export const PlanBadge = ({ plan }: { plan: Plan }) => (
  <span
    className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
      planStyles[plan],
    )}
  >
    {planLabels[plan]}
  </span>
);
