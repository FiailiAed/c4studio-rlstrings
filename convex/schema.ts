import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  orders: defineTable({
    customerName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    stripeSessionId: v.string(),
    // Order Status Logic - LFG
    stripeCustomerId: v.optional(v.string()),
    status: v.union(
      v.literal("paid"),                // Payment received via Stripe
      v.literal("dropped_off"),         // Customer dropped off at Stellar
      v.literal("picked_up"),           // Stringer picked up the order
      v.literal("stringing"),           // Stringing in progress
      v.literal("strung"),              // Stringing complete
      v.literal("ready_for_pickup"),    // Dropped back at Stellar, awaiting customer
      v.literal("picked_up_by_customer"), // Customer picked up
      v.literal("review"),              // Awaiting customer review
      v.literal("completed"),           // Done
      // Legacy statuses — kept for existing data compatibility
      v.literal("in_progress"),
      v.literal("on_hold"),
      v.literal("customer_review")
    ),
    orderType: v.union(v.literal("service"), v.literal("product")),
    itemDescription: v.string(),   // e.g. "Signature Mesh Re-string"
    pickupCode: v.string(),        // Simple 4-digit code for the hand-off
    droppedOffAt: v.optional(v.number()),
    pickedUpAt: v.optional(v.number()),
    stringingAt: v.optional(v.number()),
    strungAt: v.optional(v.number()),
    readyForPickupAt: v.optional(v.number()),
    pickedUpByCustomerAt: v.optional(v.number()),
    reviewAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    // Legacy fields — kept for backwards compatibility with existing data
    inProgressAt: v.optional(v.number()),
    onHoldAt: v.optional(v.number()),
    customerReviewAt: v.optional(v.number()),
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
        v.literal("service"),
        v.literal("upsell")
      )
    }))),
  }).index("by_email", ["email"]).index("by_status", ["status"]).index("by_pickup_code", ["pickupCode"]),

  inventory: defineTable({
    name: v.string(),
    priceId: v.string(),           // The ID from your Stripe account
    stock: v.number(),
    category: v.union(
      v.literal("head"),
      v.literal("shaft"),
      v.literal("mesh"),
      v.literal("strings"),
      v.literal("service"),
      v.literal("upsell")
    ),
    showInShop: v.optional(v.boolean()),
    showInBuilder: v.optional(v.boolean()),
    description: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    stripeProductId: v.optional(v.string()),
    unitAmount: v.optional(v.number()),
    currency: v.optional(v.string()),
    priceType: v.optional(v.union(v.literal("one_time"), v.literal("recurring"))),
    playerType: v.optional(v.union(v.literal("boys"), v.literal("girls"), v.literal("goalies"))),
  }).index("by_priceId", ["priceId"]),
});
