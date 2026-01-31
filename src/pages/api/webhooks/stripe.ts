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

    // 5. Extract session data
    const session = event.data.object as Stripe.Checkout.Session;

    if (!session.customer_details?.email) {
      console.error('Missing customer email in session:', session.id);
      return new Response(
        JSON.stringify({ error: 'Missing required customer data' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const customerName = session.customer_details.name || 'Unknown Customer';
    const email = session.customer_details.email;
    const phone = session.customer_details.phone || undefined;
    const stripeSessionId = session.id;
    const orderType = (session.metadata?.orderType as 'service' | 'product') || 'service';
    const itemDescription = session.metadata?.itemDescription || 'No description provided';

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
