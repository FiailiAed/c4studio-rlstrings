import { v } from "convex/values";
import { action } from "./_generated/server";
import Stripe from "stripe";

const global_stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover", // Use the latest or the one Todd's account is pinned to
});

// CRACKED MOVE: Initialize inside a getter so it doesn't 
// crash Convex during the build process if the key is missing.
const getStripe = () => {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error("STRIPE_SECRET_KEY is not set in Convex Environment Variables");
  }
  return new Stripe(apiKey, {
    apiVersion: "2026-01-28.clover",
  });
};

export const createProductAndSync = action({
  args: { 
    name: v.string(), 
    priceInCents: v.number(), 
    category: v.union(v.literal("head"), v.literal("shaft"), v.literal("mesh")) 
  },
  handler: async (ctx, args) => {
    const stripe = getStripe(); // Only runs when the action is called
    
    const product = await stripe.products.create({
      name: args.name,
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: args.priceInCents,
      currency: "usd",
    });

    // ... rest of your code
    return { success: true };
  },
});
