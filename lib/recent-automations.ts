type DatedAutomation = { createdAt?: string | Date | null };

const createdTime = ({ createdAt }: DatedAutomation) => {
  const time = createdAt ? new Date(createdAt).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
};

/** Sort the entire result before limiting the dashboard preview. */
export function recentAutomations<T extends DatedAutomation>(rows: readonly T[], limit = 5): T[] {
  return [...rows].sort((a, b) => createdTime(b) - createdTime(a)).slice(0, limit);
}
