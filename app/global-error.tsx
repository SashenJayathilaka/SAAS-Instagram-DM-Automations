"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(
      JSON.stringify({
        level: "error",
        message: "AP3K global render failure",
        digest: error.digest,
        error: error.message,
      }),
    );
  }, [error]);

  return (
    <html lang="en">
      <head>
        <meta name="robots" content="noindex, nofollow" />
        <title>AP3K — Please try again</title>
      </head>
      <body className="grid min-h-screen place-items-center bg-[#090A10] px-5 text-white">
        <main className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#111320] p-7 text-center shadow-2xl">
          <div data-nosnippet>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-300">
              AP3K
            </p>
            <h1 className="mt-3 text-2xl font-black">Something went wrong</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Your data is safe. Try this page again, or contact
              support@ap3k.com if the problem continues.
            </p>
            <button
              type="button"
              onClick={reset}
              className="ap3k-gradient-button mt-6 min-h-11 w-full px-5 text-sm"
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
