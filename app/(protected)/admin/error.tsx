"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="admin-panel max-w-2xl space-y-4" role="alert">
      <h1 className="text-xl font-semibold">This workspace couldn’t load.</h1>
      <p className="text-sm leading-6 text-muted-foreground dark:text-slate-400">
        An admin request did not complete. Retry, or return to the overview. If
        a save was interrupted, reopen the article and check its latest revision
        before retrying.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/admin/overview">Back to overview</Link>
        </Button>
      </div>
    </section>
  );
}
