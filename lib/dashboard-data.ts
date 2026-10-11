import { cache } from "react";
import { onUserInfo } from "@/actions/user";

// Deduplicate layout/page reads only within one server render. Never share
// authenticated profile or selected-account data across requests or users.
export const getDashboardUser = cache(onUserInfo);
