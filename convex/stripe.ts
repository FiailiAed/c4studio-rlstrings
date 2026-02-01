declare var process: { env: Record<string, string | undefined> };

import { v } from "convex/values";
import { action, query } from "./_generated/server";
import { internal } from "./_generated/api"; // FIX 1: Import internal
import { requireAdmin } from "./auth";
import Stripe from "stripe";

// FIX 2 & 3: Safer initialization
const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is missing in Convex Dashboard");
  return new Stripe(key); // Let Stripe use the account default version
};

export const createProductAndSync = action({
  args: {
    name: v.string(),
    priceInCents: v.number(),
    category: v.union(v.literal("head"), v.literal("shaft"), v.literal("mesh"))
  },
  handler: async (ctx, args) => {
    const stripe = getStripe();

    // 1. Create Product in Stripe
    const product = await stripe.products.create({
      name: args.name,
      metadata: { category: args.category },
    });

    // 2. Create Price in Stripe
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: args.priceInCents,
      currency: "usd",
    });

    // 3. Write to Convex DB using the internal object
    // LFG - No more red squiggly lines.
    await ctx.runMutation(internal.inventory.addItem, {
      name: args.name,
      priceId: price.id,
      stock: 0,
      category: args.category,
    });

    return { success: true, stripeId: product.id };
  },
});

// WEBHOOK HANDLER: Process completed checkout sessions
export const handleCheckoutCompleted = action({
  args: {
    customerName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    stripeSessionId: v.string(),
    orderType: v.union(v.literal("service"), v.literal("product")),
    itemDescription: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; orderId: string }> => {
    // Create order via internal mutation
    const orderId: string = await ctx.runMutation(internal.orders.createOrder, {
      customerName: args.customerName,
      email: args.email,
      phone: args.phone,
      stripeSessionId: args.stripeSessionId,
      orderType: args.orderType,
      itemDescription: args.itemDescription,
    });

    return { success: true, orderId };
  },
});

// DEBUG: Get inventory comparison data
export const getInventoryComparison = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);

    const inventory = await ctx.db.query("inventory").collect();
    return inventory.map(item => ({
      convexId: item._id,
      name: item.name,
      priceId: item.priceId,
      stock: item.stock,
      category: item.category,
    }));
  },
});

// DEBUG: Fetch all Stripe products/prices
export const fetchStripeProducts = action({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);

    const stripe = getStripe();

    const prices = await stripe.prices.list({
      limit: 100,
      expand: ['data.product'],
    });

    return prices.data.map(price => ({
      priceId: price.id,
      productName: (price.product as any).name,
      amount: price.unit_amount,
      currency: price.currency,
      active: price.active,
    }));
  },
});

// DEBUG: Fetch webhook metadata for a session
export const fetchSessionMetadata = action({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);

    const stripe = getStripe();

    try {
      const session = await stripe.checkout.sessions.retrieve(args.sessionId, {
        expand: ['line_items', 'customer', 'payment_intent'],
      });

      return {
        success: true,
        session: JSON.parse(JSON.stringify(session)),
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        sessionId: args.sessionId,
      };
    }
  },
});

// DEBUG: Ping Stripe to verify API key
export const debugPingStripe = action({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);

    const stripe = getStripe();

    try {
      const account = await stripe.accounts.retrieve();
      return {
        success: true,
        accountName: account.business_profile?.name || account.email || account.id,
        accountId: account.id,
      };
    } catch (err: any) {
      throw new Error(`Stripe API error: ${err.message}`);
    }
  },
});
