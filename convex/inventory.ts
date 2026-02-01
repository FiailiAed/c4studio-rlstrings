import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internalMutation } from "./_generated/server";
import { requireAdmin } from "./auth";

// Add new item to inventory
export const addItem = internalMutation({
  args: {
    name: v.string(),
    priceId: v.string(),
    stock: v.number(),
    category: v.union(v.literal("head"), v.literal("shaft"), v.literal("mesh")),
  },
  handler: async (ctx, args) => {
    const itemId = await ctx.db.insert("inventory", {
      name: args.name,
      priceId: args.priceId,
      stock: args.stock,
      category: args.category,
    });
    return itemId;
  },
});

// Get all available equipment for the store
export const getStorefront = query({
  handler: async (ctx) => {
    return await ctx.db.query("inventory").collect();
  },
});

// Update stock levels after a purchase or manual restock
export const updateStock = mutation({
  args: {
    inventoryId: v.id("inventory"),
    adjustment: v.number() // Use -1 for a sale, or positive for restock
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity); // Only Todd can modify inventory

    const item = await ctx.db.get(args.inventoryId);
    if (!item) throw new Error("Item not found");

    const newStock = item.stock + args.adjustment;
    await ctx.db.patch(args.inventoryId, { stock: newStock });

    return { newStock };
  },
});

// Seed function to initially populate Todd's inventory
export const seedInventory = mutation({
  args: {
    items: v.array(v.object({
      name: v.string(),
      priceId: v.string(),
      stock: v.number(),
      category: v.union(v.literal("head"), v.literal("shaft"), v.literal("mesh"))
    }))
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity); // Prevent malicious data seeding

    for (const item of args.items) {
      await ctx.db.insert("inventory", item);
    }
  },
});
