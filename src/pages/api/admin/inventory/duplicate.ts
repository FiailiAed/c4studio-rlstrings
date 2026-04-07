import type { APIRoute } from 'astro';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';
import type { Id } from '../../../../../convex/_generated/dataModel';

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
    const { inventoryId } = body as { inventoryId: string };

    if (!inventoryId) {
      return new Response(JSON.stringify({ error: 'Missing inventoryId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const client = new ConvexHttpClient(import.meta.env.PUBLIC_CONVEX_URL);
    const token = await auth.getToken({ template: 'convex' });
    if (token) client.setAuth(token);

    const result = await client.action(api.inventory.duplicateStripeProduct, {
      inventoryId: inventoryId as Id<'inventory'>,
    });

    return new Response(JSON.stringify({ success: true, newInventoryId: result.newInventoryId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Duplicate product error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
