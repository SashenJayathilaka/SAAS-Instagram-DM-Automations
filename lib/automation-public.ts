/** The editor needs automation fields, never the joined owner's credentials. */
export function publicAutomation<T extends { User?: unknown }>(automation: T): Omit<T, "User"> {
  const { User: _owner, ...result } = automation;
  return result;
}
