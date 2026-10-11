import { NextRequest, NextResponse } from "next/server";
import { client } from "@/lib/prisma";
import {
  createMetaDeletionConfirmationCode,
  processMetaDataDeletion,
  verifyMetaSignedRequest,
} from "@/lib/meta-data-deletion";

export const runtime = "nodejs";

async function readSignedRequest(req: NextRequest): Promise<string | null> {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => null);
    return typeof body?.signed_request === "string" ? body.signed_request : null;
  }

  const form = await req.formData().catch(() => null);
  const signedRequest = form?.get("signed_request");
  return typeof signedRequest === "string" ? signedRequest : null;
}

export async function POST(req: NextRequest) {
  const confirmationCode = createMetaDeletionConfirmationCode();

  try {
    const signedRequest = await readSignedRequest(req);
    const verification = verifyMetaSignedRequest(signedRequest, process.env.META_APP_SECRET);

    if (!verification.ok) {
      console.warn("[meta-data-deletion] rejected request", {
        reason: verification.reason,
        hasSignedRequest: Boolean(signedRequest),
      });
      return NextResponse.json({ error: "invalid_signed_request" }, { status: 400 });
    }

    const summary = await processMetaDataDeletion(client, verification.userId);

    console.log("[meta-data-deletion] processed request", {
      matchedRecords: summary.matchedRecords,
      deletedRecords: summary.deletedRecords,
      anonymizedRecords: summary.anonymizedRecords,
      pausedAutomations: summary.pausedAutomations,
    });

    return NextResponse.json({
      url: `https://ap3k.com/data-deletion-status?code=${confirmationCode}`,
      confirmation_code: confirmationCode,
    });
  } catch (error) {
    console.error("[meta-data-deletion] failed to process request", {
      message: error instanceof Error ? error.message : "unknown_error",
    });
    return NextResponse.json({ error: "data_deletion_failed" }, { status: 500 });
  }
}
