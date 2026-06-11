// Hard-ceiling circuit-breaker decision for internal AI routing. A null ceiling
// means "no ceiling" and never trips. Pure, no DB.
export const isOverCeiling = ({
  periodCostUsd,
  aiHardCeilingUsd,
}: {
  periodCostUsd: number;
  aiHardCeilingUsd: number | null;
}): boolean => {
  if (aiHardCeilingUsd === null) return false;
  return periodCostUsd >= aiHardCeilingUsd;
};
