declare var process: { env: Record<string, string | undefined> };

import { v } from "convex/values";
import { action, query } from "./_generated/server";
import { internal } from "./_generated/api"; // FIX 1: Import internal
import { requireAdmin } from "./auth";
import Stripe from "stripe";

// FIX 2 & 3: Safer initialization
const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is missing in Convex Dashboard");
  return new Stripe(key); // Let Stripe use the account default version
};

export const createProductAndSync = action({
  args: {
    name: v.string(),
    priceInCents: v.number(),
    category: v.union(
      v.literal("head"),
      v.literal("shaft"),
      v.literal("mesh"),
      v.literal("strings"),
      v.literal("service")
    )
  },
  handler: async (ctx, args) => {
    const stripe = getStripe();

    // 1. Create Product in Stripe
    const product = await stripe.products.create({
      name: args.name,
      metadata: { category: args.category },
    });

    // 2. Create Price in Stripe
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: args.priceInCents,
      currency: "usd",
    });

    // 3. Write to Convex DB using the internal object
    // LFG - No more red squiggly lines.
    await ctx.runMutation(internal.inventory.addItem, {
      name: args.name,
      priceId: price.id,
      stock: 0,
      category: args.category,
    });

    return { success: true, stripeId: product.id };
  },
});

// IMPORT: Sync Stripe products to Convex inventory
export const importStripeProducts = action({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);

    const stripe = getStripe();

    const prices = await stripe.prices.list({
      active: true,
      limit: 100,
      expand: ['data.product']
    });

    const imported = [];

    for (const price of prices.data) {
      const product = price.product as Stripe.Product;

      // Skip if already exists
      const existing = await ctx.runQuery(internal.inventory.getByPriceId, {
        priceId: price.id
      });

      if (existing) continue;

      // Get category from Stripe product metadata
      const category = product.metadata?.category || "service";

      // Validate category
      const validCategories = ["head", "shaft", "mesh", "strings", "service"];
      if (!validCategories.includes(category)) {
        console.warn(`Invalid category ${category} for ${product.name}`);
        continue;
      }

      // Insert into Convex
      await ctx.runMutation(internal.inventory.addItem, {
        name: product.name,
        priceId: price.id,
        stock: 0,
        category: category as any
      });

      imported.push({ name: product.name, priceId: price.id, category });
    }

    return { success: true, imported };
  }
});

// ATOMIC CHECKOUT: Create multi-line-item checkout session
export const createAtomicCheckout = action({
  args: {
    items: v.array(v.object({
      priceId: v.string(),
      quantity: v.number()
    })),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, args): Promise<{ sessionId: string; url: string | null; buildType: string }> => {
    const stripe = getStripe();

    // 1. Validate stock levels
    const stockErrors: string[] = [];
    for (const item of args.items) {
      const inventoryItem = await ctx.runQuery(internal.inventory.getByPriceId, {
        priceId: item.priceId
      });

      if (!inventoryItem) {
        stockErrors.push(`Product ${item.priceId} not found`);
        continue;
      }

      if (inventoryItem.stock < item.quantity) {
        stockErrors.push(`Insufficient stock for ${inventoryItem.name}: requested ${item.quantity}, available ${inventoryItem.stock}`);
      }
    }

    if (stockErrors.length > 0) {
      throw new Error(`Stock validation failed: ${stockErrors.join(", ")}`);
    }

    // 2. Fetch product details for metadata
    const lineItemsForMetadata: Array<{
      priceId: string;
      name: string;
      quantity: number;
      category: string;
    }> = await Promise.all(
      args.items.map(async (item): Promise<{ priceId: string; name: string; quantity: number; category: string }> => {
        const inventoryItem = await ctx.runQuery(internal.inventory.getByPriceId, {
          priceId: item.priceId
        });
        return {
          priceId: item.priceId,
          name: inventoryItem!.name,
          quantity: item.quantity,
          category: inventoryItem!.category
        };
      })
    );

    // 3. Determine build type
    const categories: Set<string> = new Set(lineItemsForMetadata.map((i: { category: string }) => i.category));
    const hasService: boolean = categories.has("service");
    const hasProducts: boolean = categories.size > (hasService ? 1 : 0);

    let buildType: string;
    if (hasService && !hasProducts) {
      buildType = "service_only";
    } else if (categories.has("head") && categories.has("mesh") && categories.has("strings")) {
      buildType = "full_setup";
    } else {
      buildType = "custom";
    }

    // 4. Create Stripe Checkout Session
    const session: Stripe.Checkout.Session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: args.items.map(item => ({
        price: item.priceId,
        quantity: item.quantity
      })),
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      metadata: {
        orderType: hasService ? "service" : "product",
        buildType,
        itemsJson: JSON.stringify(lineItemsForMetadata)
      },
      billing_address_collection: "required",
      phone_number_collection: {
        enabled: true
      }
    });

    return {
      sessionId: session.id,
      url: session.url,
      buildType
    };
  }
});

// WEBHOOK HANDLER: Process completed checkout sessions
export const handleCheckoutCompleted = action({
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
      category: v.string()
    })))
  },
  handler: async (ctx, args): Promise<{ success: boolean; orderId: string }> => {
    // Enrich line items with category from inventory
    let enrichedLineItems: any[] | undefined;

    if (args.lineItems) {
      enrichedLineItems = await Promise.all(
        args.lineItems.map(async (item) => {
          const inventoryItem = await ctx.runQuery(internal.inventory.getByPriceId, {
            priceId: item.priceId
          });

          return {
            ...item,
            category: inventoryItem?.category || "service"
          };
        })
      );

      // Decrement stock for each item
      for (const item of enrichedLineItems) {
        const inventoryItem = await ctx.runQuery(internal.inventory.getByPriceId, {
          priceId: item.priceId
        });

        if (inventoryItem && inventoryItem._id) {
          await ctx.runMutation(internal.inventory.decrementStock, {
            inventoryId: inventoryItem._id,
            quantity: item.quantity
          });
        }
      }
    }

    // Create order via internal mutation
    const orderId: string = await ctx.runMutation(internal.orders.createOrder, {
      customerName: args.customerName,
      email: args.email,
      phone: args.phone,
      stripeSessionId: args.stripeSessionId,
      orderType: args.orderType,
      itemDescription: args.itemDescription,
      lineItems: enrichedLineItems,
    });

    return { success: true, orderId };
  },
});

// DEBUG: Get inventory comparison data
export const getInventoryComparison = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);

    const inventory = await ctx.db.query("inventory").collect();
    return inventory.map(item => ({
      convexId: item._id,
      name: item.name,
      priceId: item.priceId,
      stock: item.stock,
      category: item.category,
    }));
  },
});

// Fetch all Stripe products/prices (public for storefront)
export const fetchStripeProducts = action({
  handler: async () => {
    const stripe = getStripe();

    const prices = await stripe.prices.list({
      limit: 100,
      expand: ['data.product'],
      active: true, // Only fetch active prices
    });

    return prices.data.map(price => ({
      priceId: price.id,
      productName: (price.product as any).name,
      amount: price.unit_amount,
      currency: price.currency,
      active: price.active,
    }));
  },
});

// DEBUG: Fetch webhook metadata for a session
export const fetchSessionMetadata = action({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);

    const stripe = getStripe();

    try {
      const session = await stripe.checkout.sessions.retrieve(args.sessionId, {
        expand: ['line_items', 'customer', 'payment_intent'],
      });

      return {
        success: true,
        session: JSON.parse(JSON.stringify(session)),
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        sessionId: args.sessionId,
      };
    }
  },
});

// DEBUG: Ping Stripe to verify API key
export const debugPingStripe = action({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);

    const stripe = getStripe();

    try {
      const account = await stripe.accounts.retrieve();
      return {
        success: true,
        accountName: account.business_profile?.name || account.email || account.id,
        accountId: account.id,
      };
    } catch (err: any) {
      throw new Error(`Stripe API error: ${err.message}`);
    }
  },
});
