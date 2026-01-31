declare var process: { env: Record<string, string | undefined> };

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api"; // FIX 1: Import internal
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
