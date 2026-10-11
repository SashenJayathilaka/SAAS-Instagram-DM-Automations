import { deleteAp3kData } from "@/lib/account-deletion-data";
import { isAccountDeletionConfirmationValid } from "@/lib/account-deletion-confirmation";
import { client } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getStripeSecretKey } from "@/lib/stripe-config";
import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type DeleteAccountErrorCode =
  | "not_authenticated"
  | "invalid_origin"
  | "invalid_request"
  | "confirmation_mismatch"
  | "billing_cleanup_failed"
  | "database_cleanup_failed"
  | "identity_cleanup_failed";

function errorResponse(status: number, code: DeleteAccountErrorCode, message: string) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "private, no-store" } }
  );
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

function isStripeResourceMissing(error: unknown) {
  if (typeof error !== "object" || error === null) return false;
  const value = error as { code?: unknown; raw?: { code?: unknown } };
  return value.code === "resource_missing" || value.raw?.code === "resource_missing";
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return errorResponse(403, "invalid_origin", "This request must come from AP3K.");
  }

  const clerkUser = await currentUser();
  if (!clerkUser) {
    return errorResponse(401, "not_authenticated", "Sign in before deleting your account.");
  }

  let confirmation = "";
  try {
    const body = (await request.json()) as { confirmation?: unknown };
    confirmation = typeof body.confirmation === "string" ? body.confirmation : "";
  } catch {
    return errorResponse(400, "invalid_request", "Enter the required deletion confirmation.");
  }

  const ap3kUser = await client.user.findUnique({
    where: { clerkId: clerkUser.id },
    select: {
      id: true,
      email: true,
      subscription: { select: { customerId: true } },
    },
  });

  if (!isAccountDeletionConfirmationValid(confirmation)) {
    return errorResponse(
      400,
      "confirmation_mismatch",
      "Type DELETE to confirm account deletion."
    );
  }

  const customerId = ap3kUser?.subscription?.customerId;
  if (customerId) {
    if (!getStripeSecretKey()) {
      return errorResponse(
        503,
        "billing_cleanup_failed",
        "Billing cleanup is temporarily unavailable. Your account was not deleted."
      );
    }

    try {
      await stripe.customers.del(customerId);
    } catch (error) {
      if (!isStripeResourceMissing(error)) {
        console.error("[account-deletion] Stripe customer cleanup failed", {
          operation: "delete_customer",
          customerLinked: true,
          stripeErrorCode:
            typeof error === "object" && error !== null && "code" in error
              ? String((error as { code?: unknown }).code ?? "")
              : undefined,
        });
        return errorResponse(
          502,
          "billing_cleanup_failed",
          "Billing cleanup failed. Your AP3K account was not deleted."
        );
      }
    }
  }

  if (ap3kUser) {
    try {
      await deleteAp3kData(ap3kUser.id, ap3kUser.email);
    } catch (error) {
      console.error("[account-deletion] database cleanup failed", {
        operation: "delete_ap3k_user_data",
        message: error instanceof Error ? error.message : String(error),
      });
      return errorResponse(
        500,
        "database_cleanup_failed",
        "Account data cleanup failed. Please try again."
      );
    }
  }

  try {
    const clerk = await clerkClient();
    await clerk.users.deleteUser(clerkUser.id);
  } catch (error) {
    console.error("[account-deletion] Clerk identity cleanup failed", {
      operation: "delete_clerk_user",
      message: error instanceof Error ? error.message : String(error),
    });
    return errorResponse(
      502,
      "identity_cleanup_failed",
      "Your AP3K data was removed, but sign-in cleanup is still pending. Submit the same deletion request again."
    );
  }

  return NextResponse.json(
    { success: true },
    { status: 200, headers: { "Cache-Control": "private, no-store" } }
  );
}
