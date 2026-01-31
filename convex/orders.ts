import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
