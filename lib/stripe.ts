import Stripe from "stripe";
import { getStripeSecretKey } from "./stripe-config";

let _instance: Stripe | null = null;

function getInstance(): Stripe {
  if (!_instance) {
    const key = getStripeSecretKey();
    if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
    _instance = new Stripe(key, { apiVersion: "2026-08-26.dahlia" });
  }
  return _instance;
}

// Lazy proxy — Stripe is only instantiated when first used at runtime,
// not at module-import time (avoids Next.js build failures when env vars are absent).
export const stripe = new Proxy({} as Stripe, {
  get(_, prop: string) {
    return (getInstance() as any)[prop];
  },
});
