import { lookup } from "node:dns/promises";
import { request, type RequestOptions } from "node:https";
import type { ClientRequest } from "node:http";
import type { FlowValues } from "./definition";
import { isPublicWebhookAddress, parseWebhookUrl, renderWebhookBody, WEBHOOK_TIMEOUT_MS, WEBHOOK_RESPONSE_LIMIT } from "./webhook-contract";

/** One bounded HTTPS POST. No retries, redirects, proxy env, or returned response data. */
export async function executeFlowWebhook(input: { url: string; body: string; values: FlowValues; idempotencyKey: string; beforeSend?: () => Promise<boolean> }): Promise<{ status: number }> {
  const url = parseWebhookUrl(input.url);
  if (!url) throw new Error("webhook_invalid_destination");
  const body = renderWebhookBody(input.body, input.values);
  const host = url.hostname.replace(/\.$/, "");
  let req: ClientRequest | undefined;
  let finished = false;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      finished = true;
      req?.destroy();
      reject(new Error("webhook_timeout"));
    }, WEBHOOK_TIMEOUT_MS);
    const fail = (reason: string) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      req?.destroy();
      reject(new Error(reason));
    };
    void (async () => {
      try {
        const addresses = /^\d+(?:\.\d+){3}$/.test(host) ? [{ address: host, family: 4 }] : await lookup(host, { all: true, family: 4, verbatim: true });
        if (finished) return;
        if (!addresses.length || addresses.some(record => record.family !== 4 || !isPublicWebhookAddress(record.address))) return fail("webhook_private_destination");
        const pinned = addresses[0].address;
        if (input.beforeSend && !await input.beforeSend()) return fail("webhook_cancelled");
        if (finished) return;
        const options: RequestOptions = {
          method: "POST", protocol: "https:", hostname: host, port: 443,
          path: `${url.pathname}${url.search}`, agent: false, family: 4,
          // DNS is checked once, then pinned through TLS connection creation.
          lookup: (_host, _options, callback) => callback(null, pinned, 4),
          rejectUnauthorized: true, maxHeaderSize: 8192,
          headers: {
            "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body),
            "Accept": "application/json", "Accept-Encoding": "identity", "Connection": "close",
            "User-Agent": "AP3K-Automation/1.0", "Idempotency-Key": input.idempotencyKey,
          },
        };
        req = request(options, response => {
          const status = response.statusCode ?? 0;
          if (status < 200 || status >= 300) { response.destroy(); return fail(status >= 300 && status < 400 ? "webhook_redirect_blocked" : "webhook_http_error"); }
          const length = response.headers["content-length"];
          if (length && (!/^\d+$/.test(length) || Number(length) > WEBHOOK_RESPONSE_LIMIT)) { response.destroy(); return fail("webhook_response_too_large"); }
          if (response.headers["content-encoding"] && response.headers["content-encoding"] !== "identity") { response.destroy(); return fail("webhook_encoded_response"); }
          let bytes = 0;
          response.on("data", (chunk: Buffer) => {
            bytes += chunk.length;
            if (bytes > WEBHOOK_RESPONSE_LIMIT) { response.destroy(); fail("webhook_response_too_large"); }
          });
          response.on("aborted", () => fail("webhook_response_incomplete"));
          response.on("error", () => fail("webhook_response_error"));
          response.on("end", () => {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            resolve({ status });
          });
        });
        req.on("error", () => fail("webhook_request_failed"));
        req.end(body);
      } catch { fail("webhook_request_failed"); }
    })();
  });
}
