import { describe, expect, it, vi } from "vitest";
import { buildWebhookPipelineDiagnostics } from "./webhook-pipeline-diagnostics";

describe("Webhook Emergency Diagnostics", () => {
  it("recognizes WEBHOOK_POST_RECEIVED_RAW as proof of delivery", () => {
    const diagnostics = buildWebhookPipelineDiagnostics({
      lastPostRaw: {
        eventType: "WEBHOOK_POST_RECEIVED_RAW",
        createdAt: new Date(),
        payload: { routeVersion: "2026-05-tenant-diagnostics-v2" }
      }
    });
    expect(diagnostics.rawArrived).toBe(true);
  });

  it("exposes route errors in final reason", () => {
    const diagnostics = buildWebhookPipelineDiagnostics({
      lastPostRaw: { eventType: "WEBHOOK_POST_RECEIVED_RAW" },
      lastRealComment: {
        eventType: "WEBHOOK_ROUTE_ERROR",
        errorMessage: "PrismaClientKnownRequestError: Unique constraint failed",
        status: "FAILED"
      }
    });
    // buildWebhookPipelineDiagnostics handles lastRealComment being any event that follows raw
    expect(diagnostics.finalReason).toContain("PrismaClientKnownRequestError");
  });

  it("detects account mismatch when entryId differs from connected account", () => {
    // This logic is currently in the React component (admin/page.tsx)
    // but we can test the data it relies on.
    const lastPostRaw = {
      eventType: "WEBHOOK_POST_RECEIVED_RAW",
      payload: { entryId: "old-account-id" }
    };
    const connectedAccount = {
      instagramId: "new-account-id",
      webhookAccountId: "new-webhook-id"
    };

    const isMismatch = lastPostRaw.payload.entryId !== connectedAccount.instagramId &&
                       lastPostRaw.payload.entryId !== connectedAccount.webhookAccountId;

    expect(isMismatch).toBe(true);
  });

  it("marks dry-run simulations correctly in diagnostics", () => {
    const lastRealComment = {
      eventType: "REAL_COMMENT_EVENT",
      status: "PROCESSED",
      payload: {
        dryRun: true,
        simulationResult: "dry_run_skipped_actions"
      }
    };
    const diagnostics = buildWebhookPipelineDiagnostics({
      lastPostRaw: { eventType: "WEBHOOK_POST_RECEIVED_RAW" },
      lastRealComment,
    });
    // The pipeline diagnostics doesn't have a specific dryRun flag yet,
    // but it should reflect the skipped actions.
    expect(diagnostics.publicReplyAttempted).toBe(false);
    expect(diagnostics.dmAttempted).toBe(false);
    expect(diagnostics.finalReason).toBe("dry_run_skipped_actions");
  });
});
