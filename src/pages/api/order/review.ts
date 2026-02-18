import type { APIRoute } from 'astro';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';

const GOOGLE_REVIEW_URL = 'https://g.page/r/YOUR_GOOGLE_REVIEW_LINK/review';

export const POST: APIRoute = async ({ request, redirect }) => {
  let pickupCode = '';
  try {
    const data = await request.formData();
    pickupCode = (data.get('pickupCode') as string) ?? '';

    if (!pickupCode) {
      return redirect('/order?error=server');
    }

    const client = new ConvexHttpClient(import.meta.env.PUBLIC_CONVEX_URL);
    await client.mutation(api.orders.confirmReview, { pickupCode });

    return redirect(GOOGLE_REVIEW_URL);
  } catch {
    return redirect(`/order/${pickupCode}?error=server`);
  }
};
