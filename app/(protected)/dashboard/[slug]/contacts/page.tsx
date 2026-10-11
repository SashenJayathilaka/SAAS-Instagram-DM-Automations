import { getInstagramContacts } from "@/actions/inbox";
import ContactsClient from "@/components/dashboard/contacts-client";

export const metadata = { title: "Contacts | AP3K" };

export default async function ContactsPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const result = await getInstagramContacts();
  const contacts = result.status === 200 && Array.isArray(result.data) ? result.data : [];
  return <ContactsClient slug={params.slug} contacts={contacts} canExport={result.canExport} />;
}
