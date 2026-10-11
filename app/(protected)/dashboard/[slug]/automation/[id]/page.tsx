import { redirect } from "next/navigation";

// Existing automation detail links open the account-scoped analytics page.
export default async function LegacyAutomationPage(props: { params: Promise<{ slug: string; id: string }> }) {
  const params = await props.params;
  redirect(`/dashboard/${encodeURIComponent(params.slug)}/automation/${encodeURIComponent(params.id)}/analytics`);
}
