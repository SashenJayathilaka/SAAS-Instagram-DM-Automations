import InboxClient from "@/components/dashboard/inbox-client";

export const metadata = { title: "Inbox | AP3K" };

export default async function InboxPage(props: { searchParams?: Promise<{ conversation?: string }> }) {
  const searchParams = await props.searchParams;
  return <InboxClient initialConversationId={searchParams?.conversation} />;
}
