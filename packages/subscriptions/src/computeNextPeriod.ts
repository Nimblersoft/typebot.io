// Advances a billing period by one month, pinning the day-of-month to the
// subscription's billing anchor and clamping to the last valid day for short
// months (anchor 31 → Feb 28/29). Pure: no DB, no Date.now().
export const computeNextPeriod = (
  anchorDay: number,
  currentPeriodEnd: Date,
): { periodStart: Date; periodEnd: Date; dueAt: Date } => {
  const periodStart = new Date(currentPeriodEnd);
  const periodEnd = anchorMonthLater(periodStart, anchorDay);
  const dueAt = addDays(periodStart, 7);
  return { periodStart, periodEnd, dueAt };
};

const anchorMonthLater = (from: Date, anchorDay: number): Date => {
  const targetMonthIndex = from.getMonth() + 1;
  const year = from.getFullYear();
  // Day 0 of (targetMonth + 1) is the last day of the target month; JS Date
  // normalizes the month/year overflow for us (e.g. month index 13 → Feb).
  const lastDayOfTargetMonth = new Date(
    year,
    targetMonthIndex + 1,
    0,
  ).getDate();
  const clampedDay = Math.min(anchorDay, lastDayOfTargetMonth);
  const result = new Date(from);
  result.setMonth(targetMonthIndex, clampedDay);
  return result;
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};
