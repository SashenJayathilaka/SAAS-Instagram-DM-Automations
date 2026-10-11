import { describe, expect, it } from "vitest";
import {
  getActivityEmptyState,
  getLeadEmptyState,
  isActivityInPeriod,
} from "@/lib/dashboard-consistency";

describe("dashboard period and lifetime consistency", () => {
  it("labels zero period and zero lifetime leads as never captured", () => {
    expect(getLeadEmptyState(0, 0)).toEqual({
      title: "No leads captured yet",
      hasHistoricalData: false,
    });
  });

  it("labels zero period and positive lifetime leads as outside this period", () => {
    expect(getLeadEmptyState(0, 2)).toEqual({
      title: "No leads captured in this period",
      hasHistoricalData: true,
    });
  });

  it("does not return a lead empty state when this period has leads", () => {
    expect(getLeadEmptyState(1, 2)).toBeNull();
  });

  it("labels zero period and zero lifetime activity as never recorded", () => {
    expect(getActivityEmptyState(0, 0)).toEqual({
      title: "No activity yet",
      hasHistoricalData: false,
    });
  });

  it("labels historical activity outside the selected period accurately", () => {
    expect(getActivityEmptyState(0, 12)).toEqual({
      title: "No activity in this period",
      hasHistoricalData: true,
    });
  });

  it("does not return an activity empty state when this period has activity", () => {
    expect(getActivityEmptyState(1, 12)).toBeNull();
  });

  it("uses an inclusive start and exclusive end for activity periods", () => {
    const start = new Date("2026-07-01T00:00:00Z");
    const end = new Date("2026-08-01T00:00:00Z");

    expect(isActivityInPeriod(start, start, end)).toBe(true);
    expect(isActivityInPeriod("2026-07-31T23:59:59Z", start, end)).toBe(true);
    expect(isActivityInPeriod(end, start, end)).toBe(false);
  });
});
