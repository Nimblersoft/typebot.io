import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@typebot.io/ui/components/Skeleton";
import { TriangleAlertIcon } from "@typebot.io/ui/icons/TriangleAlertIcon";
import Link from "next/link";
import { orpc } from "@/lib/queryClient";
import type { AdminWorkspace } from "../types";
import { AdminLayout } from "./AdminLayout";
import { InvoicesPanel } from "./InvoicesPanel";
import { LifecyclePanel } from "./LifecyclePanel";
import { PlanBadge } from "./PlanBadge";
import { StatusBadge } from "./StatusBadge";
import { SubscriptionForm } from "./SubscriptionForm";
import { UsagePanel } from "./UsagePanel";

export type { AdminWorkspace };

type Props = {
  workspaceId: string;
};

export const AdminWorkspaceDetailPage = ({ workspaceId }: Props) => {
  const { data: workspace, status } = useQuery(
    orpc.admin.getWorkspace.queryOptions({ input: { workspaceId } }),
  );

  return (
    <AdminLayout>
      <div className="p-6 flex flex-col gap-8 max-w-5xl">
        <div className="flex items-center gap-2 text-sm text-gray-10">
          <Link
            href="/admin/workspaces"
            className="hover:text-gray-12 transition-colors"
          >
            Clients
          </Link>
          <span>/</span>
          <span className="text-gray-12">{workspace?.name ?? workspaceId}</span>
        </div>

        {status === "pending" ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-8 w-64 rounded-md" />
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-48 w-full rounded-md" />
          </div>
        ) : status === "error" ? (
          <div className="flex items-center gap-2 text-red-11">
            <TriangleAlertIcon className="size-4" />
            <p className="text-sm">Failed to load workspace</p>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-semibold">{workspace.name}</h1>
                <p className="text-xs text-gray-9 mt-0.5 font-mono">
                  {workspace.id}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <PlanBadge plan={workspace.plan} />
                  {workspace.subscription && (
                    <StatusBadge status={workspace.subscription.status} />
                  )}
                  {workspace.isSuspended && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-3 text-gray-11">
                      suspended
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right text-sm text-gray-10">
                <p>
                  {workspace._count.typebots} bots · {workspace.members.length}{" "}
                  members
                </p>
                <p className="mt-0.5">
                  AI this month: ${workspace.currentPeriodAiCostUsd.toFixed(4)}
                </p>
              </div>
            </div>

            <div className="border rounded-xl p-5 flex flex-col gap-6">
              <SubscriptionForm workspace={workspace} />
            </div>

            <div className="border rounded-xl p-5">
              <InvoicesPanel
                workspaceId={workspace.id}
                invoices={workspace.invoices}
              />
            </div>

            <div className="border rounded-xl p-5">
              <LifecyclePanel workspace={workspace} />
            </div>

            <div className="border rounded-xl p-5">
              <UsagePanel
                workspaceId={workspace.id}
                subscription={workspace.subscription}
              />
            </div>

            <div className="border rounded-xl p-5 flex flex-col gap-3">
              <h3 className="font-medium">Members</h3>
              <div className="flex flex-col gap-2">
                {workspace.members.map((member) => (
                  <div
                    key={member.userId}
                    className="flex items-center gap-3 text-sm"
                  >
                    <div className="size-7 rounded-full bg-gray-4 flex items-center justify-center text-xs font-medium shrink-0">
                      {member.user.name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <p>{member.user.name}</p>
                      <p className="text-xs text-gray-10">
                        {member.user.email}
                      </p>
                    </div>
                    <span className="ml-auto text-xs text-gray-9 uppercase tracking-wide">
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};
