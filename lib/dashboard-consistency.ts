export type DashboardEmptyState = {
  title: string;
  hasHistoricalData: boolean;
};

export function getLeadEmptyState(
  periodLeadCount: number,
  lifetimeLeadCount: number
): DashboardEmptyState | null {
  if (periodLeadCount > 0) return null;

  return lifetimeLeadCount > 0
    ? { title: "No leads captured in this period", hasHistoricalData: true }
    : { title: "No leads captured yet", hasHistoricalData: false };
}

export function getActivityEmptyState(
  periodActivityCount: number,
  lifetimeActivityCount: number
): DashboardEmptyState | null {
  if (periodActivityCount > 0) return null;

  return lifetimeActivityCount > 0
    ? { title: "No activity in this period", hasHistoricalData: true }
    : { title: "No activity yet", hasHistoricalData: false };
}

export function isActivityInPeriod(
  createdAt: Date | string,
  periodStart: Date,
  periodEnd: Date
) {
  const timestamp = new Date(createdAt).getTime();
  return timestamp >= periodStart.getTime() && timestamp < periodEnd.getTime();
}
