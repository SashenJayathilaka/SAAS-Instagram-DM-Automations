import "server-only";
import { createSign } from "node:crypto";
import { unstable_cache } from "next/cache";
import { requireOwnerAdmin } from "@/lib/admin";

type ReportResult = {
  connected: boolean;
  message: string;
  rows: { label: string; values: string[] }[];
};
const empty = (message: string): ReportResult => ({
  connected: false,
  message,
  rows: [],
});
async function accessToken() {
  const account = JSON.parse(
    process.env.ADMIN_GOOGLE_SERVICE_ACCOUNT_JSON || "{}",
  );
  if (
    typeof account.client_email !== "string" ||
    typeof account.private_key !== "string"
  )
    throw new Error("Missing reporting credentials");
  const now = Math.floor(Date.now() / 1000);
  const b64 = (v: unknown) =>
    Buffer.from(JSON.stringify(v)).toString("base64url");
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iss: account.client_email, scope: "https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 })}`;
  const signature = createSign("RSA-SHA256")
    .update(unsigned)
    .sign(account.private_key, "base64url");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("Google authorization failed");
  const data = await response.json();
  if (typeof data.access_token !== "string")
    throw new Error("Invalid Google authorization");
  return data.access_token as string;
}
async function request(url: string, body: unknown, token: string) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error("Report unavailable");
  return res.json();
}
const cachedReports = unstable_cache(
  async () => {
    const configured = Boolean(process.env.ADMIN_GOOGLE_SERVICE_ACCOUNT_JSON);
    const property = process.env.ADMIN_GA4_PROPERTY_ID || "";
    const site = process.env.ADMIN_GSC_SITE_URL || "https://ap3k.com/";
    let ga = empty(
        "Connect a Google reporting service account and a numeric GA4 property ID.",
      ),
      gsc = empty(
        "Connect a Google reporting service account with access to the AP3K Search Console property.",
      );
    if (!configured) return { ga, gsc, fetchedAt: new Date().toISOString() };
    let token: string;
    try {
      token = await accessToken();
    } catch {
      return {
        ga: empty(
          "Google authentication failed. Verify the reporting service account configuration.",
        ),
        gsc: empty(
          "Google authentication failed. Verify the reporting service account configuration.",
        ),
        fetchedAt: new Date().toISOString(),
      };
    }
    await Promise.all([
      (async () => {
        if (!/^\d+$/.test(property)) return;
        try {
          const data = await request(
            `https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`,
            {
              dateRanges: [{ startDate: "28daysAgo", endDate: "yesterday" }],
              dimensions: [{ name: "sessionDefaultChannelGroup" }],
              metrics: [
                { name: "sessions" },
                { name: "activeUsers" },
                { name: "keyEvents" },
              ],
              limit: 10,
            },
            token,
          );
          ga = {
            connected: true,
            message:
              "GA4 · Previous 28 complete days · Property timezone · Up to 10 channels",
            rows: (data.rows || []).map(
              (r: {
                dimensionValues: { value: string }[];
                metricValues: { value: string }[];
              }) => ({
                label: r.dimensionValues[0]?.value || "Unknown",
                values: r.metricValues.map((v) => v.value),
              }),
            ),
          };
        } catch {
          ga = empty(
            "GA4 report unavailable. Verify property access and enable the Google Analytics Data API.",
          );
        }
      })(),
      (async () => {
        if (!["https://ap3k.com/", "sc-domain:ap3k.com"].includes(site)) {
          gsc = empty(
            "Search Console property must be https://ap3k.com/ or sc-domain:ap3k.com.",
          );
          return;
        }
        try {
          const end = new Date(Date.now() - 3 * 86400000),
            start = new Date(end.getTime() - 27 * 86400000);
          const data = await request(
            `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`,
            {
              startDate: start.toISOString().slice(0, 10),
              endDate: end.toISOString().slice(0, 10),
              dimensions: ["query"],
              rowLimit: 20,
              dataState: "final",
            },
            token,
          );
          gsc = {
            connected: true,
            message: `Search Console · ${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)} · Top 20 queries (not all traffic)`,
            rows: (data.rows || []).map(
              (r: {
                keys: string[];
                clicks: number;
                impressions: number;
                ctr: number;
                position: number;
              }) => ({
                label: r.keys[0] || "Unknown",
                values: [
                  String(r.clicks),
                  String(r.impressions),
                  `${(r.ctr * 100).toFixed(1)}%`,
                  r.position.toFixed(1),
                ],
              }),
            ),
          };
        } catch {
          gsc = empty(
            "Search Console report unavailable. Verify property access and enable the Search Console API.",
          );
        }
      })(),
    ]);
    return { ga, gsc, fetchedAt: new Date().toISOString() };
  },
  ["admin-google-reports-v1"],
  { revalidate: 900 },
);
export async function getGoogleReports() {
  await requireOwnerAdmin();
  return cachedReports();
}
