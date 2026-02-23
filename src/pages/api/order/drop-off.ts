import type { APIRoute } from 'astro';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';

export const POST: APIRoute = async ({ request, redirect }) => {
  let pickupCode = '';
  try {
    const data = await request.formData();
    pickupCode = (data.get('pickupCode') as string) ?? '';
    const confirmCode = (data.get('confirmCode') as string) ?? '';

    if (!pickupCode || !confirmCode) {
      return redirect(`/order/${pickupCode}?error=server`);
    }

    const client = new ConvexHttpClient(import.meta.env.PUBLIC_CONVEX_URL);
    await client.mutation(api.orders.confirmDropOff, { pickupCode, confirmCode });

    return redirect(`/order/${pickupCode}?success=dropoff`);
  } catch (err: any) {
    const msg: string = err?.message ?? '';
    if (msg.includes('already been dropped off')) {
      return redirect(`/order/${pickupCode}?error=already-done`);
    }
    if (msg.includes('does not match')) {
      return redirect(`/order/${pickupCode}?error=wrong-code`);
    }
    return redirect(`/order/${pickupCode}?error=server`);
  }
};
