import { query, mutation, action, internalMutation, internalQuery } from "./_generated/server";
import { internal, api } from "./_generated/api";
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
    showInShop: v.optional(v.boolean()),
    showInBuilder: v.optional(v.boolean()),
    description: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    stripeProductId: v.optional(v.string()),
    unitAmount: v.optional(v.number()),
    currency: v.optional(v.string()),
    priceType: v.optional(v.union(v.literal("one_time"), v.literal("recurring"))),
    playerType: v.optional(v.union(v.literal("boys"), v.literal("girls"), v.literal("goalies"))),
  },
  handler: async (ctx, args) => {
    const { existingId, priceId, ...fields } = args;
    if (existingId) {
      await ctx.db.patch(existingId, fields);
      return { action: "updated" as const };
    } else {
      await ctx.db.insert("inventory", {
        priceId,
        stock: 0,
        ...fields,
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
      description?: string | null;
      images?: string[];
      metadata?: Record<string, string>;
      default_price?: { id: string; unit_amount?: number | null; currency?: string; type?: string } | string | null;
    }>;

    let created = 0;
    let updated = 0;

    for (const product of products) {
      const priceObj = product.default_price;
      const priceId = typeof priceObj === "object" && priceObj !== null ? priceObj.id : typeof priceObj === "string" ? priceObj : null;

      if (!priceId) continue;

      const existing = await ctx.runQuery(internal.inventory.getByPriceId, { priceId });
      const category = toCategory(product.metadata?.category);
      const showInShop = product.metadata?.shop === "true";
      const showInBuilder = product.metadata?.builder === "true";
      const rawPlayerType = product.metadata?.playerType;
      const playerType = (rawPlayerType === "boys" || rawPlayerType === "girls" || rawPlayerType === "goalies") ? rawPlayerType : undefined;

      const priceData = typeof priceObj === "object" && priceObj !== null ? priceObj : undefined;
      const priceType: "one_time" | "recurring" = priceData?.type === "recurring" ? "recurring" : "one_time";

      const result = await ctx.runMutation(internal.inventory.upsertFromStripe, {
        priceId,
        name: product.name,
        category,
        existingId: existing?._id,
        showInShop,
        showInBuilder,
        description: product.description ?? undefined,
        images: product.images ?? [],
        stripeProductId: product.id,
        unitAmount: priceData?.unit_amount ?? undefined,
        currency: priceData?.currency ?? "usd",
        priceType,
        playerType,
      });

      if (result.action === "created") created++;
      else updated++;
    }

    return { created, updated };
  },
});

// Get products flagged for the shop (in-stock only)
export const getShopProducts = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("inventory").collect();
    return items.filter((i) => i.showInShop === true && i.stock > 0);
  },
});

// Get products flagged for the builder (in-stock only)
export const getBuilderProducts = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("inventory").collect();
    return items.filter((i) => i.showInBuilder === true && i.stock > 0);
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

// Get a single inventory item by ID
export const getItemById = query({
  args: { id: v.id("inventory") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

// Internal: set stock directly (used by admin actions after Stripe sync)
export const updateStockInternal = internalMutation({
  args: { id: v.id("inventory"), stock: v.number() },
  handler: async (ctx, { id, stock }) => {
    await ctx.db.patch(id, { stock });
  },
});

// Internal: delete an inventory item without re-checking auth (caller is responsible)
export const deleteItemInternal = internalMutation({
  args: { id: v.id("inventory") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

// Update a Stripe product and sync the changes back to Convex
export const updateStripeProduct = action({
  args: {
    inventoryId: v.id("inventory"),
    stripeProductId: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(CATEGORY_VALUES),
    showInShop: v.optional(v.boolean()),
    showInBuilder: v.optional(v.boolean()),
    playerType: v.optional(v.union(
      v.literal("boys"),
      v.literal("girls"),
      v.literal("goalies"),
    )),
    stock: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const existing = await ctx.runQuery(api.inventory.getItemById, { id: args.inventoryId });
    if (!existing) throw new Error("Inventory item not found");

    const params: Record<string, string> = {};
    if (args.name !== undefined) params["name"] = args.name;
    if (args.description !== undefined) params["description"] = args.description ?? "";
    if (args.category !== undefined) params["metadata[category]"] = args.category;
    if (args.showInShop !== undefined) params["metadata[shop]"] = String(args.showInShop);
    if (args.showInBuilder !== undefined) params["metadata[builder]"] = String(args.showInBuilder);
    if (args.playerType !== undefined) params["metadata[playerType]"] = args.playerType;

    const res = await fetch(`https://api.stripe.com/v1/products/${args.stripeProductId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(params),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Stripe API error: ${res.status} ${text}`);
    }

    await ctx.runMutation(internal.inventory.upsertFromStripe, {
      priceId: existing.priceId,
      name: args.name ?? existing.name,
      category: args.category ?? existing.category,
      existingId: args.inventoryId,
      showInShop: args.showInShop ?? existing.showInShop,
      showInBuilder: args.showInBuilder ?? existing.showInBuilder,
      description: args.description ?? existing.description,
      images: existing.images,
      stripeProductId: args.stripeProductId,
      unitAmount: existing.unitAmount,
      currency: existing.currency,
      priceType: existing.priceType,
      playerType: args.playerType ?? existing.playerType,
    });

    if (args.stock !== undefined) {
      await ctx.runMutation(internal.inventory.updateStockInternal, {
        id: args.inventoryId,
        stock: args.stock,
      });
    }
  },
});

// Archive a Stripe product (sets active:false) and removes it from Convex
export const archiveStripeProduct = action({
  args: {
    inventoryId: v.id("inventory"),
    stripeProductId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const res = await fetch(`https://api.stripe.com/v1/products/${args.stripeProductId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ active: "false" }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Stripe API error: ${res.status} ${text}`);
    }

    await ctx.runMutation(internal.inventory.deleteItemInternal, { id: args.inventoryId });
  },
});

// Create a new Stripe product + price and sync it to Convex
export const createStripeProduct = action({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    unitAmount: v.number(),
    category: CATEGORY_VALUES,
    showInShop: v.optional(v.boolean()),
    showInBuilder: v.optional(v.boolean()),
    playerType: v.optional(v.union(
      v.literal("boys"),
      v.literal("girls"),
      v.literal("goalies"),
    )),
    stock: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    // Create product in Stripe
    const productParams: Record<string, string> = {
      name: args.name,
      "metadata[category]": args.category,
      "metadata[shop]": String(args.showInShop ?? false),
      "metadata[builder]": String(args.showInBuilder ?? false),
    };
    if (args.description) productParams["description"] = args.description;
    if (args.playerType) productParams["metadata[playerType]"] = args.playerType;

    const productRes = await fetch("https://api.stripe.com/v1/products", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(productParams),
    });

    if (!productRes.ok) {
      const text = await productRes.text();
      throw new Error(`Stripe product creation error: ${productRes.status} ${text}`);
    }

    const newProduct = await productRes.json() as { id: string };

    // Create price in Stripe
    const priceRes = await fetch("https://api.stripe.com/v1/prices", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        product: newProduct.id,
        unit_amount: String(args.unitAmount),
        currency: "usd",
        billing_scheme: "per_unit",
      }),
    });

    if (!priceRes.ok) {
      const text = await priceRes.text();
      throw new Error(`Stripe price creation error: ${priceRes.status} ${text}`);
    }

    const newPrice = await priceRes.json() as { id: string };

    // Sync into Convex
    await ctx.runMutation(internal.inventory.upsertFromStripe, {
      priceId: newPrice.id,
      name: args.name,
      category: args.category,
      showInShop: args.showInShop,
      showInBuilder: args.showInBuilder,
      description: args.description,
      stripeProductId: newProduct.id,
      unitAmount: args.unitAmount,
      currency: "usd",
      priceType: "one_time",
      playerType: args.playerType,
    });

    // Set initial stock (upsertFromStripe inserts with stock: 0)
    if (args.stock > 0) {
      const inserted = await ctx.runQuery(internal.inventory.getByPriceId, { priceId: newPrice.id });
      if (inserted) {
        await ctx.runMutation(internal.inventory.updateStockInternal, {
          id: inserted._id,
          stock: args.stock,
        });
      }
    }
  },
});

