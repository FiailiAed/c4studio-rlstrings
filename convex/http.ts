import { httpRouter } from "convex/server";
import { components, internal } from "./_generated/api";
import { registerRoutes } from "@convex-dev/stripe";
import Stripe from "stripe";

const http = httpRouter();

// Register Stripe webhook handler at /stripe/webhook
registerRoutes(http, components.stripe, {
  webhookPath: "/stripe/webhook",
  events: {
    "checkout.session.completed": async (ctx, event) => {
      const session = event.data.object as Stripe.Checkout.Session;

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

      // Retrieve session with expanded line items and product data
      const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ["line_items.data.price.product"],
      });

      const customerName = fullSession.customer_details?.name ?? "Unknown";
      const email = fullSession.customer_details?.email ?? "unknown@email.com";
      const phone = fullSession.customer_details?.phone ?? undefined;
      const orderType = (fullSession.metadata?.orderType as "service" | "product") ?? "service";

      const rawLineItems = fullSession.line_items?.data ?? [];

      const lineItems = rawLineItems.map((item) => {
        const product = item.price?.product as Stripe.Product | undefined;
        const categoryRaw = product?.metadata?.category ?? "service";
        const validCategories = ["head", "shaft", "mesh", "strings", "service", "upsell"] as const;
        const category = validCategories.includes(categoryRaw as typeof validCategories[number])
          ? (categoryRaw as typeof validCategories[number])
          : ("service" as const);

        return {
          priceId: item.price?.id ?? "",
          productName: item.description ?? product?.name ?? "Unknown",
          quantity: item.quantity ?? 1,
          unitAmount: item.price?.unit_amount ?? 0,
          totalAmount: item.amount_total ?? 0,
          category,
        };
      });

      const itemDescription = lineItems.map((li) => li.productName).join(", ") || "Order";

      await ctx.runMutation(internal.orders.createNewOrderAfterStripeCheckoutSession, {
        stripeSessionId: session.id,
        customerName,
        email,
        phone,
        stripeCustomerId: (session.customer as string) || undefined,
        orderType,
        itemDescription,
        lineItems,
        pickupCode: fullSession.metadata?.pickupCode,
      });
    },
  },
});

export default http;
