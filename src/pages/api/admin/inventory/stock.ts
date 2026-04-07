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
    const { inventoryId, adjustment } = body as {
      inventoryId: string;
      adjustment: number;
    };

    if (!inventoryId || adjustment === undefined) {
      return new Response(JSON.stringify({ error: 'Missing inventoryId or adjustment' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const client = new ConvexHttpClient(import.meta.env.PUBLIC_CONVEX_URL);
    const token = await auth.getToken({ template: 'convex' });
    if (token) client.setAuth(token);

    const result = await client.mutation(api.inventory.updateStock, {
      inventoryId: inventoryId as Id<'inventory'>,
      adjustment,
    });

    return new Response(JSON.stringify({ success: true, newStock: result.newStock }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Stock update error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
