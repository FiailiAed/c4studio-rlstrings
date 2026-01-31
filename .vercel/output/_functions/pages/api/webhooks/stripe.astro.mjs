import Stripe from 'stripe';
import { ConvexHttpClient } from 'convex/browser';
import { componentsGeneric, anyApi } from 'convex/server';
export { renderers } from '../../../renderers.mjs';

/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */


/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
const api = anyApi;
componentsGeneric();

const prerender = false;
const POST = async ({ request }) => {
  try {
    const rawBody = await request.text();
    const sig = request.headers.get("stripe-signature");
    if (!sig) {
      return new Response(
        JSON.stringify({ error: "Missing stripe-signature header" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!stripeKey || !webhookSecret) {
      console.error("Missing Stripe configuration");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    const stripe = new Stripe(stripeKey);
    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    if (event.type !== "checkout.session.completed") {
      return new Response(
        JSON.stringify({ received: true }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    const session = event.data.object;
    if (!session.customer_details?.email) {
      console.error("Missing customer email in session:", session.id);
      return new Response(
        JSON.stringify({ error: "Missing required customer data" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const customerName = session.customer_details.name || "Unknown Customer";
    const email = session.customer_details.email;
    const phone = session.customer_details.phone || void 0;
    const stripeSessionId = session.id;
    const orderType = session.metadata?.orderType || "service";
    const itemDescription = session.metadata?.itemDescription || "No description provided";
    const convexUrl = "https://kindly-beagle-851.convex.cloud";
    if (!convexUrl) ;
    const convex = new ConvexHttpClient(convexUrl);
    try {
      const result = await convex.action(api.stripe.handleCheckoutCompleted, {
        customerName,
        email,
        phone,
        stripeSessionId,
        orderType,
        itemDescription
      });
      console.log("Order created successfully:", result.orderId);
      return new Response(
        JSON.stringify({ received: true, orderId: result.orderId }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (err) {
      console.error("Failed to create order in Convex:", err);
      return new Response(
        JSON.stringify({ error: "Failed to create order" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    console.error("Unexpected error in webhook handler:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
