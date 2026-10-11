import type Stripe from "stripe";
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import {
  handleStripeWebhook,
  type StripeRouteDependencies,
} from "../../../../lib/stripe-webhook-route";
import { StripeWebhookInputError } from "../../../../lib/stripe-webhook";

const EVENT = {
  id: "evt_test",
  type: "checkout.session.completed",
  data: { object: {} },
} as Stripe.Event;

function request(signature = "valid-signature", body = "raw-webhook-body") {
  return new NextRequest("http://localhost/api/webhooks/stripe", {
    method: "POST",
    body,
    headers: signature ? { "stripe-signature": signature } : {},
  });
}

function dependencies() {
  return {
    getStripeKey: vi.fn<StripeRouteDependencies["getStripeKey"]>(
      () => "sk_test_placeholder"
    ),
    getWebhookSecret: vi.fn<StripeRouteDependencies["getWebhookSecret"]>(
      () => "whsec_placeholder"
    ),
    constructEvent: vi.fn<StripeRouteDependencies["constructEvent"]>(() => EVENT),
    processEvent: vi.fn<StripeRouteDependencies["processEvent"]>(
      async () => undefined
    ),
  } satisfies StripeRouteDependencies;
}

describe("Stripe webhook HTTP semantics", () => {
  it("passes the unchanged raw body and signature to verification", async () => {
    const deps = dependencies();
    const response = await handleStripeWebhook(
      request("signature-value", "exact-raw-body"),
      deps
    );
    expect(response.status).toBe(200);
    expect(deps.constructEvent).toHaveBeenCalledWith(
      "exact-raw-body",
      "signature-value",
      "whsec_placeholder",
      "sk_test_placeholder"
    );
    expect(deps.processEvent).toHaveBeenCalledWith(EVENT);
  });

  it("returns 400 for a missing or invalid signature", async () => {
    const missing = dependencies();
    expect((await handleStripeWebhook(request(""), missing)).status).toBe(400);
    expect(missing.constructEvent).not.toHaveBeenCalled();

    const invalid = dependencies();
    invalid.constructEvent.mockImplementation(() => {
      throw new Error("invalid");
    });
    expect((await handleStripeWebhook(request(), invalid)).status).toBe(400);
    expect(invalid.processEvent).not.toHaveBeenCalled();
  });

  it("returns 500 when server configuration is unavailable", async () => {
    const deps = dependencies();
    deps.getWebhookSecret.mockReturnValue(undefined);
    const response = await handleStripeWebhook(request(), deps);
    expect(response.status).toBe(500);
    expect(deps.constructEvent).not.toHaveBeenCalled();
  });

  it("does not acknowledge processing failures as HTTP 200", async () => {
    const deps = dependencies();
    deps.processEvent.mockRejectedValue(new Error("database unavailable"));
    const response = await handleStripeWebhook(request(), deps);
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Stripe webhook processing failed",
    });
  });

  it("returns 400 for a non-retriable malformed signed event", async () => {
    const deps = dependencies();
    deps.processEvent.mockRejectedValue(
      new StripeWebhookInputError("STRIPE_CUSTOMER_ID_MISSING")
    );
    expect((await handleStripeWebhook(request(), deps)).status).toBe(400);
  });

  it("returns 200 for a successful intentional no-op", async () => {
    const deps = dependencies();
    deps.constructEvent.mockReturnValue({
      ...EVENT,
      type: "invoice.created",
    } as Stripe.Event);
    deps.processEvent.mockResolvedValue({ outcome: "ignored" });
    expect((await handleStripeWebhook(request(), deps)).status).toBe(200);
  });
});
