import type { APIRoute } from 'astro';
import { getAllHealthStatus } from '../../../lib/health-checks';

/**
 * GET /api/admin/health-check
 * Returns current health status of all services
 * Requires authentication via Clerk middleware
 */
export const GET: APIRoute = async ({ locals }) => {
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

    // Run all health checks
    const healthStatus = await getAllHealthStatus(userId);

    return new Response(
      JSON.stringify(healthStatus),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0'
        }
      }
    );
  } catch (error) {
    console.error('Health check error:', error);
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
