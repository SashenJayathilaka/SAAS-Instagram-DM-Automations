"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { activateAutomation } from "@/actions/automation";
import { refreshSavedAutomation } from "@/lib/automation-query-cache";
import { Download, RefreshCw, Link2, ArrowUpRight, BarChart3, Lightbulb, MessageCircleMore, MousePointerClick, SquarePen, UserRoundCheck, UsersRound } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import type { AutomationAnalytics } from "@/lib/automation-analytics";
import "./automation-analytics.css";

export default function AutomationAnalyticsView({ data, slug }: { data: AutomationAnalytics; slug: string }) {
  const [tab, setTab] = useState<"hits" | "clicks" | "follows">("hits");
  const { automation: a, totals: t } = data;
  const [active, setActive] = useState(a.active);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const [refreshing, refresh] = useTransition();
  const exportDaily = () => {
    const csv = "Date (UTC),Triggers,Unique link visitors\r\n" + data.daily.map(d => `${d.date},${d.hits},${d.clicks}`).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `ap3k-analytics-${a.id}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const queryClient = useQueryClient();
  useEffect(() => setActive(a.active), [a.active]);
  async function toggle() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const next = !active;
      const result = await activateAutomation(a.id, next);
      if (result.status === 200) {
        setActive(next);
        await refreshSavedAutomation(queryClient, a.id);
        router.refresh();
      } else setError(String(result.data));
    } catch {
      setError("Could not update this automation. Try again.");
    } finally { setBusy(false); }
  }
  const sourceLabel = a.source === "COMMENT" ? "Comment" : a.source === "STORY" ? "Story" : "Message";
  const sourceNoun = sourceLabel.toLowerCase();
  const followDescription = "Confirmed follows require a verified not-following → following change within seven days of an automation interaction. AP3K rechecks eligible contacts in the background. Existing followers and unavailable profile data are excluded; this is not your account’s total follower growth.";
  const metrics = [
    { label: "Total hits", value: t.hits.toLocaleString(), detail: `${sourceLabel} triggers received`, Icon: MessageCircleMore, explanation: "Recorded automation triggers. Duplicate webhook deliveries are counted once." },
    { label: "Click rate", value: `${t.clickRate.toFixed(1)}%`, detail: `${t.clicks.toLocaleString()} of ${t.uniqueHitRecipients.toLocaleString()} opened link`, Icon: MousePointerClick, explanation: "Unique people who opened a tracked link divided by unique people who triggered this automation." },
    { label: "Follow conversion", value: t.eligibleNonFollowers ? `${t.followRate.toFixed(1)}%` : "—", detail: `${t.eligibleNonFollowers.toLocaleString()} verified non-followers`, Icon: UsersRound, explanation: `${t.newFollowers.toLocaleString()} of ${t.eligibleNonFollowers.toLocaleString()} verified non-followers followed. ${followDescription}` },
    { label: "Confirmed follows", value: t.newFollowers.toLocaleString(), detail: "Verified by Instagram", Icon: UserRoundCheck, explanation: followDescription },
  ];
  const funnel = [
    { label: "Hits", detail: `${sourceNoun} triggers`, value: t.hits, color: "var(--aa-hits)" },
    { label: "Clicks", detail: "unique visitors", value: t.clicks, color: "var(--aa-clicks)" },
    { label: "Follows", detail: "confirmed transitions", value: t.newFollowers, color: "var(--aa-follows)" },
  ];
  const tabDescription = { hits: `Latest ${sourceNoun} triggers`, clicks: "Latest link opens", follows: "Latest new followers" };
  const hasDailyActivity = data.daily.some(day => day.hits > 0 || day.clicks > 0);
  const dateLabel = (date: string, weekday = false) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", weekday ? { weekday: "short", timeZone: "UTC" } : { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return (
    <main className="automation-analytics-page" aria-label="Automation analytics">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 pt-4 text-sm text-slate-600 dark:text-slate-300"><Link href={`/dashboard/${slug}/automation`} className="rounded-md px-1 py-2 hover:text-violet-600 dark:hover:text-violet-300">Automations</Link><span aria-hidden="true">/</span><span aria-current="page">Analytics</span></nav>
      <header className="aa-page-heading"><div><p className="aa-eyebrow">AUTOMATION PERFORMANCE</p><h1>Every interaction, in perspective.</h1><p className="aa-subtitle">All-time outcomes · Daily activity in UTC</p></div><div className="aa-heading-actions"><button type="button" disabled={refreshing} onClick={() => refresh(() => router.refresh())}><RefreshCw size={16} className={refreshing ? "animate-spin" : ""}/>{refreshing ? "Refreshing…" : "Refresh"}</button><button type="button" onClick={exportDaily}><Download size={16}/>Export chart</button></div></header>
      <section className="aa-panel aa-summary">
        {a.postThumbnail ? <img src={a.postThumbnail} alt="Automation post" className="aa-thumbnail" /> : <span className="aa-thumbnail aa-placeholder"><BarChart3 size={25} /></span>}
        <div className="aa-summary-copy">
          <div className="aa-title-row"><h2>{a.name}</h2><span className={`aa-status ${active ? "aa-status-active" : ""}`}><i />{active ? "Active" : "Paused"}</span></div>
          <p>Created {new Date(a.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })} · {a.responseCount.toLocaleString()} Auto Replies · {a.messageType ?? `${sourceLabel} automation`}</p>
        </div>
        <div className="aa-summary-actions">
          <Link aria-label="Edit automation" title="Edit automation" className="aa-edit" href={`/dashboard/${slug}/automation/new?edit=${a.id}`}><SquarePen size={23} /></Link>
          <button type="button" role="switch" aria-label="Automation active" aria-checked={active} disabled={busy} onClick={() => void toggle()} className={`aa-switch ${active ? "aa-switch-on" : ""}`}><span /></button>
        </div>
      </section>
      {error && <p role="alert" className="aa-error">{error}</p>}
      <div className="aa-metrics">
        {metrics.map(({ label, value, detail, Icon, explanation }) => <section key={label} className="aa-panel aa-metric" aria-label={label}>
          <span className="aa-metric-icon"><Icon size={21} strokeWidth={1.8} /></span>
          <h2 title={explanation}>{label}</h2><p className="aa-metric-value">{value}</p><p className="aa-metric-detail">{detail}</p>
        </section>)}
      </div>
      <div className="aa-chart-grid">
        <section className="aa-panel aa-funnel">
          <h2>Automation outcomes</h2><p className="aa-subtitle">Independent outcomes, not sequential funnel steps</p>
          <div className="aa-funnel-steps">{funnel.map(item => <div key={item.label}>
            <div className="aa-funnel-label"><i style={{ background: item.color }} /><strong>{item.label}</strong><span>{item.detail}</span><b>{item.value.toLocaleString()}</b></div>
            <div className="aa-funnel-track" role="meter" aria-label={item.label} aria-valuenow={item.value} aria-valuemin={0} aria-valuemax={Math.max(1, t.hits, item.value)}>
              <div style={{ background: item.color, width: `${t.hits ? Math.min(100, item.value / t.hits * 100) : 0}%` }} />
            </div>
          </div>)}</div>
          {!t.hits && <p className="aa-no-activity"><Lightbulb size={18} /><span>No activity yet. Once {a.source === "COMMENT" ? "comments" : a.source === "STORY" ? "story interactions" : "messages"} come in, your results appear here.</span></p>}
        </section>
        <section className="aa-panel aa-daily">
          <header className="aa-chart-header"><div><h2>Daily activity</h2><p className="aa-subtitle">Hits vs clicks over the last 7 days</p></div><div className="aa-legend"><span><i className="aa-hit-dot" />Hits</span><span><i className="aa-click-dot" />Clicks</span></div></header>
          <div className="aa-chart" role="img" aria-label="Hits and clicks over the last seven days, grouped by UTC date">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.daily} margin={{ top: 14, right: 12, left: 12, bottom: 0 }}>
                <XAxis dataKey="date" tickFormatter={value => dateLabel(value, true)} tick={{ fontSize: 12, fill: "var(--aa-faint)" }} axisLine={false} tickLine={false} tickMargin={14} interval="preserveStartEnd" minTickGap={16} />
                <YAxis hide={!hasDailyActivity} allowDecimals={false} domain={[0, "auto"]} tick={{ fontSize: 11, fill: "var(--aa-muted)" }} width={30} axisLine={false} tickLine={false} />
                <Tooltip labelFormatter={value => `${dateLabel(String(value))} · UTC`} contentStyle={{ background: "var(--aa-panel)", border: "1px solid var(--aa-border)", borderRadius: 10, color: "var(--aa-text)", fontSize: 12 }} />
                <Line name="Clicks" dataKey="clicks" stroke="var(--aa-clicks)" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line name="Hits" dataKey="hits" stroke="var(--aa-hits)" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
      <section className="aa-panel aa-links"><header className="aa-chart-header"><div><h2>Link performance</h2><p className="aa-subtitle">Up to 25 destinations · One click per recipient per destination</p></div><Link2 size={20} aria-hidden="true"/></header>
        {!data.links?.length ? <div className="aa-link-empty"><MousePointerClick size={25}/><div><strong>Your next click starts here</strong><p>Add an HTTPS link button to an automation. AP3K tracks eligible clicks automatically after delivery.</p></div></div> : <div className="aa-link-list">{data.links.map(link => <div key={link.destination} className="aa-link-row"><a href={link.destination} target="_blank" rel="noopener noreferrer" title={link.destination}>{link.destination}<ArrowUpRight size={14}/></a><div><strong>{link.clicks.toLocaleString()}</strong><span>unique clicks</span></div><div><strong>{link.recipients.toLocaleString()}</strong><span>tracked recipients</span></div></div>)}</div>}
        <p className="aa-subtitle">Destination counts begin with this tracking update. Repeat taps and known preview bots are excluded. Prepared links are not proof of delivery; use message results to verify sends.</p>
      </section>
      <details className="aa-panel aa-methodology"><summary>How clicks and followers are measured</summary><p>{followDescription}</p><p>Click rate uses unique tracked-link visitors divided by unique people who triggered this automation. Forwarded links can still be attributed to the original recipient. Destination analytics do not prove a purchase; use tagged URLs and your checkout analytics for sales.</p></details>
      <section className="aa-panel aa-countries"><h2>Clicks by country</h2><p className="aa-subtitle">Top regions opening your link</p>
        {!data.countries.length ? <p className="aa-empty aa-empty-muted">No data available</p> : <div className="aa-country-list">{data.countries.map(country => <div className="aa-country" key={country.country ?? "unknown"}>
          <span>{countryName(country.country)}</span><div className="aa-country-track"><div style={{ width: `${Math.min(100, country.clicks / Math.max(1, t.clicks) * 100)}%` }} /></div><strong>{country.clicks.toLocaleString()}</strong>
        </div>)}</div>}
      </section>
      <section className="aa-panel aa-recent">
        <header><div><h2>Recent activity</h2><p className="aa-subtitle">{tabDescription[tab]}</p></div>
          <div role="tablist" aria-label="Activity type" className="aa-tabs">{(["hits", "clicks", "follows"] as const).map((value, index, values) => <button type="button" role="tab" aria-selected={tab === value} aria-controls="automation-activity-panel" id={`automation-activity-${value}`} tabIndex={tab === value ? 0 : -1} key={value} onClick={() => setTab(value)} onKeyDown={event => {
            const next = event.key === "ArrowRight" ? (index + 1) % values.length : event.key === "ArrowLeft" ? (index + values.length - 1) % values.length : event.key === "Home" ? 0 : event.key === "End" ? values.length - 1 : -1;
            if (next < 0) return;
            event.preventDefault(); setTab(values[next]); document.getElementById(`automation-activity-${values[next]}`)?.focus();
          }}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div>
        </header>
        <div role="tabpanel" id="automation-activity-panel" aria-labelledby={`automation-activity-${tab}`} tabIndex={0}>
          {!data.recent[tab].length ? <p className="aa-empty">No data available</p> : <div className="aa-activity-list">{data.recent[tab].map(row => <div className="aa-activity" key={row.id}>
            <span className="aa-contact-icon"><UsersRound size={17} /></span><strong><bdi dir="ltr">{row.recipient}</bdi></strong><span className="aa-activity-kind">{tab === "hits" ? `${row.source === "COMMENT" ? "Comment" : row.source === "STORY" ? "Story" : "Message"} trigger` : tab === "follows" ? "New follower" : countryName(row.country ?? null)}</span><time dateTime={row.createdAt}>{new Date(row.createdAt).toLocaleString()}</time>
          </div>)}</div>}
        </div>
      </section>
      <p className="aa-tracking-note">{data.trackingStartedAt ? `Tracked activity since ${new Date(data.trackingStartedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}.` : "Tracking starts with new activity."} <span title={followDescription}>Confirmed follows are attributed to this automation.</span></p>
    </main>
  );
}
function countryName(code: string | null) {
  if (!code) return "Unknown";
  try { return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code; } catch { return code; }
}
