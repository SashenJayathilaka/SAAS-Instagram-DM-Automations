import type { QueryClient } from "@tanstack/react-query";

/** Editors hydrate once; an old detail result must not win a race with a refetch. */
export async function refreshSavedAutomation(queryClient: QueryClient, id: string) {
  queryClient.removeQueries({ queryKey: ["automation-info"], predicate: query => query.queryKey[2] === id });
  await queryClient.invalidateQueries({ queryKey: ["user-automation"] });
}
