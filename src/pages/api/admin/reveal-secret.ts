import type { APIRoute } from 'astro';

/**
 * POST /api/admin/reveal-secret
 * Returns the full secret key for a specified service
 * Requires authentication via Clerk middleware
 * Body: { service: 'clerk' | 'stripe' }
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Check authentication
    const auth = locals.auth();
    const userId = auth?.userId;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse request body
    const body = await request.json();
    const { service } = body;

    // Validate service parameter
    const validServices = ['clerk', 'stripe', 'stripe-webhook'];
    if (!service || !validServices.includes(service)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid service',
          message: `Service must be one of: ${validServices.join(', ')}`
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get the requested secret
    let secret: string | undefined;
    let secretName: string = '';

    switch (service) {
      case 'clerk':
        secret = import.meta.env.CLERK_SECRET_KEY;
        secretName = 'CLERK_SECRET_KEY';
        break;
      case 'stripe':
        secret = import.meta.env.STRIPE_SECRET_KEY;
        secretName = 'STRIPE_SECRET_KEY';
        break;
      case 'stripe-webhook':
        secret = import.meta.env.STRIPE_WEBHOOK_SECRET;
        secretName = 'STRIPE_WEBHOOK_SECRET';
        break;
    }

    if (!secret) {
      return new Response(
        JSON.stringify({
          error: 'Secret not found',
          message: `${secretName} is not configured in environment variables`
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({
        secret,
        secretName
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0'
        }
      }
    );
  } catch (error) {
    console.error('Reveal secret error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
