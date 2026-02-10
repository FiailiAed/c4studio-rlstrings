import { ConvexClient } from "convex/browser";
import Stripe from "stripe";
import { api } from "../../convex/_generated/api";

// ═══════════════════════════════════════════════════════════════════════════
// Types & Interfaces
// ═══════════════════════════════════════════════════════════════════════════

export type ServiceStatusType = 'connected' | 'disconnected' | 'warning' | 'unknown';

export interface ServiceStatus {
  name: string;
  status: ServiceStatusType;
  message: string;
  publicKey?: string;
  secretKeyMasked?: string;
  metadata?: Record<string, string>;
}

export interface HealthCheckResult {
  services: ServiceStatus[];
  overallStatus: ServiceStatusType;
  timestamp: string;
  environment?: Record<string, string>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Masks a secret key by showing first 8 and last 3 characters
 * Example: sk_test_...N2k
 */
export function maskSecret(key: string): string {
  if (!key || key.length < 12) {
    return '***';
  }
  const prefix = key.substring(0, 8);
  const suffix = key.substring(key.length - 3);
  return `${prefix}...${suffix}`;
}

/**
 * Wraps an async function with a timeout
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 5000
): Promise<T> {
  const timeout = new Promise<T>((_, reject) =>
    setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
  );
  return Promise.race([promise, timeout]);
}

// ═══════════════════════════════════════════════════════════════════════════
// Service Health Checks
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check Clerk authentication service health
 */
export async function checkClerkHealth(userId?: string | null): Promise<ServiceStatus> {
  const publicKey = import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY;
  const secretKey = import.meta.env.CLERK_SECRET_KEY;

  if (!publicKey || !secretKey) {
    return {
      name: 'Clerk',
      status: 'disconnected',
      message: 'Missing environment variables',
      publicKey: publicKey || 'Not configured',
      secretKeyMasked: secretKey ? maskSecret(secretKey) : 'Not configured'
    };
  }

  // Check if user is authenticated
  const isAuthenticated = !!userId;

  return {
    name: 'Clerk',
    status: isAuthenticated ? 'connected' : 'warning',
    message: isAuthenticated ? 'Authenticated session active' : 'No active session',
    publicKey,
    secretKeyMasked: maskSecret(secretKey),
    metadata: {
      sessionStatus: isAuthenticated ? 'Active' : 'Inactive'
    }
  };
}

/**
 * Check Convex database health
 */
export async function checkConvexHealth(): Promise<ServiceStatus> {
  const convexUrl = import.meta.env.PUBLIC_CONVEX_URL;
  const deployment = import.meta.env.CONVEX_DEPLOYMENT;

  if (!convexUrl) {
    return {
      name: 'Convex',
      status: 'disconnected',
      message: 'Missing PUBLIC_CONVEX_URL',
      publicKey: 'Not configured'
    };
  }

  try {
    // Create a client and test a query
    const client = new ConvexClient(convexUrl);

    // Test connection with a simple query
    await withTimeout(
      client.query(api.orders.listOrders, {}),
      5000
    );

    return {
      name: 'Convex',
      status: 'connected',
      message: 'Database connection active',
      publicKey: convexUrl,
      metadata: {
        deployment: deployment || 'Unknown'
      }
    };
  } catch (error) {
    return {
      name: 'Convex',
      status: 'disconnected',
      message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      publicKey: convexUrl,
      metadata: {
        deployment: deployment || 'Unknown'
      }
    };
  }
}

/**
 * Check Stripe payment service health
 */
export async function checkStripeHealth(): Promise<ServiceStatus> {
  const secretKey = import.meta.env.STRIPE_SECRET_KEY;
  const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey) {
    return {
      name: 'Stripe',
      status: 'disconnected',
      message: 'Missing STRIPE_SECRET_KEY',
      secretKeyMasked: 'Not configured'
    };
  }

  try {
    // Initialize Stripe client
    const stripe = new Stripe(secretKey, {
      apiVersion: '2026-01-28.clover',
    });

    // Test connection with balance retrieve
    const balance = await withTimeout(
      stripe.balance.retrieve(),
      5000
    );

    // Determine if in test mode
    const isTestMode = secretKey.includes('test');

    return {
      name: 'Stripe',
      status: 'connected',
      message: isTestMode ? 'Test Mode Active' : 'Live Mode Active',
      secretKeyMasked: maskSecret(secretKey),
      metadata: {
        mode: isTestMode ? 'Test' : 'Live',
        currency: balance.available?.[0]?.currency?.toUpperCase() || 'Unknown',
        webhookConfigured: webhookSecret ? 'Yes' : 'No'
      }
    };
  } catch (error) {
    return {
      name: 'Stripe',
      status: 'disconnected',
      message: `API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      secretKeyMasked: maskSecret(secretKey)
    };
  }
}

/**
 * Check Vercel deployment environment
 */
export async function checkVercelHealth(): Promise<ServiceStatus> {
  const isVercel = !!import.meta.env.VERCEL;
  const vercelEnv = import.meta.env.VERCEL_ENV;
  const gitSha = import.meta.env.VERCEL_GIT_COMMIT_SHA;

  if (!isVercel) {
    return {
      name: 'Vercel',
      status: 'warning',
      message: 'Running in local development',
      metadata: {
        environment: 'Local',
        runtime: 'Bun'
      }
    };
  }

  return {
    name: 'Vercel',
    status: 'connected',
    message: 'Deployed on Vercel Edge Network',
    metadata: {
      environment: vercelEnv || 'Unknown',
      commit: gitSha ? gitSha.substring(0, 7) : 'Unknown'
    }
  };
}

/**
 * Check live site availability
 */
export async function checkSiteHealth(): Promise<ServiceStatus> {
  try {
    const response = await withTimeout(
      fetch('https://rlstrings.com', {
        method: 'HEAD',
        cache: 'no-store'
      }),
      5000
    );

    if (response.ok) {
      return {
        name: 'Live Site',
        status: 'connected',
        message: 'Site is accessible',
        publicKey: 'https://rlstrings.com',
        metadata: {
          statusCode: response.status.toString()
        }
      };
    } else {
      return {
        name: 'Live Site',
        status: 'warning',
        message: `HTTP ${response.status}`,
        publicKey: 'https://rlstrings.com',
        metadata: {
          statusCode: response.status.toString()
        }
      };
    }
  } catch (error) {
    return {
      name: 'Live Site',
      status: 'disconnected',
      message: `Unreachable: ${error instanceof Error ? error.message : 'Unknown error'}`,
      publicKey: 'https://rlstrings.com'
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Orchestrator
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Run all health checks and return comprehensive status
 */
export async function getAllHealthStatus(userId?: string | null): Promise<HealthCheckResult> {
  // Run all checks in parallel
  const [clerk, convex, stripe, vercel, site] = await Promise.all([
    checkClerkHealth(userId),
    checkConvexHealth(),
    checkStripeHealth(),
    checkVercelHealth(),
    checkSiteHealth()
  ]);

  const services = [clerk, convex, stripe, vercel, site];

  // Determine overall status
  const hasDisconnected = services.some(s => s.status === 'disconnected');
  const hasWarning = services.some(s => s.status === 'warning');

  let overallStatus: ServiceStatusType;
  if (hasDisconnected) {
    overallStatus = 'disconnected';
  } else if (hasWarning) {
    overallStatus = 'warning';
  } else {
    overallStatus = 'connected';
  }

  return {
    services,
    overallStatus,
    timestamp: new Date().toISOString(),
    environment: {
      PUBLIC_CONVEX_URL: import.meta.env.PUBLIC_CONVEX_URL || 'Not set',
      PUBLIC_CLERK_PUBLISHABLE_KEY: import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY || 'Not set',
      VERCEL_ENV: import.meta.env.VERCEL_ENV || 'Not deployed'
    }
  };
}
