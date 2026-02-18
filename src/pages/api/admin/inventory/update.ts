import type { APIRoute } from 'astro';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';
import type { Id } from '../../../../../convex/_generated/dataModel';

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
      inventoryId,
      stripeProductId,
      name,
      description,
      category,
      showInShop,
      showInBuilder,
      playerType,
      stock,
    } = body as {
      inventoryId: string;
      stripeProductId: string;
      name?: string;
      description?: string;
      category?: string;
      showInShop?: boolean;
      showInBuilder?: boolean;
      playerType?: string;
      stock?: number;
    };

    if (!inventoryId || !stripeProductId) {
      return new Response(JSON.stringify({ error: 'Missing inventoryId or stripeProductId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const client = new ConvexHttpClient(import.meta.env.PUBLIC_CONVEX_URL);
    const token = await auth.getToken({ template: 'convex' });
    if (token) client.setAuth(token);

    await client.action(api.inventory.updateStripeProduct, {
      inventoryId: inventoryId as Id<'inventory'>,
      stripeProductId,
      name,
      description,
      category: category as Category | undefined,
      showInShop,
      showInBuilder,
      playerType: playerType as PlayerType | undefined,
      stock,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Inventory update error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
