import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tierConfig } from "@typebot.io/subscriptions/tiers";
import { Button } from "@typebot.io/ui/components/Button";
import { useState } from "react";
import { orpc } from "@/lib/queryClient";
import type { AdminWorkspace } from "../types";

type Props = {
  workspace: AdminWorkspace;
};

const businessDefaults = tierConfig.BUSINESS;

export const SubscriptionForm = ({ workspace }: Props) => {
  const queryClient = useQueryClient();
  const sub = workspace.subscription;

  const [plan, setPlan] = useState<"BUSINESS" | "ENTERPRISE">("BUSINESS");
  const [tier, setTier] = useState<"BUSINESS" | "ENTERPRISE">(
    sub?.tier === "ENTERPRISE" ? "ENTERPRISE" : "BUSINESS",
  );
  const [includedAiCredit, setIncludedAiCredit] = useState(
    sub
      ? String(Number(sub.includedAiCreditUsd))
      : String(businessDefaults.includedAiCreditUsd),
  );
  const [overageMarkup, setOverageMarkup] = useState(
    sub
      ? String(Number(sub.overageMarkupPct))
      : String(businessDefaults.overageMarkupPct),
  );
  const [hardCeiling, setHardCeiling] = useState(
    sub?.aiHardCeilingUsd
      ? String(Number(sub.aiHardCeilingUsd))
      : businessDefaults.defaultAiHardCeilingUsd === null
        ? ""
        : String(businessDefaults.defaultAiHardCeilingUsd),
  );

  const activate = useMutation(
    orpc.subscription.activate.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: orpc.admin.getWorkspace.queryOptions({
            input: { workspaceId: workspace.id },
          }).queryKey,
        }),
    }),
  );

  const cancel = useMutation(
    orpc.subscription.cancel.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: orpc.admin.getWorkspace.queryOptions({
            input: { workspaceId: workspace.id },
          }).queryKey,
        }),
    }),
  );

  const updateSub = useMutation(
    orpc.admin.updateSubscription.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: orpc.admin.getWorkspace.queryOptions({
            input: { workspaceId: workspace.id },
          }).queryKey,
        }),
    }),
  );

  const tierChange = useMutation(
    orpc.subscription.changeTier.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: orpc.admin.getWorkspace.queryOptions({
            input: { workspaceId: workspace.id },
          }).queryKey,
        }),
    }),
  );

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    activate.mutate({
      workspaceId: workspace.id,
      plan,
      includedAiCreditUsd: includedAiCredit
        ? Number(includedAiCredit)
        : undefined,
      overageMarkupPct: overageMarkup ? Number(overageMarkup) : undefined,
      aiHardCeilingUsd: hardCeiling ? Number(hardCeiling) : undefined,
    });
  };

  const handleUpdateLimits = (e: React.FormEvent) => {
    e.preventDefault();
    updateSub.mutate({
      workspaceId: workspace.id,
      includedAiCreditUsd: includedAiCredit
        ? Number(includedAiCredit)
        : undefined,
      overageMarkupPct: overageMarkup ? Number(overageMarkup) : undefined,
      aiHardCeilingUsd: hardCeiling ? Number(hardCeiling) : null,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {!sub || sub.status === "CANCELED" ? (
        <form onSubmit={handleActivate} className="flex flex-col gap-4">
          <h3 className="font-medium">Activate subscription</h3>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Plan</span>
              <select
                className="border rounded-md px-3 py-2 text-sm bg-gray-1"
                value={plan}
                onChange={(e) =>
                  setPlan(e.target.value as "BUSINESS" | "ENTERPRISE")
                }
              >
                <option value="BUSINESS">Business ($150/mo)</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">
                Included AI credit (USD/mo)
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                className="border rounded-md px-3 py-2 text-sm bg-gray-1"
                value={includedAiCredit}
                onChange={(e) => setIncludedAiCredit(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Overage markup (%)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                className="border rounded-md px-3 py-2 text-sm bg-gray-1"
                value={overageMarkup}
                onChange={(e) => setOverageMarkup(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">
                Hard ceiling USD{" "}
                <span className="text-gray-9 font-normal">
                  (leave blank = none)
                </span>
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                className="border rounded-md px-3 py-2 text-sm bg-gray-1"
                placeholder="e.g. 100"
                value={hardCeiling}
                onChange={(e) => setHardCeiling(e.target.value)}
              />
            </label>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={activate.isPending}>
              {activate.isPending ? "Activating…" : "Activate"}
            </Button>
          </div>
          {activate.isError && (
            <p className="text-sm text-red-11">{activate.error.message}</p>
          )}
        </form>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            <h3 className="font-medium">Plan tier</h3>
            <div className="flex items-end gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Tier</span>
                <select
                  className="border rounded-md px-3 py-2 text-sm bg-gray-1"
                  value={tier}
                  onChange={(e) =>
                    setTier(
                      e.target.value === "ENTERPRISE"
                        ? "ENTERPRISE"
                        : "BUSINESS",
                    )
                  }
                >
                  <option value="BUSINESS">Business ($150/mo)</option>
                  <option value="ENTERPRISE">Enterprise</option>
                </select>
              </label>
              <Button
                type="button"
                disabled={tierChange.isPending || tier === sub.tier}
                onClick={() =>
                  tierChange.mutate({ workspaceId: workspace.id, tier })
                }
              >
                {tierChange.isPending ? "Changing…" : "Change tier"}
              </Button>
            </div>
            <p className="text-sm text-gray-9">
              Base-price change takes effect next billing cycle (no proration).
            </p>
            {tierChange.isError && (
              <p className="text-sm text-red-11">{tierChange.error.message}</p>
            )}
          </div>
          <form onSubmit={handleUpdateLimits} className="flex flex-col gap-4">
            <h3 className="font-medium">Subscription limits</h3>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">
                  Included AI credit (USD/mo)
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="border rounded-md px-3 py-2 text-sm bg-gray-1"
                  value={includedAiCredit}
                  onChange={(e) => setIncludedAiCredit(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Overage markup (%)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="border rounded-md px-3 py-2 text-sm bg-gray-1"
                  value={overageMarkup}
                  onChange={(e) => setOverageMarkup(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">
                  Hard ceiling USD{" "}
                  <span className="text-gray-9 font-normal">
                    (blank = disabled)
                  </span>
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="border rounded-md px-3 py-2 text-sm bg-gray-1"
                  placeholder="e.g. 100"
                  value={hardCeiling}
                  onChange={(e) => setHardCeiling(e.target.value)}
                />
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={updateSub.isPending}>
                {updateSub.isPending ? "Saving…" : "Save limits"}
              </Button>
              <Button
                variant="destructive"
                type="button"
                disabled={cancel.isPending}
                onClick={() =>
                  confirm("Cancel subscription for this workspace?") &&
                  cancel.mutate({ workspaceId: workspace.id })
                }
              >
                {cancel.isPending ? "Canceling…" : "Cancel subscription"}
              </Button>
            </div>
            {updateSub.isError && (
              <p className="text-sm text-red-11">{updateSub.error.message}</p>
            )}
            {cancel.isError && (
              <p className="text-sm text-red-11">{cancel.error.message}</p>
            )}
          </form>
        </>
      )}
    </div>
  );
};
