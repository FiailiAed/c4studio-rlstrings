import type { APIRoute } from 'astro';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { items, mode, pocketPreference } = await request.json() as {
      items: Array<{ priceId: string; quantity: number }>;
      mode: 'payment' | 'subscription';
      pocketPreference?: string;
    };

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No items in cart' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const convexUrl = import.meta.env.PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      throw new Error('CONVEX_URL not configured');
    }

    const client = new ConvexHttpClient(convexUrl);
    const result = await client.action(api.stripe.createPublicCheckout, {
      items,
      mode,
      pocketPreference,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Checkout API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
