"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, RotateCcw, Send } from "lucide-react";
import {
  branchTarget,
  responseTarget,
  resolveFlowText,
  type Flow,
  type FlowNode,
  type FlowValues,
} from "@/lib/automation-flow/definition";
import { previewFlowAction } from "@/lib/automation-flow/action-preview";
import EditorPreview, { type EditorPreviewMode } from "./editor-preview";
import InstagramPreviewMessage from "./instagram-preview-message";
import type { FlowTrigger } from "@/lib/automation-flow/triggers";
import styles from "./editor-preview.module.css";
export type FlowPreviewBubble = {
  text: string;
  incoming?: boolean;
  image?: string;
  links?: { label: string; url: string }[];
  options?: string[];
  notice?: boolean;
  cards?: {
    title: string;
    subtitle: string;
    image: string;
    links: { label: string; url: string }[];
  }[];
};
type Bubble = FlowPreviewBubble;
export function advanceFlowPreview(
  flow: Flow,
  start: string | null,
  data: FlowValues,
  history: Bubble[],
  draw = 0.001,
) {
  let id = start;
  const messages = [...history];
  let values = { ...data };
  let waiting: FlowNode | null = null;
  let error = "";
  let steps = 0;
  while (id && steps++ < 60) {
    const node = flow.nodes.find((n) => n.id === id);
    if (!node) {
      error = "Connect this branch to an existing step.";
      break;
    }
    if (node.kind === "end") {
      id = null;
      break;
    }
    if (
      node.kind === "tag" ||
      node.kind === "setfield" ||
      node.kind === "webhook"
    ) {
      const action = previewFlowAction(node, values)!;
      if (action.error) {
        error = action.error;
        break;
      }
      values = action.values;
      if (action.notice) messages.push({ text: action.notice, notice: true });
      id = action.next;
      continue;
    }
    if (node.kind === "random" || node.kind === "condition") {
      id = branchTarget(node, values, draw);
      continue;
    }
    if (node.kind === "delay") {
      messages.push({
        text: `Scheduled wait: ${formatDelay(node.seconds)}. Use Continue preview to skip this wait in the simulation.`,
        notice: true,
      });
      waiting = node;
      break;
    }
    messages.push({
      text:
        resolveFlowText(node.text, values) +
        (node.kind === "product" && node.subtitle
          ? `\n${resolveFlowText(node.subtitle, values)}`
          : ""),
      image: node.kind === "product" ? node.image : undefined,
      links: "links" in node ? node.links : undefined,
      options:
        node.kind === "question" ? node.options.map((o) => o.label) : undefined,
      cards:
        node.kind === "carousel"
          ? node.cards.map((card) => ({
              ...card,
              title: resolveFlowText(card.title, values),
              subtitle: resolveFlowText(card.subtitle, values),
            }))
          : undefined,
    });
    if (
      node.kind === "email" ||
      node.kind === "phone" ||
      node.kind === "capture" ||
      node.kind === "question"
    ) {
      waiting = node;
      break;
    }
    id = node.next;
  }
  if (id && !waiting && !error)
    error =
      "Preview stopped after 60 steps. Check the flow for an automatic loop.";
  return { messages, values, waiting, error, ended: !id };
}
function formatDelay(seconds: number) {
  if (seconds % 86400 === 0)
    return `${seconds / 86400} day${seconds === 86400 ? "" : "s"}`;
  if (seconds % 3600 === 0)
    return `${seconds / 3600} hour${seconds === 3600 ? "" : "s"}`;
  if (seconds % 60 === 0)
    return `${seconds / 60} minute${seconds === 60 ? "" : "s"}`;
  return `${seconds} second${seconds === 1 ? "" : "s"}`;
}
/** Match publishing: comments require an opener; a single-choice entry supplies its own. */
export function needsSeparateFlowOpening(
  flow: Flow,
  source: "COMMENT" | "DM" | "STORY",
) {
  const entry = flow.nodes.find((node) => node.id === flow.entry);
  return (
    source === "COMMENT" &&
    !(entry?.kind === "question" && entry.options.length === 1)
  );
}
export default function FlowPreview({
  flow,
  triggers = [],
  publicReply = "",
  opening = "",
  openingButton = "Continue",
  username,
  avatar,
  embedded = false,
}: {
  flow: Flow;
  triggers?: FlowTrigger[];
  publicReply?: string;
  opening?: string;
  openingButton?: string;
  username?: string | null;
  avatar?: string | null;
  embedded?: boolean;
}) {
  const [triggerId, setTriggerId] = useState(triggers[0]?.id ?? "");
  const trigger = triggers.find((t) => t.id === triggerId) ?? triggers[0];
  const source = trigger?.source ?? "DM";
  const openingEnabled = needsSeparateFlowOpening(flow, source);
  const [mode, setMode] = useState<EditorPreviewMode>(
    source === "COMMENT" ? "post" : "dm",
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const [openingPending, setOpeningPending] = useState(openingEnabled);
  const initialValues = { username: "username", first_name: "Alex" };
  const [messages, setMessages] = useState<Bubble[]>([]);
  const [waiting, setWaiting] = useState<FlowNode | null>(null);
  const [values, setValues] = useState<FlowValues>({});
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [draw, setDraw] = useState(0.001);
  const [ended, setEnded] = useState(false);

  const [simulated, setSimulated] = useState<FlowValues>({
    _followsBusiness: "false",
    _businessFollows: "false",
    _verified: "false",
    _linkClicked: "false",
    _followerCount: "0",
  });
  function restart() {
    setInput("");
    setError("");
    setValues(initialValues);
    setOpeningPending(openingEnabled);
    if (openingEnabled) {
      setMessages([
        {
          text: resolveFlowText(opening, initialValues),
          options: [openingButton || "Continue"],
        },
      ]);
      setWaiting(null);
      setEnded(false);
    } else advance(flow.entry, initialValues, []);
  }
  useEffect(() => {
    restart();
  }, [flow, opening, openingButton, openingEnabled, draw]);
  useEffect(() => {
    if (source !== "COMMENT") setMode("dm");
  }, [source]);
  useEffect(() => {
    const box = scrollRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [messages, mode]);
  function advance(start: string | null, data: FlowValues, history: Bubble[]) {
    const vars = { ...data };
    for (const key of Object.keys(simulated)) {
      delete vars[key];
      if (simulated[key] !== "" && simulated[key] !== undefined)
        vars[key] = simulated[key];
    }
    const next = advanceFlowPreview(flow, start, vars, history, draw);

    setMessages(next.messages);
    setValues(next.values);
    setWaiting(next.waiting);
    setError(next.error);
    setEnded(next.ended);
  }
  function reply(text: string) {
    if (!text.trim()) return;
    if (/^stop$/i.test(text.trim())) {
      setMessages([...messages, { text, incoming: true }]);
      setOpeningPending(false);
      setWaiting(null);
      setEnded(true);
      setInput("");
      setError("");
      return;
    }
    if (openingPending) {
      setOpeningPending(false);
      setInput("");
      advance(flow.entry, initialValues, [
        ...messages,
        { text, incoming: true },
      ]);
      return;
    }
    if (!waiting || waiting.kind === "delay" || !text.trim()) return;
    const out = [...messages, { text, incoming: true }];
    setInput("");
    const result = responseTarget(waiting, text);
    if (!result) {
      setError(
        waiting.kind === "email"
          ? "Use a valid email, SKIP, or STOP."
          : waiting.kind === "phone"
            ? "Use a valid phone number, SKIP, or STOP."
            : waiting.kind === "capture"
              ? "Write an answer under 1,001 characters, SKIP, or STOP."
              : "Choose one of the listed answers, or reply STOP.",
      );
      return;
    }
    advance(result.next, { ...values, ...result.values }, out);
  }
  const canReply =
    openingPending || Boolean(waiting && waiting.kind !== "delay");
  const interaction =
    source === "STORY"
      ? trigger?.storyTrigger === "MENTION"
        ? "Mentioned you in their story"
        : trigger?.storyTrigger === "REACTION"
          ? "Reacted to your story"
          : "Replied to your story"
      : trigger?.sharedPost
        ? "Shared a post or Reel with you"
        : source === "COMMENT"
          ? "Replied to your comment"
          : trigger?.keyword
            ? `Sent “${trigger.keyword}”`
            : "Sent you a message";
  return (
    <section className={`mx-auto w-full min-w-0 max-w-[300px] ${embedded ? "flex h-full min-h-0 flex-col" : ""}`}>
      {triggers.length > 1 && (
        <label className="mb-3 block text-xs text-slate-500 light:text-slate-600 dark:text-slate-400">
          Preview trigger
          <select
            aria-label="Preview trigger"
            className="flow-editor-input"
            value={trigger?.id}
            onChange={(e) => {
              setTriggerId(e.target.value);
              setMode(
                triggers.find((t) => t.id === e.target.value)?.source ===
                  "COMMENT"
                  ? "post"
                  : "dm",
              );
              restart();
            }}
          >
            {triggers.map((t, i) => (
              <option key={t.id} value={t.id}>
                {i + 1}.{" "}
                {t.source === "COMMENT"
                  ? "Post comment"
                  : t.source === "STORY"
                    ? "Story interaction"
                    : "Direct message"}
                {t.keyword ? ` · ${t.keyword}` : ""}
              </option>
            ))}
          </select>
        </label>
      )}
      <EditorPreview
        postPlaceholder={
          trigger?.postScope === "next" && !trigger.post?.media
            ? "Your next published post or Reel"
            : undefined
        }
        className={embedded ? styles.embeddedPreview : styles.interactivePreview}
        username={username}
        avatar={avatar}
        source={source}
        mode={mode}
        onModeChange={setMode}
        interaction={interaction}
        messagesRef={scrollRef}
        data={{
          post:
            trigger?.post ??
            (trigger?.postScope === "all"
              ? { postid: "ANY", media: "", mediaType: "IMAGE" }
              : null),
          keywords: trigger?.keyword ? [trigger.keyword] : [],
          triggerMode: trigger?.anyMessage ? "ANY_COMMENT" : "SPECIFIC_KEYWORD",
          publicReplyEnabled: Boolean(publicReply),
          commentReplies: [publicReply],
          sendPrivateDm: true,
        }}
        toolbar={
          <button
            type="button"
            aria-label="Restart preview"
            title="Restart preview"
            onClick={restart}
          >
            <RotateCcw size={15} />
          </button>
        }
        conversation={
          <>
            {messages.map((message, index) => (
              <InstagramPreviewMessage
                key={index}
                {...message}
                avatar={avatar}
                username={username}
                onReply={
                  index === messages.length - 1 && canReply ? reply : undefined
                }
                onLink={() =>
                  setSimulated((v) => ({ ...v, _linkClicked: "true" }))
                }
              />
            ))}
            {simulated._linkClicked === "true" && (
              <p role="status" className={styles.interaction}>
                Link click recorded in this preview.
              </p>
            )}
            {error && (
              <p
                role="alert"
                className="text-xs text-red-600 dark:text-red-300"
              >
                {error}
              </p>
            )}
            {!messages.length && !error && (
              <p className={styles.interaction}>
                Add a message to see your conversation here.
              </p>
            )}
            {waiting?.kind === "delay" && (
              <div className="space-y-2 text-center">
                {waiting.seconds >= 86400 && (
                  <p className="text-[10px] text-amber-700 dark:text-amber-300">
                    A live follow-up may expire outside Instagram&apos;s
                    messaging window.
                  </p>
                )}
                <button
                  type="button"
                  className={styles.button}
                  onClick={() => advance(waiting.next, values, messages)}
                >
                  Continue preview
                </button>
                <button
                  type="button"
                  className="p-2 text-xs text-slate-500 light:text-slate-600 dark:text-slate-400"
                  onClick={() => {
                    setWaiting(null);
                    setEnded(true);
                  }}
                >
                  Stop preview
                </button>
              </div>
            )}
            {ended && <p className={styles.interaction}>Flow finished</p>}
          </>
        }
        composer={
          <form
            className={styles.composer}
            onSubmit={(e) => {
              e.preventDefault();
              reply(input);
            }}
          >
            <span className={styles.camera}>
              <Camera size={15} />
            </span>
            <span className={styles.composerInput}>
              <input
                aria-label="Preview reply"
                className={styles.replyInput}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={!canReply}
                placeholder={
                  waiting?.kind === "delay"
                    ? "Skip the wait to continue"
                    : ended
                      ? "Preview finished"
                      : "Message…"
                }
              />
            </span>
            <button
              type="submit"
              aria-label="Send preview reply"
              className={styles.sendReply}
              disabled={!canReply || !input.trim()}
            >
              <Send size={16} />
            </button>
          </form>
        }
      />
      {flow.nodes.some((n) => n.kind === "random") && (
        <label className="mt-4 block text-sm">
          Test a random path
          <select
            value={draw}
            onChange={(e) => {
              setDraw(Number(e.target.value));
            }}
            className="ap3k-input mt-2 w-full rounded-xl p-2"
          >
            <option value={0.001}>Path A (low draw)</option>
            <option value={0.999}>Path B (high draw)</option>
          </select>
        </label>
      )}
      <p className="sr-only">Preview only; nothing is sent to Instagram.</p>
    </section>
  );
}
