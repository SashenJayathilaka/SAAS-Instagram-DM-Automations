"use client";
import { UiText } from "@/components/i18n/localized-copy";

import { LocalizedTextarea, LocalizedInput } from "@/components/i18n/localized-controls";


import { resolveTemplate } from "@/lib/template";
import { useState } from "react";

const DM_TEMPLATES = [
  { label: "Free guide", icon: "🎁", text: "Hey {{first_name}}! Here's the free guide you asked for → {{link}}" },
  { label: "Price inquiry", icon: "💰", text: "Hey {{first_name}}! Here are the full pricing details → {{link}}" },
  { label: "Booking call", icon: "📅", text: "Hey {{first_name}}! Grab your spot here → {{link}}" },
  { label: "Discount code", icon: "🔥", text: "Hey {{first_name}}! Your exclusive discount is inside → {{link}}" },
  { label: "Course link", icon: "🎓", text: "Hey {{first_name}}! Here's the course link → {{link}}" },
];

const VARS = ["{{first_name}}", "{{username}}", "{{keyword}}", "{{link}}"] as const;

const PREVIEW_VARS = {
  first_name: "Sarah",
  username: "@sarah.creates",
  keyword: "guide",
  link: "yoursite.com/resource",
};

type Props = {
  value: string;
  ctaLink: string;
  ctaButtonTitle: string;
  onChange: (value: string) => void;
  onCtaLinkChange: (link: string) => void;
  onCtaButtonTitleChange: (title: string) => void;
};

function compactUrl(value: string) {
  const clean = value.trim().replace(/^https?:\/\//, "");
  if (!clean) return "";
  return clean.length > 42 ? `${clean.slice(0, 42)}…` : clean;
}

export default function DmEditor({
  value,
  ctaLink,
  ctaButtonTitle,
  onChange,
  onCtaLinkChange,
  onCtaButtonTitleChange,
}: Props) {
  const [showTemplates, setShowTemplates] = useState(false);

  const insertVar = (variable: string) => onChange(value + variable);
  const preview = resolveTemplate(value, PREVIEW_VARS);
  const buttonLabel = ctaButtonTitle.trim() || "Open link";
  const hasCta = Boolean(ctaButtonTitle.trim() || ctaLink.trim());

  return (
    <div className="flex min-w-0 flex-col gap-4 overflow-hidden">
      <div className="flex min-w-0 items-center justify-between gap-4">
        <div className="min-w-0">
          <span className="text-sm font-semibold text-slate-950 dark:text-white"><UiText>{"DM message"}</UiText></span>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-300"><UiText>{" Sent privately to the commenter's Instagram inbox. "}</UiText></p>
        </div>
        <button
          type="button"
          onClick={() => setShowTemplates((show) => !show)}
          className="shrink-0 text-xs font-semibold text-rf-blue hover:underline"
        >
          {showTemplates ? "Hide templates" : "⚡ Use a template"}
        </button>
      </div>

      {showTemplates && (
        <div className="flex min-w-0 flex-wrap gap-2">
          {DM_TEMPLATES.map((template) => (
            <button
              key={template.label}
              type="button"
              onClick={() => {
                onChange(template.text);
                setShowTemplates(false);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:border-rf-blue/40 hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08] dark:hover:text-white"
            >
              {template.icon} {template.label}
            </button>
          ))}
        </div>
      )}

      <LocalizedTextarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Hey {{first_name}}! Here's what you asked for → {{link}}"
        rows={4}
        dir="auto"
        className="ap3k-textarea w-full min-w-0 resize-none rounded-xl px-4 py-3.5 text-sm"
      />

      <div className="flex min-w-0 flex-wrap gap-2">
        {VARS.map((variable) => (
          <button
            key={variable}
            type="button"
            onClick={() => insertVar(variable)}
            className="rounded-md border border-rf-purple/25 bg-rf-purple/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-rf-purple transition-colors hover:bg-rf-purple/20"
          >
            {variable}
          </button>
        ))}
      </div>

      <div className="flex min-w-0 flex-col gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex items-center gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500"><UiText>{"Button link"}</UiText></p>
          <span className="text-[10px] text-slate-500"><UiText>{"optional"}</UiText></span>
        </div>
        <LocalizedInput
          type="text"
          value={ctaButtonTitle}
          onChange={(event) => onCtaButtonTitleChange(event.target.value)}
          placeholder='Button text — e.g. "Get the guide"'
          className="ap3k-input w-full min-w-0 rounded-xl px-4 py-3 text-sm"
        />
        <LocalizedInput
          type="url"
          value={ctaLink}
          onChange={(event) => onCtaLinkChange(event.target.value)}
          placeholder="Button destination URL — e.g. https://yoursite.com/guide"
          className="ap3k-input w-full min-w-0 rounded-xl px-4 py-3 text-sm"
        />
        <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-300"><UiText>{" AP3K sends this as an Instagram web button when supported. Long URLs are hidden from the message bubble. "}</UiText></p>
      </div>

      {value && (
        <div className="min-w-0 overflow-hidden rounded-2xl border border-rf-blue/20 bg-rf-blue/5 p-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-500"><UiText>{" DM preview "}</UiText></p>
          <div className="flex max-w-full flex-col items-start gap-2 sm:max-w-[85%]">
            <div
              dir="auto"
              className="max-w-full whitespace-pre-wrap break-words rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-950 shadow-sm dark:border-white/10 dark:bg-[#101827] dark:text-slate-50"
            >
              {preview.split("\n").map((line, index, lines) => (
                <span key={index}>
                  {line}
                  {index < lines.length - 1 && <br />}
                </span>
              ))}
            </div>
            {hasCta && (
              <div className="flex w-full min-w-0 items-center justify-center overflow-hidden rounded-xl border border-rf-blue/30 bg-rf-blue/15 px-4 py-2.5 text-xs font-bold text-rf-blue">
                <span className="truncate">{buttonLabel}</span>
              </div>
            )}
          </div>
          {hasCta && ctaLink.trim() && (
            <p className="mt-2 max-w-full overflow-hidden truncate text-[10px] text-slate-500 dark:text-slate-400"><UiText>{" Button destination saved privately: "}</UiText>{compactUrl(ctaLink)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
