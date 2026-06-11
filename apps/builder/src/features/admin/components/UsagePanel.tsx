import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@typebot.io/ui/components/Skeleton";
import { Table } from "@typebot.io/ui/components/Table";
import { orpc } from "@/lib/queryClient";

type Props = {
  workspaceId: string;
  subscription: {
    currentPeriodStart: Date | string;
    currentPeriodEnd: Date | string;
    includedAiCreditUsd: unknown;
  } | null;
};

export const UsagePanel = ({ workspaceId, subscription }: Props) => {
  const periodStart = subscription
    ? new Date(subscription.currentPeriodStart).toISOString()
    : undefined;
  const periodEnd = subscription
    ? new Date(subscription.currentPeriodEnd).toISOString()
    : undefined;

  const { data, status } = useQuery(
    orpc.admin.usageByWorkspace.queryOptions({
      input: { workspaceId, periodStart, periodEnd },
    }),
  );

  const includedUsd = Number(subscription?.includedAiCreditUsd ?? 0);
  const totalUsd = data?.totalCostUsd ?? 0;
  const overage = Math.max(0, totalUsd - includedUsd);

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-medium">AI usage — current period</h3>

      {status === "pending" ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-48 rounded-md" />
          <Skeleton className="h-24 w-full rounded-md" />
        </div>
      ) : status === "error" ? (
        <p className="text-sm text-red-11">Failed to load usage data</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <p className="text-xs text-gray-10 uppercase tracking-wide">
                Total cost
              </p>
              <p className="text-2xl font-semibold mt-1">
                ${totalUsd.toFixed(4)}
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-xs text-gray-10 uppercase tracking-wide">
                Included credit
              </p>
              <p className="text-2xl font-semibold mt-1">
                ${includedUsd.toFixed(2)}
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-xs text-gray-10 uppercase tracking-wide">
                Overage
              </p>
              <p
                className={`text-2xl font-semibold mt-1 ${overage > 0 ? "text-orange-11" : ""}`}
              >
                ${overage.toFixed(4)}
              </p>
            </div>
          </div>

          {data.byModel.length === 0 ? (
            <p className="text-sm text-gray-10">No AI usage this period</p>
          ) : (
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.Head>Model</Table.Head>
                  <Table.Head>Provider</Table.Head>
                  <Table.Head>Calls</Table.Head>
                  <Table.Head>Input tokens</Table.Head>
                  <Table.Head>Output tokens</Table.Head>
                  <Table.Head>Cost (USD)</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {data.byModel.map((row) => (
                  <Table.Row key={`${row.provider}:${row.model}`}>
                    <Table.Cell className="font-mono text-xs">
                      {row.model}
                    </Table.Cell>
                    <Table.Cell className="text-xs text-gray-10">
                      {row.provider}
                    </Table.Cell>
                    <Table.Cell>{row.callCount}</Table.Cell>
                    <Table.Cell>{row.inputTokens.toLocaleString()}</Table.Cell>
                    <Table.Cell>{row.outputTokens.toLocaleString()}</Table.Cell>
                    <Table.Cell className="font-medium">
                      ${row.costUsd.toFixed(6)}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}

          <p className="text-xs text-gray-9">
            Period: {data.periodStart.toLocaleDateString()} –{" "}
            {data.periodEnd.toLocaleDateString()}
          </p>
        </>
      )}
    </div>
  );
};
