import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "@/app/globals.css";
import "@/app/(protected)/admin/admin.css";
import { ThemeProvider } from "next-themes";
import Users from "@/app/(protected)/ap3k-admin-v2/users/page";
import Campaigns from "@/app/(protected)/ap3k-admin-v2/campaigns/page";
import Overview from "@/app/(protected)/admin/overview/page";
import { AdminV2Nav } from "@/components/admin-v2/nav";
import { EditorialEditor } from "@/components/admin-v2/editorial-editor";
import { BLOG_POSTS } from "@/lib/blog";

const params = new URLSearchParams(location.search);
function Gallery() {
  const [width, setWidth] = useState(1440);
  const [page, setPage] = useState("overview");
  return <div style={{ padding: 16, background: "#202431", minHeight: "100vh", color: "white", fontFamily: "system-ui" }}>
    <header style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", marginBottom: 16 }}>
      <strong>UI fixture · sample data only</strong>
      <label>Viewport <select aria-label="Preview width" value={width} onChange={e => setWidth(Number(e.target.value))} style={{ color: "black" }}>{[375, 768, 1440].map(w => <option key={w}>{w}</option>)}</select></label>
      <label>Workspace <select aria-label="Preview workspace" value={page} onChange={e => setPage(e.target.value)} style={{ color: "black" }}><option value="overview">Overview</option><option value="editor">Editor</option><option value="users">Users</option><option value="automations">Automations</option></select></label>
    </header>
    <iframe title="Admin responsive preview" src={`${location.pathname}?frame=1&page=${page}`} style={{ border: "1px solid #343c50", width, height: 1000, background: "#0b0e16" }} />
  </div>;
}
async function start() {
  const content = params.get("page") === "editor" ? <EditorialEditor initial={BLOG_POSTS[0]} version={0} existing={true}/> : params.get("page") === "users" ? await Users({}) : params.get("page") === "automations" ? await Campaigns({}) : await Overview();
  createRoot(document.getElementById("root")!).render(<ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} forcedTheme={params.get("theme") || undefined}>{params.has("frame") ? <div className="admin-shell min-h-screen bg-background text-foreground"><AdminV2Nav environment="UI fixture"/><main className="admin-main lg:pl-[248px]"><div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">{content}</div></main></div> : <Gallery/>}</ThemeProvider>);
}
void start();
