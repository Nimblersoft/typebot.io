import { useQuery } from "@tanstack/react-query";
import { getTypebotsLimit } from "@typebot.io/subscriptions/getTypebotsLimit";
import { useWorkspace } from "@/features/workspace/WorkspaceProvider";
import { orpc } from "@/lib/queryClient";

export const OverBotLimitBanner = () => {
  const { workspace } = useWorkspace();

  const { data } = useQuery(
    orpc.typebot.countWorkspaceTypebots.queryOptions({
      input: { workspaceId: workspace?.id ?? "" },
      enabled: !!workspace?.id,
    }),
  );

  if (!workspace || data === undefined) return null;

  const limit = getTypebotsLimit(workspace.plan);
  if (limit === "inf" || data.count <= limit) return null;

  return (
    <div className="flex items-center gap-2 w-full justify-center text-sm text-center py-2 bg-orange-9 z-50 text-white">
      <p>
        Your workspace has <strong>{data.count} bots</strong> but your current
        plan allows <strong>{limit}</strong>. New bots are blocked. Upgrade to
        Business to create more.
      </p>
    </div>
  );
};
