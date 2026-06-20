import type { Plan } from "@typebot.io/prisma/enum";
import { tierConfig } from "@typebot.io/subscriptions/tiers";
import { Badge } from "@typebot.io/ui/components/Badge";

type Props = {
  tier: Plan;
  status: string;
  currentPeriodStart: Date | string;
  currentPeriodEnd: Date | string;
};

const statusLabel: Record<string, string> = {
  ACTIVE: "Active",
  IN_GRACE: "Payment due",
  QUARANTINED: "Suspended for non-payment",
  CANCELED: "Canceled",
};

export const SubscriptionSummaryCard = ({
  tier,
  status,
  currentPeriodStart,
  currentPeriodEnd,
}: Props) => {
  const priceUsd = tierConfig[tier]?.priceUsd ?? null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xl">{tier}</h3>
          <Badge colorScheme={status === "ACTIVE" ? "green" : "orange"}>
            {statusLabel[status] ?? status}
          </Badge>
        </div>
        <p className="font-bold">
          {priceUsd === null ? "Custom" : `$${priceUsd}/mo`}
        </p>
      </div>
      <p className="text-sm text-gray-10">
        Current billing period: {formatDate(currentPeriodStart)} –{" "}
        {formatDate(currentPeriodEnd)}
      </p>
    </div>
  );
};

const formatDate = (date: Date | string) =>
  new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
