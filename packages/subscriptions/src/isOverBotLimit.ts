// Whether creating one more bot would exceed the plan's bot limit. An "inf"
// limit (Enterprise/legacy) never trips. Pure, no DB.
export const isOverBotLimit = (
  limit: number | "inf",
  currentTypebotCount: number,
): boolean => limit !== "inf" && currentTypebotCount >= limit;
