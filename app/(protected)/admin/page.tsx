import { redirect } from "next/navigation";

type SearchParams = Record<string, string | string[] | undefined>;

const LEGACY_TAB_ROUTES: Record<string, string> = {
  overview: "overview",
  users: "users",
  subscriptions: "billing",
  integrations: "accounts",
  campaigns: "campaigns",
  webhooks: "diagnostics",
  messages: "activity",
  meta: "system",
  compliance: "system",
  system: "system",
  danger: "system",
  audit: "audit",
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminIndex(props: { searchParams?: Promise<SearchParams> }) {
  const searchParams = await props.searchParams;
  const tab = first(searchParams?.tab);
  const userId = first(searchParams?.userId);

  // Preserve the most useful V1 deep link during the migration.
  if (tab === "users" && userId) {
    redirect(`/admin/users/${encodeURIComponent(userId)}`);
  }

  redirect(`/admin/${LEGACY_TAB_ROUTES[tab ?? ""] ?? "overview"}`);
}
