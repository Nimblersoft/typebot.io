import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "@typebot.io/ui/components/Alert";
import { Button } from "@typebot.io/ui/components/Button";
import { TriangleAlertIcon } from "@typebot.io/ui/icons/TriangleAlertIcon";
import { useState } from "react";
import { orpc } from "@/lib/queryClient";
import type { AdminWorkspace } from "../types";

type Props = {
  workspace: AdminWorkspace;
};

export const LifecyclePanel = ({ workspace }: Props) => {
  const queryClient = useQueryClient();
  const [suspendReason, setSuspendReason] = useState("");

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: orpc.admin.getWorkspace.queryOptions({
        input: { workspaceId: workspace.id },
      }).queryKey,
    });

  const suspend = useMutation(
    orpc.admin.suspendWorkspace.mutationOptions({ onSuccess: invalidate }),
  );
  const unsuspend = useMutation(
    orpc.admin.unsuspendWorkspace.mutationOptions({ onSuccess: invalidate }),
  );
  const clearQuarantine = useMutation(
    orpc.admin.clearQuarantine.mutationOptions({ onSuccess: invalidate }),
  );

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-medium">Lifecycle</h3>

      {workspace.isQuarantined && (
        <Alert.Root variant="error">
          <TriangleAlertIcon />
          <Alert.Description>
            Workspace is <strong>quarantined</strong> — bots are blocked. Use
            &quot;Clear quarantine&quot; to restore service (confirm payment
            first or override).
          </Alert.Description>
        </Alert.Root>
      )}

      {workspace.isPastDue && !workspace.isQuarantined && (
        <Alert.Root variant="warning">
          <TriangleAlertIcon />
          <Alert.Description>
            Workspace is <strong>past due</strong> — bots still running but
            builder shows nag banner.
          </Alert.Description>
        </Alert.Root>
      )}

      {workspace.isSuspended && (
        <Alert.Root variant="error">
          <TriangleAlertIcon />
          <Alert.Description>
            Workspace is <strong>suspended</strong> — viewer returns 404 and
            builder is locked.
          </Alert.Description>
        </Alert.Root>
      )}

      <div className="flex flex-col gap-3">
        {workspace.isQuarantined && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={clearQuarantine.isPending}
              onClick={() => {
                if (
                  confirm(
                    "Clear quarantine? This restores bot execution without requiring payment.",
                  )
                )
                  clearQuarantine.mutate({ workspaceId: workspace.id });
              }}
            >
              {clearQuarantine.isPending
                ? "Clearing…"
                : "Clear quarantine (override)"}
            </Button>
            {clearQuarantine.isError && (
              <p className="text-sm text-red-11">
                {clearQuarantine.error.message}
              </p>
            )}
          </div>
        )}

        {!workspace.isSuspended ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                className="flex-1 border rounded-md px-3 py-2 text-sm bg-gray-1 max-w-xs"
                placeholder="Suspension reason (required)"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
              />
              <Button
                variant="destructive"
                disabled={suspend.isPending || !suspendReason.trim()}
                onClick={() => {
                  if (
                    confirm(
                      "Suspend workspace? This locks the builder and returns 404 in the viewer.",
                    )
                  )
                    suspend.mutate({
                      workspaceId: workspace.id,
                      reason: suspendReason,
                    });
                }}
              >
                {suspend.isPending ? "Suspending…" : "Suspend workspace"}
              </Button>
            </div>
            {suspend.isError && (
              <p className="text-sm text-red-11">{suspend.error.message}</p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={unsuspend.isPending}
              onClick={() => {
                if (confirm("Reactivate this workspace?"))
                  unsuspend.mutate({ workspaceId: workspace.id });
              }}
            >
              {unsuspend.isPending ? "Reactivating…" : "Reactivate workspace"}
            </Button>
            {unsuspend.isError && (
              <p className="text-sm text-red-11">{unsuspend.error.message}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
