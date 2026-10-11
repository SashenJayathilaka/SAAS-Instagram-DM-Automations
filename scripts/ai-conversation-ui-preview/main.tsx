// UI verification fixture only. The build mocks all network actions.
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import AiConversationBuilder from "@/components/automations/ai-conversation-builder";
import { DEFAULT_AI_CONVERSATION } from "@/lib/ai-conversation";
function Preview() {
 const [dark,setDark]=useState(true);
 return <div className={dark ? "dark" : ""}><main className="min-h-screen bg-slate-100 p-4 dark:bg-[#070a12] sm:p-6"><header className="mb-5 flex items-center justify-between text-slate-950 dark:text-white"><strong>AP3K · AI conversations</strong><button className="rounded-xl border border-slate-300 px-4 py-2 text-sm dark:border-white/20" onClick={()=>setDark(!dark)}>{dark ? "Light mode" : "Dark mode"}</button></header><AiConversationBuilder slug="preview" integrationId="fixture" accountName="yourbrand" automation={{name:"Ceptice prompt assistant",listener:{aiConversation:{...DEFAULT_AI_CONVERSATION,goal:"Help creators find the right AI prompts and guide them to Ceptice.",context:"Ceptice is a library of AI prompts. Customers can explore portrait, product and cinematic prompt collections at https://ceptice.com. Ask which type of image they want to create. Never claim to retrieve a specific prompt without its text."}}}} /></main></div>;
}
createRoot(document.getElementById('root')!).render(<Preview />);
