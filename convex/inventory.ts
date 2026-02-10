import { query, mutation, action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdmin } from "./auth";
import { v } from "convex/values";

const CATEGORY_VALUES = v.union(
  v.literal("head"),
  v.literal("shaft"),
  v.literal("mesh"),
  v.literal("strings"),
  v.literal("service"),
  v.literal("upsell")
);

type Category = "head" | "shaft" | "mesh" | "strings" | "service" | "upsell";

const VALID_CATEGORIES: Category[] = ["head", "shaft", "mesh", "strings", "service", "upsell"];

function toCategory(value: string | undefined): Category {
  if (value && VALID_CATEGORIES.includes(value as Category)) {
    return value as Category;
  }
  return "service";
}

// Get all inventory
export const listInventory = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("inventory").order("desc").collect();
  },
});

// Add new item to inventory (admin only)
export const addItem = mutation({
  args: {
    name: v.string(),
    priceId: v.string(),
    stock: v.number(),
    category: CATEGORY_VALUES,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);

    return await ctx.db.insert("inventory", {
      name: args.name,
      priceId: args.priceId,
      stock: args.stock,
      category: args.category,
    });
  },
});

// Delete an inventory item (admin only)
export const deleteItem = mutation({
  args: { inventoryId: v.id("inventory") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);

    const item = await ctx.db.get(args.inventoryId);
    if (!item) throw new Error("Item not found");

    await ctx.db.delete(args.inventoryId);
  },
});

// Get all available equipment for the store
export const getStorefront = query({
  handler: async (ctx) => {
    return await ctx.db.query("inventory").collect();
  },
});

// Get storefront inventory (in-stock items only, grouped by category)
export const getStorefrontFiltered = query({
  handler: async (ctx) => {
    const items = await ctx.db
      .query("inventory")
      .filter(q => q.gt(q.field("stock"), 0))
      .collect();

    const grouped = {
      head: items.filter(i => i.category === "head"),
      mesh: items.filter(i => i.category === "mesh"),
      strings: items.filter(i => i.category === "strings"),
      service: items.filter(i => i.category === "service"),
      upsell: items.filter(i => i.category === "upsell"),
    };

    return { items, grouped };
  }
});

// Update stock levels after a purchase or manual restock
export const updateStock = mutation({
  args: {
    inventoryId: v.id("inventory"),
    adjustment: v.number()
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);

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
      category: CATEGORY_VALUES,
    }))
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);

    for (const item of args.items) {
      await ctx.db.insert("inventory", item);
    }
  },
});

// Get inventory item by Stripe price ID (internal for actions)
export const getByPriceId = internalQuery({
  args: { priceId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("inventory")
      .withIndex("by_priceId", q => q.eq("priceId", args.priceId))
      .first();
  }
});

// Internal mutation to upsert inventory from Stripe sync
export const upsertFromStripe = internalMutation({
  args: {
    priceId: v.string(),
    name: v.string(),
    category: CATEGORY_VALUES,
    existingId: v.optional(v.id("inventory")),
  },
  handler: async (ctx, args) => {
    if (args.existingId) {
      await ctx.db.patch(args.existingId, { name: args.name });
      return { action: "updated" as const };
    } else {
      await ctx.db.insert("inventory", {
        name: args.name,
        priceId: args.priceId,
        stock: 0,
        category: args.category,
      });
      return { action: "created" as const };
    }
  },
});

// Sync products from Stripe into inventory
export const syncFromStripe = action({
  args: {},
  handler: async (ctx): Promise<{ created: number; updated: number }> => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    // Fetch all active products with default_price expanded
    const params = new URLSearchParams({
      active: "true",
      limit: "100",
      "expand[]": "data.default_price",
    });

    const res = await fetch(`https://api.stripe.com/v1/products?${params}`, {
      headers: { Authorization: `Bearer ${stripeKey}` },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Stripe API error: ${res.status} ${text}`);
    }

    const data = await res.json();
    const products = data.data as Array<{
      id: string;
      name: string;
      metadata?: Record<string, string>;
      default_price?: { id: string } | string | null;
    }>;

    let created = 0;
    let updated = 0;

    for (const product of products) {
      const priceObj = product.default_price;
      const priceId = typeof priceObj === "object" && priceObj !== null ? priceObj.id : typeof priceObj === "string" ? priceObj : null;

      if (!priceId) continue;

      const existing = await ctx.runQuery(internal.inventory.getByPriceId, { priceId });
      const category = toCategory(product.metadata?.category);

      const result = await ctx.runMutation(internal.inventory.upsertFromStripe, {
        priceId,
        name: product.name,
        category,
        existingId: existing?._id,
      });

      if (result.action === "created") created++;
      else updated++;
    }

    return { created, updated };
  },
});

// Decrement stock after successful payment
export const decrementStock = internalMutation({
  args: {
    inventoryId: v.id("inventory"),
    quantity: v.number()
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.inventoryId);
    if (!item) throw new Error("Inventory item not found");

    const newStock = Math.max(0, item.stock - args.quantity);
    await ctx.db.patch(args.inventoryId, { stock: newStock });

    return { newStock };
  }
});
