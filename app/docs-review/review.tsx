"use client";
import { useState } from "react";
import { COMPARISONS, comparisonPath } from "@/lib/comparisons";

const reviewPages = [
  "/",
  "/pricing",
  "/payment?cancel=true",
  "/compare",
  ...COMPARISONS.map(comparisonPath),
  "/blog",
  "/help/workspace-tour",
  "/tutorials/instagram-comment-to-dm",
  "/blog/manychat-vs-ap3k-pricing-for-instagram",
  "/blog/comment-to-dm-button-labels",
  "/blog/comment-to-dm-final-message-templates",
  "/blog/comment-to-dm-three-link-buttons",
  "/blog/comment-to-dm-wrong-link",
  "/docs",
];

export default function Review() {
  const [width, setWidth] = useState(390);
  const [path, setPath] = useState(reviewPages[0]);
  return (
    <main
      style={{
        padding: 16,
        background: "#ddd",
        minHeight: "100vh",
        color: "#111",
      }}
    >
      <div
        style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}
      >
        {[320, 390, 768, 1280].map((w) => (
          <button key={w} onClick={() => setWidth(w)}>
            {w}px
          </button>
        ))}
        <select
          aria-label="Review page"
          value={path}
          onChange={(e) => setPath(e.target.value)}
        >
          {reviewPages.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </div>
      <iframe
        title="Documentation responsive review"
        src={path}
        style={{ width, maxWidth: "100%", height: 820, border: 0 }}
      />
    </main>
  );
}
