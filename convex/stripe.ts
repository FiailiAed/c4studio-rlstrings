import { action } from "./_generated/server";
import { components, api } from "./_generated/api";
import { StripeSubscriptions } from "@convex-dev/stripe";
import { v } from "convex/values";

const stripeClient = new StripeSubscriptions(components.stripe, {});

// Create a checkout session for a subscription
export const createSubscriptionCheckout = action({
  args: { priceId: v.string() },
  returns: v.object({
    sessionId: v.string(),
    url: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Get or create a Stripe customer
    const customer = await stripeClient.getOrCreateCustomer(ctx, {
      userId: identity.subject,
      email: identity.email,
      name: identity.name,
    });

    const origin = process.env.SITE_URL ?? "https://rlstrings.com";

    // Create checkout session
    return await stripeClient.createCheckoutSession(ctx, {
      priceId: args.priceId,
      customerId: customer.customerId,
      mode: "subscription",
      successUrl: `${origin}/?success=true`,
      cancelUrl: `${origin}/?canceled=true`,
      subscriptionMetadata: { userId: identity.subject },
    });
  },
});

// Create a public (unauthenticated) checkout session for a one-time or subscription payment
export const createPublicCheckout = action({
  args: {
    priceId: v.string(),
    mode: v.union(v.literal("payment"), v.literal("subscription")),
  },
  returns: v.object({
    sessionId: v.string(),
    url: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args): Promise<{ sessionId: string; url: string | null }> => {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const origin = process.env.SITE_URL ?? "https://rlstrings.com";

    // Find a unique pickup code (retry up to 10 times)
    let pickupCode = "";
    for (let i = 0; i < 10; i++) {
      const candidate = String(Math.floor(1000 + Math.random() * 9000));
      const existing = await ctx.runQuery(api.orders.getPublicOrderByPickupCode, { pickupCode: candidate });
      if (!existing) { pickupCode = candidate; break; }
    }
    if (!pickupCode) throw new Error("Could not generate a unique pickup code. Please try again.");

    const body = new URLSearchParams({
      "line_items[0][price]": args.priceId,
      "line_items[0][quantity]": "1",
      mode: args.mode,
      customer_creation: "always",
      "metadata[orderType]": "product",
      "metadata[pickupCode]": pickupCode,
      success_url: `${origin}/order/${pickupCode}`,
      cancel_url: `${origin}/shop`,
    });

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Stripe error: ${res.status} ${text}`);
    }

    const session = await res.json() as { id: string; url: string | null };
    return { sessionId: session.id, url: session.url };
  },
});

// Create a checkout session for a one-time payment
export const createPaymentCheckout = action({
  args: { priceId: v.string() },
  returns: v.object({
    sessionId: v.string(),
    url: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const customer = await stripeClient.getOrCreateCustomer(ctx, {
      userId: identity.subject,
      email: identity.email,
      name: identity.name,
    });

    const origin = process.env.SITE_URL ?? "https://rlstrings.com";

    return await stripeClient.createCheckoutSession(ctx, {
      priceId: args.priceId,
      customerId: customer.customerId,
      mode: "payment",
      successUrl: `${origin}/admin/orders`,
      cancelUrl: `${origin}/admin/orders`,
      paymentIntentMetadata: { userId: identity.subject },
    });
  },
});
