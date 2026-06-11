// AI overage billed on a period invoice. Decision (2026-06-11, product owner
// default): the markup applies only to the billable excess above the included
// AI credit — i.e. max(0, rawCost − included) * (1 + markup%). Pure, no DB.
export const computeOverageUsd = ({
  rawCostUsd,
  includedAiCreditUsd,
  overageMarkupPct,
}: {
  rawCostUsd: number;
  includedAiCreditUsd: number;
  overageMarkupPct: number;
}): number => {
  const billableExcessUsd = Math.max(0, rawCostUsd - includedAiCreditUsd);
  return billableExcessUsd * (1 + overageMarkupPct / 100);
};
