import type { APIRoute } from 'astro';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';

type Category = 'head' | 'shaft' | 'mesh' | 'strings' | 'service' | 'upsell';
type PlayerType = 'boys' | 'girls' | 'goalies';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const auth = locals.auth();
    const userId = auth?.userId;
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const {
      name,
      description,
      unitAmount,
      category,
      showInShop,
      showInBuilder,
      playerType,
      stock,
    } = body as {
      name: string;
      description?: string;
      unitAmount: number;
      category: string;
      showInShop?: boolean;
      showInBuilder?: boolean;
      playerType?: string;
      stock: number;
    };

    if (!name || unitAmount === undefined || !category || stock === undefined) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const client = new ConvexHttpClient(import.meta.env.PUBLIC_CONVEX_URL);
    const token = await auth.getToken({ template: 'convex' });
    if (token) client.setAuth(token);

    await client.action(api.inventory.createStripeProduct, {
      name,
      description,
      unitAmount,
      category: category as Parameters<typeof api.inventory.createStripeProduct>[0]['category'],
      showInShop,
      showInBuilder,
      playerType: playerType as Parameters<typeof api.inventory.createStripeProduct>[0]['playerType'],
      stock,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Inventory create error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
