import { CreditCard, Gift, Home, Inbox, Settings, Sparkles, UsersRound, Workflow } from "lucide-react";

export const PRIMARY_NAVIGATION = [
  { icon: Home, label: "Home", messageKey: "home", segment: "" },
  { icon: UsersRound, label: "Contacts", messageKey: "contacts", segment: "contacts" },
  { icon: Workflow, label: "Automations", messageKey: "automations", segment: "automation" },
  { icon: Sparkles, label: "AP3K AI", messageKey: "aiAssistant", segment: "ai" },
  { icon: Inbox, label: "Inbox", messageKey: "inbox", segment: "inbox" },
  { icon: CreditCard, label: "Billing", messageKey: "billing", segment: "billing" },
  { icon: Gift, label: "Refer & earn", messageKey: "referrals", segment: "referrals" },
  { icon: Settings, label: "Settings", messageKey: "settings", segment: "settings" },
] as const;

export function primaryNavigationHref(slug: string, segment: string) {
  return `/dashboard/${slug}${segment ? `/${segment}` : ""}`;
}
