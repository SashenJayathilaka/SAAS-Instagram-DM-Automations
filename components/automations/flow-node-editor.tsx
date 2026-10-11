"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Flow, FlowNode } from "@/lib/automation-flow/definition";
import { edges } from "@/lib/automation-flow/definition";
import ProductCardEditor from "./product-card-editor";
export const NODE_NAMES: Record<FlowNode["kind"], string> = {
  message: "Send message",
  product: "Product card",
  carousel: "Product carousel",
  email: "Collect email",
  phone: "Collect phone",
  capture: "Collect information",
  question: "Message with buttons",
  delay: "Delay",
  condition: "Conditions",
  random: "Randomizer",
  tag: "Contact tag",
  webhook: "External request / Zapier",
  setfield: "Set custom field",
  end: "Finish",
};
export function newFlowNode(kind: FlowNode["kind"], index: number): FlowNode {
  const base = {
    id: `step_${crypto.randomUUID().slice(0, 8)}`,
    label: NODE_NAMES[kind],
    x: 580 + (index % 3) * 410,
    y: 160 + Math.floor(index / 3) * 260,
  };
  const next = null;
  switch (kind) {
    case "message":
      return { ...base, kind, text: "", links: [], next };
    case "product":
      return {
        ...base,
        kind,
        text: "",
        subtitle: "",
        image: "",
        links: [{ label: "View product", url: "" }],
        next,
      };
    case "carousel":
      return {
        ...base,
        kind,
        text: "",
        cards: [
          {
            title: "",
            subtitle: "",
            image: "",
            links: [{ label: "View product", url: "" }],
          },
        ],
        next,
      };
    case "email":
    case "phone":
      return {
        ...base,
        kind,
        text:
          kind === "email"
            ? "What’s your email address?"
            : "What’s your contact number?",
        next,
        skip: null,
      };
    case "capture":
      return {
        ...base,
        kind,
        text: "What’s your name?",
        field: "name",
        next,
        skip: null,
      };
    case "question":
      return {
        ...base,
        kind,
        text: "",
        field: "answer",
        options: [{ label: "Continue", next }],
      };
    case "delay":
      return { ...base, kind, seconds: 10, next };
    case "condition":
      return {
        ...base,
        kind,
        field: "_followsBusiness",
        equals: "true",
        operator: "eq",
        yes: null,
        no: null,
      };
    case "random":
      return { ...base, kind, percent: 50, yes: null, no: null };
    case "tag":
      return { ...base, kind, tag: "interested", next };
    case "webhook":
      return {
        ...base,
        kind,
        url: "",
        body: JSON.stringify({ email: "{{email}}", name: "{{name}}" }, null, 2),
        next,
      };
    case "setfield":
      return { ...base, kind, field: "interest", value: "", next };
    case "end":
      return { ...base, kind };
  }
}
import { connectFlow } from "@/lib/automation-flow/connections";
export { connectFlow } from "@/lib/automation-flow/connections";
const input =
  "mt-2 w-full rounded-xl border border-slate-200 light:border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-500 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-100";
export default function FlowNodeEditor({
  node,
  flow,
  onChange,
}: {
  node: FlowNode;
  flow: Flow;
  onChange: (flow: Flow) => void;
}) {
  const update = (patch: Record<string, unknown>) =>
    onChange({
      ...flow,
      nodes: flow.nodes.map((n) =>
        n.id === node.id ? ({ ...n, ...patch } as FlowNode) : n,
      ),
    });
  return (
    <div className="space-y-5 p-5">
      <label className="block text-xs font-semibold text-slate-500 light:text-slate-600 dark:text-slate-400">
        Step name
        <input
          value={node.label}
          maxLength={80}
          onChange={(e) => update({ label: e.target.value })}
          className={input}
        />
      </label>
      {[
        "message",
        "question",
        "email",
        "phone",
        "capture",
        "product",
        "carousel",
      ].includes(node.kind) && (
        <label className="block text-xs font-semibold text-slate-500 light:text-slate-600 dark:text-slate-400">
          Message type
          <select
            className={input}
            value={node.kind}
            onChange={(e) => {
              const n = newFlowNode(e.target.value as FlowNode["kind"], 0);
              onChange({
                ...flow,
                nodes: flow.nodes.map((old) =>
                  old.id === node.id
                    ? { ...n, id: old.id, x: old.x, y: old.y }
                    : old,
                ),
              });
            }}
          >
            {[
              "message",
              "question",
              "product",
              "carousel",
              "email",
              "phone",
              "capture",
            ].map((k) => (
              <option value={k} key={k}>
                {NODE_NAMES[k as FlowNode["kind"]]}
              </option>
            ))}
          </select>
        </label>
      )}
      {"text" in node && node.kind !== "product" && (
        <label className="block text-sm font-medium">
          Message
          <textarea
            dir="auto"
            rows={5}
            maxLength={node.kind === "message" ? 1000 : 800}
            value={node.text}
            placeholder="Enter your message here"
            onChange={(e) => update({ text: e.target.value })}
            className={input}
          />
          <span className="mt-1 block text-right text-[11px] text-slate-500 light:text-slate-600 dark:text-slate-400">
            {node.text.length} characters
          </span>
        </label>
      )}
      {node.kind === "message" && (
        <div className="space-y-3">
          {node.links.map((l, i) => (
            <div key={i} className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Link {i + 1}</span>
                <button
                  aria-label={`Remove link ${i + 1}`}
                  onClick={() =>
                    update({ links: node.links.filter((_, j) => i !== j) })
                  }
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <input
                aria-label={`Button label ${i + 1}`}
                placeholder="Button text"
                maxLength={20}
                value={l.label}
                onChange={(e) =>
                  update({
                    links: node.links.map((x, j) =>
                      i === j ? { ...x, label: e.target.value } : x,
                    ),
                  })
                }
                className={input}
              />
              <input
                aria-label={`Link URL ${i + 1}`}
                type="url"
                placeholder="https://yourwebsite.com"
                value={l.url}
                onChange={(e) =>
                  update({
                    links: node.links.map((x, j) =>
                      i === j ? { ...x, url: e.target.value } : x,
                    ),
                  })
                }
                className={input}
              />
            </div>
          ))}
          {node.links.length < 3 && (
            <button
              className="flex items-center gap-2 text-xs font-semibold text-violet-600 dark:text-violet-300"
              onClick={() =>
                update({
                  links: [...node.links, { label: "Get the link", url: "" }],
                })
              }
            >
              <Plus size={15} />
              Add link button
            </button>
          )}
        </div>
      )}
      {node.kind === "product" && (
        <ProductCardEditor
          title={node.text}
          subtitle={node.subtitle}
          imageUrl={node.image}
          linkButtons={node.links}
          onChange={(v) =>
            update({
              ...(v.title !== undefined ? { text: v.title } : {}),
              ...(v.subtitle !== undefined ? { subtitle: v.subtitle } : {}),
              ...(v.imageUrl !== undefined ? { image: v.imageUrl } : {}),
              ...(v.linkButtons ? { links: v.linkButtons } : {}),
            })
          }
        />
      )}
      {node.kind === "carousel" && (
        <div className="space-y-6">
          {node.cards.map((card, i) => (
            <div
              key={i}
              className="space-y-3 border-b border-slate-200 light:border-slate-300 pb-5 dark:border-white/10"
            >
              <div className="flex justify-between text-sm font-semibold">
                <span>
                  Card {i + 1} of {node.cards.length}
                </span>
                {node.cards.length > 1 && (
                  <button
                    aria-label={`Remove card ${i + 1}`}
                    onClick={() =>
                      update({ cards: node.cards.filter((_, j) => i !== j) })
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
              <ProductCardEditor
                title={card.title}
                subtitle={card.subtitle}
                imageUrl={card.image}
                linkButtons={card.links}
                onChange={(v) =>
                  update({
                    cards: node.cards.map((c, j) =>
                      j !== i
                        ? c
                        : {
                            ...c,
                            ...(v.title !== undefined
                              ? { title: v.title }
                              : {}),
                            ...(v.subtitle !== undefined
                              ? { subtitle: v.subtitle }
                              : {}),
                            ...(v.imageUrl !== undefined
                              ? { image: v.imageUrl }
                              : {}),
                            ...(v.linkButtons ? { links: v.linkButtons } : {}),
                          },
                    ),
                  })
                }
              />
            </div>
          ))}
          {node.cards.length < 10 && (
            <button
              onClick={() =>
                update({
                  cards: [
                    ...node.cards,
                    {
                      title: "",
                      subtitle: "",
                      image: "",
                      links: [{ label: "View product", url: "" }],
                    },
                  ],
                })
              }
              className="text-sm font-semibold text-violet-600 dark:text-violet-300"
            >
              + Add card
            </button>
          )}
        </div>
      )}
      {(node.kind === "question" ||
        node.kind === "capture" ||
        node.kind === "setfield") && (
        <label className="block text-sm font-medium">
          Save reply to field
          <input
            value={node.field}
            placeholder="contact_name"
            onChange={(e) =>
              update({ field: e.target.value.replace(/[^a-zA-Z0-9_-]/g, "") })
            }
            className={input}
          />
        </label>
      )}
      {node.kind === "setfield" && (
        <label className="block text-sm font-medium">
          Value
          <input
            value={node.value}
            onChange={(e) => update({ value: e.target.value })}
            className={input}
          />
        </label>
      )}
      {node.kind === "question" && (
        <div className="space-y-3">
          {node.options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                aria-label={`Reply button ${i + 1}`}
                value={o.label}
                maxLength={20}
                onChange={(e) =>
                  update({
                    options: node.options.map((x, j) =>
                      i === j ? { ...x, label: e.target.value } : x,
                    ),
                  })
                }
                className={input}
              />
              {node.options.length > 1 && (
                <button
                  aria-label={`Remove reply ${i + 1}`}
                  onClick={() =>
                    update({ options: node.options.filter((_, j) => i !== j) })
                  }
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
          {node.options.length < 3 && (
            <button
              className="text-xs font-semibold text-violet-600 dark:text-violet-300"
              onClick={() =>
                update({
                  options: [
                    ...node.options,
                    { label: "New choice", next: null },
                  ],
                })
              }
            >
              + Add button
            </button>
          )}
        </div>
      )}
      {node.kind === "delay" && (
        <div>
          <DelayDuration
            key={node.id}
            seconds={node.seconds}
            onChange={(seconds) => update({ seconds })}
          />
          <p className="mt-3 text-xs leading-5 text-slate-500 light:text-slate-600 dark:text-slate-400">
            The first delay up to 30 seconds runs in the background. Longer
            waits and recovery are checked every five minutes. Messages send
            only while Instagram’s reply window is open.
          </p>
        </div>
      )}
      {node.kind === "condition" && (
        <>
          <label className="block text-sm font-medium">
            Condition type
            <select
              className={input}
              value={
                [
                  "_followsBusiness",
                  "_businessFollows",
                  "_verified",
                  "_followerCount",
                  "_linkClicked",
                  "email",
                  "phone",
                ].includes(node.field)
                  ? node.field
                  : "custom"
              }
              onChange={(e) =>
                update({
                  field:
                    e.target.value === "custom"
                      ? "custom_field"
                      : e.target.value,
                })
              }
            >
              {[
                ["_followsBusiness", "If user followed me"],
                ["_businessFollows", "If business follows user"],
                ["_verified", "Verified on Instagram"],
                ["_followerCount", "Followers count"],
                ["_linkClicked", "Opened a tracked link"],
                ["email", "Contact email"],
                ["phone", "Contact phone"],
                ["custom", "Custom field"],
              ].map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          {![
            "_followsBusiness",
            "_businessFollows",
            "_verified",
            "_followerCount",
            "_linkClicked",
            "email",
            "phone",
          ].includes(node.field) && (
            <input
              aria-label="Custom field"
              value={node.field}
              onChange={(e) => update({ field: e.target.value })}
              className={input}
            />
          )}
          <label className="block text-sm font-medium">
            Match
            <select
              className={input}
              value={node.operator ?? "eq"}
              onChange={(e) => update({ operator: e.target.value })}
            >
              {[
                ["eq", "Equals"],
                ["neq", "Does not equal"],
                ["contains", "Contains"],
                ["gt", "Greater than"],
                ["lt", "Less than"],
                ["exists", "Has a value"],
              ].map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          {node.operator !== "exists" && (
            <label className="block text-sm font-medium">
              Value
              <input
                value={node.equals}
                onChange={(e) => update({ equals: e.target.value })}
                className={input}
              />
            </label>
          )}
          <p className="text-xs text-slate-500 light:text-slate-600 dark:text-slate-400">
            Instagram profile conditions are verified when this step runs.
            Unavailable profile data does not qualify.
          </p>
        </>
      )}
      {node.kind === "random" && (
        <label className="block text-sm font-medium">
          First branch probability ({node.percent}%)
          <input
            aria-label="First branch probability"
            type="range"
            min={1}
            max={99}
            value={node.percent}
            onChange={(e) => update({ percent: Number(e.target.value) })}
            className="mt-4 w-full accent-violet-600"
          />
          <span className="mt-2 block text-xs text-slate-500 light:text-slate-600">
            Second branch: {100 - node.percent}%
          </span>
        </label>
      )}
      {node.kind === "webhook" && (
        <>
          <label className="block text-sm font-medium">
            Webhook URL
            <input
              type="url"
              value={node.url}
              placeholder="https://hooks.zapier.com/…"
              onChange={(e) => update({ url: e.target.value })}
              className={input}
            />
          </label>
          <label className="block text-sm font-medium">
            JSON body
            <textarea
              rows={8}
              maxLength={8192}
              value={node.body}
              onChange={(e) => update({ body: e.target.value })}
              className={`${input} font-mono`}
            />
          </label>
          <p className="text-xs leading-5 text-slate-500 light:text-slate-600 dark:text-slate-400">
            Sends a POST request with JSON. Insert contact fields as{" "}
            {"{{email}}"} inside string values. Preview never sends a request.
          </p>
        </>
      )}
      {node.kind === "tag" && (
        <label className="block text-sm font-medium">
          Action
          <select
            value={node.action ?? "add"}
            onChange={(e) => update({ action: e.target.value })}
            className={input}
          >
            <option value="add">Add tag</option>
            <option value="remove">Remove tag</option>
          </select>
        </label>
      )}
      {node.kind === "tag" && (
        <label className="block text-sm font-medium">
          Contact tag
          <input
            value={node.tag}
            onChange={(e) =>
              update({ tag: e.target.value.replace(/[^a-zA-Z0-9_-]/g, "") })
            }
            className={input}
          />
        </label>
      )}
      {edges(node).length > 0 && (
        <div className="space-y-3 border-t border-slate-200 light:border-slate-300 pt-4 dark:border-white/10">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 light:text-slate-600">
            Connections
          </h3>
          {edges(node).map((edge, i) => (
            <label key={i} className="block text-xs">
              {edge.label}
              <select
                aria-label={`${edge.label} connection`}
                className={input}
                value={edge.target ?? ""}
                onChange={(e) =>
                  onChange(
                    connectFlow(flow, node.id, i, e.target.value || null),
                  )
                }
              >
                <option value="">Finish here</option>
                {flow.nodes
                  .filter((n) => n.id !== node.id)
                  .map((n) => (
                    <option value={n.id} key={n.id}>
                      {n.label}
                    </option>
                  ))}
              </select>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function DelayDuration({
  seconds,
  onChange,
}: {
  seconds: number;
  onChange: (seconds: number) => void;
}) {
  const [unit, setUnit] = useState(
    seconds % 86400 === 0
      ? 86400
      : seconds % 3600 === 0
        ? 3600
        : seconds % 60 === 0
          ? 60
          : 1,
  );
  return (
    <label className="block text-sm font-medium">
      Delay duration
      <div className="mt-2 flex gap-2">
        <input
          aria-label="Delay duration"
          type="number"
          min={1}
          max={604800 / unit}
          value={seconds / unit}
          onChange={(e) =>
            onChange(
              Math.min(
                604800,
                Math.max(1, Math.round(Number(e.target.value) * unit)),
              ),
            )
          }
          className={input}
        />
        <select
          aria-label="Delay unit"
          value={unit}
          onChange={(e) => {
            const next = Number(e.target.value);
            onChange(
              Math.min(
                604800,
                Math.max(1, Math.round((seconds / unit) * next)),
              ),
            );
            setUnit(next);
          }}
          className={input}
        >
          {[
            [1, "Seconds"],
            [60, "Minutes"],
            [3600, "Hours"],
            [86400, "Days"],
          ].map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}
