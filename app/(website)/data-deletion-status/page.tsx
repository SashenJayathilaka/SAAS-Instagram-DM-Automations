import { UiText } from "@/components/i18n/localized-copy";
import { localizedMetadata } from "@/lib/i18n/page-metadata";
import type { Metadata } from "next";

const pageMetadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Data Deletion Status — AP3K",
  description: "Status page for AP3K Meta data deletion requests.",
};
export function generateMetadata(): Metadata { return localizedMetadata(pageMetadata, "/data-deletion-status"); }

type DataDeletionStatusPageProps = {
  searchParams?: Promise<{
    code?: string;
  }>;
};

export default async function DataDeletionStatusPage(props: DataDeletionStatusPageProps) {
  const searchParams = await props.searchParams;
  const code = typeof searchParams?.code === "string" ? searchParams.code : "";

  return (
    <main className="flex min-h-screen items-center justify-center bg-rf-background px-6 text-rf-text">
      <section className="max-w-xl text-center">
        <p className="ap3k-kicker"><UiText>{"Data deletion status"}</UiText></p>
        <h1 className="mt-3 text-3xl font-black tracking-tight"><UiText>{" Your data deletion request was received and processed. "}</UiText></h1>
        <p className="mt-4 text-sm leading-7 text-rf-muted"><UiText>{" AP3K has processed the Meta data deletion callback for this request. No further action is required. "}</UiText></p>
        {code ? (
          <p className="mt-6 break-all rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-xs text-rf-muted"><UiText>{" Confirmation code: "}</UiText><span className="font-bold text-rf-text">{code}</span>
          </p>
        ) : null}
      </section>
    </main>
  );
}
