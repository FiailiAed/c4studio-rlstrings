import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Get a single order by ID (admin)
export const getOrderById = query({
  args: { id: v.id("orders") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

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
    stripeCustomerId: v.optional(v.string()),
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
    pickupCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const pickupCode = args.pickupCode ?? String(Math.floor(1000 + Math.random() * 9000));

    await ctx.db.insert("orders", {
      stripeSessionId: args.stripeSessionId,
      customerName: args.customerName,
      email: args.email,
      phone: args.phone,
      stripeCustomerId: args.stripeCustomerId,
      orderType: args.orderType,
      itemDescription: args.itemDescription,
      lineItems: args.lineItems,
      pickupCode,
      status: "paid",
    });
  },
});

// Status flow order
const STATUS_ORDER = ["paid", "dropped_off", "picked_up", "stringing", "strung", "ready_for_pickup", "picked_up_by_customer", "review", "completed"] as const;

// Timestamp field for each status
const STATUS_TIMESTAMP_FIELDS: Record<string, string> = {
  dropped_off: "droppedOffAt",
  picked_up: "pickedUpAt",
  stringing: "stringingAt",
  strung: "strungAt",
  ready_for_pickup: "readyForPickupAt",
  picked_up_by_customer: "pickedUpByCustomerAt",
  review: "reviewAt",
  completed: "completedAt",
};

// Update order status with timestamp tracking
export const orderStatusUpdate = mutation({
  args: { id: v.id("orders"), status: v.string() },
  handler: async (ctx, args) => {
    const newStatus = args.status as typeof STATUS_ORDER[number];
    const newIdx = STATUS_ORDER.indexOf(newStatus);

    // Build patch: set timestamp for new status, clear timestamps for all statuses after it
    const patch: Record<string, unknown> = {
      status: newStatus,
    };

    // Set timestamp for the new status (if it has one — "paid" doesn't)
    const tsField = STATUS_TIMESTAMP_FIELDS[newStatus];
    if (tsField) {
      patch[tsField] = Date.now();
    }

    // Clear timestamps for all statuses that come after the new one
    for (let i = newIdx + 1; i < STATUS_ORDER.length; i++) {
      const field = STATUS_TIMESTAMP_FIELDS[STATUS_ORDER[i]];
      if (field) {
        patch[field] = undefined;
      }
    }

    await ctx.db.patch(args.id, patch);
  },
});

// Archive an order
export const archiveOrder = mutation({
  args: { id: v.id("orders") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Admin query — full order detail by pickupCode
export const getAdminOrderByPickupCode = query({
  args: { pickupCode: v.string() },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_pickup_code", (q) => q.eq("pickupCode", args.pickupCode))
      .first();

    if (!order) return null;

    return { ...order };
  },
});

// Public drop-off confirmation — only allows paid → dropped_off
export const confirmDropOff = mutation({
  args: {
    pickupCode: v.string(),
    confirmCode: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_pickup_code", (q) => q.eq("pickupCode", args.pickupCode))
      .first();

    if (!order) {
      throw new Error("Order not found. Please check your pickup code.");
    }

    if (order.status !== "paid") {
      throw new Error("This order has already been dropped off.");
    }

    if (args.confirmCode !== args.pickupCode) {
      throw new Error("Confirmation code does not match. Please try again.");
    }

    await ctx.db.patch(order._id, {
      status: "dropped_off",
      droppedOffAt: Date.now(),
    });
  },
});

// Public customer pickup confirmation — only allows ready_for_pickup → picked_up_by_customer
export const confirmCustomerPickup = mutation({
  args: {
    pickupCode: v.string(),
    confirmCode: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_pickup_code", (q) => q.eq("pickupCode", args.pickupCode))
      .first();

    if (!order) {
      throw new Error("Order not found. Please check your pickup code.");
    }

    if (order.status !== "ready_for_pickup") {
      throw new Error("This order is not ready for pickup yet.");
    }

    if (args.confirmCode !== args.pickupCode) {
      throw new Error("Confirmation code does not match. Please try again.");
    }

    await ctx.db.patch(order._id, {
      status: "picked_up_by_customer",
      pickedUpByCustomerAt: Date.now(),
    });
  },
});

// Public customer review confirmation — advances picked_up_by_customer → completed
export const confirmReview = mutation({
  args: { pickupCode: v.string() },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_pickup_code", (q) => q.eq("pickupCode", args.pickupCode))
      .first();
    if (!order) return;
    if (order.status === "picked_up_by_customer" || order.status === "review") {
      await ctx.db.patch(order._id, { status: "completed", completedAt: Date.now() });
    }
  },
});

// Public query — returns only non-sensitive fields, used by the order status page
export const getPublicOrderByPickupCode = query({
  args: { pickupCode: v.string() },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_pickup_code", (q) => q.eq("pickupCode", args.pickupCode))
      .first();

    if (!order) return null;

    return {
      _id: order._id,
      status: order.status,
      orderType: order.orderType,
      itemDescription: order.itemDescription,
      pickupCode: order.pickupCode,
      droppedOffAt: order.droppedOffAt ?? null,
      pickedUpAt: order.pickedUpAt ?? null,
      stringingAt: order.stringingAt ?? null,
      strungAt: order.strungAt ?? null,
      readyForPickupAt: order.readyForPickupAt ?? null,
      pickedUpByCustomerAt: order.pickedUpByCustomerAt ?? null,
      reviewAt: order.reviewAt ?? null,
      completedAt: order.completedAt ?? null,
      lineItems: order.lineItems ?? null,
    };
  },
});
