import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

// TODD'S VIEW: Get all orders that need work
export const getActiveOrders = query({
  handler: async (ctx) => {
    // In V2, we add a check here to ensure only 'Todd' can see this via Clerk
    return await ctx.db
      .query("orders")
      .withIndex("by_status")
      .order("desc")
      .collect();
  },
});

// GET SINGLE ORDER: For customer receipt and drop-off pages
export const getOrderById = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    return order;
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
    const { orderId, newStatus } = args;
    
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
    });

    return orderId;
  },
});
