import type { GroupedActivity, RecentActivityItem } from "@/lib/campaign-activity-format";
import { customerReplyCopy } from "@/lib/customer-reply-copy";

export function customerGroupedActivity(item: GroupedActivity): GroupedActivity {
  return {
    ...item,
    title: customerReplyCopy(item.title),
    subtitle: customerReplyCopy(item.subtitle),
    details: {
      ...item.details,
      ...(item.details.visibilityHelper
        ? { visibilityHelper: customerReplyCopy(item.details.visibilityHelper) }
        : {}),
      ...(item.details.error ? { error: customerReplyCopy(item.details.error) } : {}),
    },
  };
}

export function customerGroupedActivities(items: GroupedActivity[]) {
  return items.map(customerGroupedActivity);
}

export function customerRecentActivity(item: RecentActivityItem): RecentActivityItem {
  return {
    ...item,
    title: customerReplyCopy(item.title),
    subtitle: customerReplyCopy(item.subtitle),
  };
}
