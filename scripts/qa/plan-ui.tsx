// Isolated UI fixture; all actions are mocked in the build script.
import React from "react";
import { createRoot } from "react-dom/client";
import AutomationTable from "@/components/dashboard/automation-table";
import { PLAN_PAUSE_MESSAGES } from "@/lib/automation-plan-policy";
const params = new URLSearchParams(window.location.search);
document.documentElement.classList.toggle("dark", params.get("theme") === "dark");
const rows = [
  { id: "active", name: "Summer guide delivery", active: true, createdAt: "2026-10-11", listener: { prompt: "Your guide", dmCount: 24 } },
  { id: "limit", name: "Product recommendations", active: false, reviewReason: PLAN_PAUSE_MESSAGES.limit, createdAt: "2026-10-10", listener: { prompt: "Here is the link" } },
  { id: "features", name: "Collect email and deliver the guide", active: false, reviewReason: PLAN_PAUSE_MESSAGES.features, createdAt: "2026-10-09", listener: { prompt: "Your email?", emailCaptureEnabled: true } },
].map(a => ({...a, source: "COMMENT", triggerMode: "ANY_COMMENT", keywords: [], posts: [{ postid: "ANY" }], _count: { leads: 3 } }));
createRoot(document.getElementById("root")!).render(<main className="min-h-screen bg-slate-50 p-3 text-slate-950 dark:bg-[#080b13] dark:text-white sm:p-6"><div className="mb-4"><p className="text-xs font-semibold text-violet-600 dark:text-violet-300">AP3K · isolated test data</p><h1 className="mt-1 text-2xl font-bold">Automations</h1></div><AutomationTable slug="test-only" automations={rows}/></main>);
