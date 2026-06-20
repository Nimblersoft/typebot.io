import { useQuery } from "@tanstack/react-query";
import { Progress } from "@typebot.io/ui/components/Progress";
import { Skeleton } from "@typebot.io/ui/components/Skeleton";
import { orpc } from "@/lib/queryClient";

type Props = {
  workspaceId: string;
};

// Customer-facing AI usage. Labels are intentionally generic ("AI usage",
// "included AI credit") — the underlying provider is never surfaced here.
export const AiUsageBar = ({ workspaceId }: Props) => {
  const { data, isLoading } = useQuery(
    orpc.subscription.getAiUsage.queryOptions({
      input: { workspaceId },
    }),
  );

  if (isLoading) return <Skeleton className="h-2 w-full" />;

  if (!data || data.includedAiCreditUsd === 0) return null;

  const usedPercentage = Math.min(
    100,
    Math.round((data.rawCostUsd / data.includedAiCreditUsd) * 100),
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xl">AI usage</h3>
        <p>
          <span className="font-bold">${data.rawCostUsd.toFixed(2)}</span> / $
          {data.includedAiCreditUsd.toFixed(2)} included
        </p>
      </div>
      <Progress.Root value={usedPercentage} />
      {data.overageUsd > 0 && (
        <p className="text-sm text-orange-11">
          Overage accruing this period: +${data.overageUsd.toFixed(2)}
        </p>
      )}
      {data.aiHardCeilingUsd !== null && (
        <p className="text-sm italic text-gray-9">
          AI usage pauses at ${data.aiHardCeilingUsd.toFixed(2)} this period.
        </p>
      )}
    </div>
  );
};
