import { dashboardPath } from "./dashboard";

export function getAuthenticatedHomeRedirect(
  pathname: string,
  userId: string | null | undefined
) {
  return pathname === "/" && userId ? dashboardPath(userId) : null;
}
