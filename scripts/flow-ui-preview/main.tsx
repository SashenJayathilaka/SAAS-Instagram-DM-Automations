// Isolated fixture with sample data; server actions are replaced by build-time mocks.
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import AutomationTypePicker from "@/components/automations/automation-type-picker";
import FlowBuilder from "@/components/automations/flow-builder";
import AiConversationBuilder from "@/components/automations/ai-conversation-builder";
function App() {
  const [dark, setDark] = useState(true);
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);
  const query = new URLSearchParams(window.location.search);
  const type = query.get("type");
  return <div className="min-h-screen bg-slate-100 text-slate-950 dark:bg-[#080b13] dark:text-white">
    <header className="flex flex-wrap items-center justify-between gap-3 p-3 text-xs">
      <strong>AP3K · isolated design preview</strong>
      <div className="flex flex-wrap gap-4"><button onClick={() => setDark(!dark)}>{dark ? "Light mode" : "Dark mode"}</button><a href={window.location.pathname}>Templates</a></div>
    </header>
    <div className="mx-auto min-w-0 p-2 sm:p-4">
      {type === "ai" ? <AiConversationBuilder slug="sample" integrationId="12345678-1234-1234-1234-123456789012" accountName="sample" /> : type ? <FlowBuilder slug="sample" integrationId="12345678-1234-1234-1234-123456789012" templateId={query.get("template") ?? undefined} plan="PRO" refreshPosts={() => {}} /> : <AutomationTypePicker slug="sample" />}
    </div>
  </div>;
}
createRoot(document.getElementById("root")!).render(<App />);
