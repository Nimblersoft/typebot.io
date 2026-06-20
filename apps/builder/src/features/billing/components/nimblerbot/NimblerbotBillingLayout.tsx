import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@typebot.io/ui/components/Skeleton";
import type { WorkspaceInApp } from "@/features/workspace/WorkspaceProvider";
import { orpc } from "@/lib/queryClient";
import { AiUsageBar } from "./AiUsageBar";
import { NimblerbotInvoicesList } from "./NimblerbotInvoicesList";
import { NimblerbotPlanCards } from "./NimblerbotPlanCards";
import { SubscriptionSummaryCard } from "./SubscriptionSummaryCard";

type Props = {
  workspace: WorkspaceInApp;
};

export const NimblerbotBillingLayout = ({ workspace }: Props) => {
  const { data: subscription, isLoading } = useQuery(
    orpc.subscription.getByWorkspace.queryOptions({
      input: { workspaceId: workspace.id },
    }),
  );

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  if (!subscription)
    return (
      <div className="flex flex-col gap-10">
        <p className="text-sm text-gray-10">
          You're on the Starter plan. Contact us to upgrade to Business or
          Enterprise.
        </p>
        <NimblerbotPlanCards currentTier={workspace.plan} />
      </div>
    );

  return (
    <div className="flex flex-col gap-10">
      <SubscriptionSummaryCard
        tier={subscription.tier}
        status={subscription.status}
        currentPeriodStart={subscription.currentPeriodStart}
        currentPeriodEnd={subscription.currentPeriodEnd}
      />
      <AiUsageBar workspaceId={workspace.id} />
      <NimblerbotInvoicesList workspaceId={workspace.id} />
      <NimblerbotPlanCards currentTier={subscription.tier} />
    </div>
  );
};
