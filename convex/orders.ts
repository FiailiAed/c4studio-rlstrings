import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { requireAdmin, requireAuth } from "./auth";

// TODD'S VIEW: Get all orders that need work
export const getActiveOrders = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity); // Only Todd can see all orders with PII

    return await ctx.db
      .query("orders")
      .withIndex("by_status")
      .order("desc")
      .collect();
  },
});

// THE HANDSHAKE: Update status when parent scans QR
export const updateOrderStatus = mutation({
  args: {
    orderId: v.id("orders"),
    newStatus: v.union(
      v.literal("dropped_off"),
      v.literal("in_progress"),
      v.literal("ready_for_pickup"),
      v.literal("completed")
    )
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const { orderId, newStatus } = args;

    // Customer can set "dropped_off" (QR scan at Stellar)
    if (newStatus === "dropped_off") {
      requireAuth(identity); // Any authenticated user
    } else {
      // Admin-only status changes (in_progress, ready_for_pickup, completed)
      requireAdmin(identity);
    }

    const timestamp = Date.now();
    const patch: any = { status: newStatus };

    if (newStatus === "dropped_off") patch.droppedOffAt = timestamp;
    if (newStatus === "completed") patch.completedAt = timestamp;

    await ctx.db.patch(orderId, patch);

    // LFG: This is where you'd trigger a Resend email to the parent
    return { success: true };
  },
});

// STRIPE WEBHOOK: Create order from successful payment
export const createOrder = internalMutation({
  args: {
    customerName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    stripeSessionId: v.string(),
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
        v.literal("service")
      )
    })))
  },
  handler: async (ctx, args) => {
    // Generate 4-digit pickup code (0000-9999)
    const pickupCode = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');

    // Create order with initial "paid" status
    const orderId = await ctx.db.insert("orders", {
      customerName: args.customerName,
      email: args.email,
      phone: args.phone,
      stripeSessionId: args.stripeSessionId,
      status: "paid",
      orderType: args.orderType,
      itemDescription: args.itemDescription,
      pickupCode,
      lineItems: args.lineItems,
    });

    return orderId;
  },
});

// PUBLIC: Get order by ID for customer tracking page
export const getOrderById = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);

    if (!order) {
      return null;
    }

    // Return order WITHOUT admin-only PII (phone excluded)
    return {
      _id: order._id,
      customerName: order.customerName,
      email: order.email,
      status: order.status,
      orderType: order.orderType,
      itemDescription: order.itemDescription,
      lineItems: order.lineItems,
      pickupCode: order.pickupCode,
      stripeSessionId: order.stripeSessionId,
      droppedOffAt: order.droppedOffAt,
      completedAt: order.completedAt,
      _creationTime: order._creationTime,
    };
  },
});

// ADMIN: Get most recent order for debug panel
export const getMostRecentOrder = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);

    const orders = await ctx.db
      .query("orders")
      .order("desc")
      .take(1);

    return orders[0] || null;
  },
});

// PUBLIC: Get order by Stripe session ID for order success page
export const getOrderBySessionId = query({
  args: { stripeSessionId: v.string() },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .filter((q) => q.eq(q.field("stripeSessionId"), args.stripeSessionId))
      .first();

    if (!order) {
      return null;
    }

    // Return order WITHOUT admin-only PII (phone excluded)
    return {
      _id: order._id,
      customerName: order.customerName,
      email: order.email,
      status: order.status,
      orderType: order.orderType,
      itemDescription: order.itemDescription,
      lineItems: order.lineItems,
      pickupCode: order.pickupCode,
      stripeSessionId: order.stripeSessionId,
      droppedOffAt: order.droppedOffAt,
      completedAt: order.completedAt,
      _creationTime: order._creationTime,
    };
  },
});

// PUBLIC: Get order by pickup code for customer tracking
export const getOrderByPickupCode = query({
  args: { pickupCode: v.string() },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .filter((q) => q.eq(q.field("pickupCode"), args.pickupCode))
      .first();

    if (!order) {
      return null;
    }

    // Return order WITHOUT admin-only PII (phone excluded)
    return {
      _id: order._id,
      customerName: order.customerName,
      email: order.email,
      status: order.status,
      orderType: order.orderType,
      itemDescription: order.itemDescription,
      lineItems: order.lineItems,
      pickupCode: order.pickupCode,
      stripeSessionId: order.stripeSessionId,
      droppedOffAt: order.droppedOffAt,
      completedAt: order.completedAt,
      _creationTime: order._creationTime,
    };
  },
});
