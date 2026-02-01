declare var process: { env: Record<string, string | undefined> };

import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';

export const POST: APIRoute = async ({ request }) => {
  try {
    // 1. Get raw body for signature verification
    const rawBody = await request.text();
    const sig = request.headers.get('stripe-signature');

    if (!sig) {
      return new Response(
        JSON.stringify({ error: 'Missing stripe-signature header' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Initialize Stripe (inside function per CLAUDE.md)
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeKey || !webhookSecret) {
      console.error('Missing Stripe configuration');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(stripeKey);

    // 3. Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Handle only checkout.session.completed events
    if (event.type !== 'checkout.session.completed') {
      return new Response(
        JSON.stringify({ received: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 5. Retrieve session with expanded line items
    const sessionId = (event.data.object as Stripe.Checkout.Session).id;

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'line_items.data.price']
    });

    if (!session.customer_details?.email) {
      console.error('Missing customer email in session:', session.id);
      return new Response(
        JSON.stringify({ error: 'Missing required customer data' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Extract line items
    const lineItems: any[] = [];

    if (session.line_items?.data) {
      for (const item of session.line_items.data) {
        const price = item.price;
        if (!price) continue;

        lineItems.push({
          priceId: price.id,
          productName: item.description || "Unknown Product",
          quantity: item.quantity || 1,
          unitAmount: price.unit_amount || 0,
          totalAmount: item.amount_total || 0,
          category: "service" // Will be enriched from Convex inventory
        });
      }
    }

    // Generate itemDescription from line items
    let itemDescription: string;
    if (lineItems.length > 0) {
      const summary = lineItems.map(item => `${item.productName} (${item.quantity}x)`).join(", ");
      itemDescription = summary;
    } else {
      itemDescription = session.metadata?.itemDescription || "No description provided";
    }

    const customerName = session.customer_details.name || 'Unknown Customer';
    const email = session.customer_details.email;
    const phone = session.customer_details.phone || undefined;
    const stripeSessionId = session.id;
    const orderType = (session.metadata?.orderType as 'service' | 'product') || 'service';

    // 6. Initialize Convex client
    const convexUrl = import.meta.env.PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      console.error('PUBLIC_CONVEX_URL not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const convex = new ConvexHttpClient(convexUrl);

    // 7. Create order via Convex action
    try {
      const result = await convex.action(api.stripe.handleCheckoutCompleted, {
        customerName,
        email,
        phone,
        stripeSessionId,
        orderType,
        itemDescription,
        lineItems: lineItems.length > 0 ? lineItems : undefined,
      });

      console.log('Order created successfully:', result.orderId);

      return new Response(
        JSON.stringify({ received: true, orderId: result.orderId }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (err) {
      console.error('Failed to create order in Convex:', err);
      return new Response(
        JSON.stringify({ error: 'Failed to create order' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

  } catch (err) {
    console.error('Unexpected error in webhook handler:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
