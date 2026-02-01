import type { UserIdentity } from "convex/server";

declare var process: { env: Record<string, string | undefined> };

/**
 * Verifies user is admin (Todd - 1822lax@gmail.com)
 * @throws Error if not authenticated or not admin
 */
export function requireAdmin(identity: UserIdentity | null): asserts identity is UserIdentity {
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    throw new Error("ADMIN_EMAIL not configured");
  }

  if (identity.email !== adminEmail) {
    throw new Error("Unauthorized: Admin access required");
  }
}

/**
 * Verifies user is authenticated
 * @throws Error if not authenticated
 */
export function requireAuth(identity: UserIdentity | null): asserts identity is UserIdentity {
  if (!identity) {
    throw new Error("Not authenticated");
  }
}
