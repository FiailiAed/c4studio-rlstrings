import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Get all orders
export const listOrders = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("orders").order("desc").collect();
  },
});

// Create a new order after a successful Stripe checkout session (called from webhook)
export const createNewOrderAfterStripeCheckoutSession = internalMutation({
  args: {
    stripeSessionId: v.string(),
    customerName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    orderType: v.union(v.literal("service"), v.literal("product")),
    itemDescription: v.string(),
    lineItems: v.optional(v.array(v.object({
      priceId: v.string(),
      productName: v.string(),
      quantity: v.number(),
      unitAmount: v.number(),
      totalAmount: v.number(),
      category: v.union(
        v.literal("head"),
        v.literal("shaft"),
        v.literal("mesh"),
        v.literal("strings"),
        v.literal("service"),
        v.literal("upsell")
      ),
    }))),
  },
  handler: async (ctx, args) => {
    const pickupCode = String(Math.floor(1000 + Math.random() * 9000));

    await ctx.db.insert("orders", {
      stripeSessionId: args.stripeSessionId,
      customerName: args.customerName,
      email: args.email,
      phone: args.phone,
      orderType: args.orderType,
      itemDescription: args.itemDescription,
      lineItems: args.lineItems,
      pickupCode,
      status: "paid",
    });
  },
});

// Toggle order status
export const orderStatusUpdate = mutation({
  args: { id: v.id("orders"), status: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status as "paid" | "dropped_off" | "in_progress" | "ready_for_pickup" | "completed" });
  },
});

// Archive an order
export const archiveOrder = mutation({
  args: { id: v.id("orders") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
