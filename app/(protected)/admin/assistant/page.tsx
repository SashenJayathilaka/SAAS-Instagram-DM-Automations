import Link from "next/link";
import { AdminPageHeader } from "@/components/admin-v2/page-header";
import { AssistantPanel } from "@/components/admin-v2/assistant-panel";
import { requireOwnerAdmin } from "@/lib/admin";
export default async function AssistantPage() {
  await requireOwnerAdmin();
  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Decision support"
        title="AI assistant"
        description="Turn aggregate product signals into priorities. Keep every publishing and operational decision in your hands."
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <AssistantPanel />
        <div className="space-y-5">
          <div className="admin-panel">
            <h2 className="font-semibold">Editorial copilot</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground dark:text-slate-400">
              Open any draft to get search-title ideas, a meta description,
              content gaps and claims to verify.
            </p>
            <Link
              href="/admin/content"
              className="mt-4 inline-block text-sm text-violet-700 dark:text-violet-300"
            >
              Review an article →
            </Link>
          </div>
          <div className="admin-panel">
            <h2 className="font-semibold">Safe by design</h2>
            <ul className="mt-3 list-disc space-y-2 pl-4 text-sm leading-6 text-muted-foreground dark:text-slate-400">
              <li>No customer DMs, emails, API keys or tokens are sent.</li>
              <li>
                No automatic publishing, billing changes or campaign actions.
              </li>
              <li>Requests are rate-limited and audited.</li>
              <li>AI suggestions can be wrong. Verify before acting.</li>
            </ul>
            <Link
              href="/admin/system"
              className="mt-4 inline-block text-sm text-violet-700 dark:text-violet-300"
            >
              Manage AI provider →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
