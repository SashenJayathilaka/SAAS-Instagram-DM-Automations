import { handleStripeWebhook } from "@/lib/stripe-webhook-route";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  return handleStripeWebhook(req);
}
