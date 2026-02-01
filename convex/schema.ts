import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  orders: defineTable({
    customerName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    stripeSessionId: v.string(),
    // Order Status Logic - LFG
    status: v.union(
      v.literal("paid"),           // Payment received via Stripe
      v.literal("dropped_off"),    // Parent scanned QR at Stellar
      v.literal("in_progress"),    // Todd is stringing it
      v.literal("ready_for_pickup"),// Todd clicked "Done"
      v.literal("completed")       // Parent scanned QR to pick up
    ),
    orderType: v.union(v.literal("service"), v.literal("product")),
    itemDescription: v.string(),   // e.g. "Signature Mesh Re-string"
    pickupCode: v.string(),        // Simple 4-digit code for the hand-off
    droppedOffAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    lineItems: v.optional(v.array(v.object({
      priceId: v.string(),
      productName: v.string(),
      quantity: v.number(),
      unitAmount: v.number(),      // in cents
      totalAmount: v.number(),     // in cents
      category: v.union(
        v.literal("head"),
        v.literal("shaft"),
        v.literal("mesh"),
        v.literal("strings"),
        v.literal("service")
      )
    }))),
  }).index("by_email", ["email"]).index("by_status", ["status"]),

  inventory: defineTable({
    name: v.string(),
    priceId: v.string(),           // The ID from your Stripe account
    stock: v.number(),
    category: v.union(
      v.literal("head"),
      v.literal("shaft"),
      v.literal("mesh"),
      v.literal("strings"),
      v.literal("service")
    ),
  }),
});
