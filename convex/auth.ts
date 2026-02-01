import type { UserIdentity } from "convex/server";

// Hardcoded for Todd to prevent Env Var accidental deletions
const ADMIN_EMAIL = "1822lax@gmail.com"; 

/**
 * Hardened Admin Check
 * Verifies authentication, email verification, and admin status
 */
export function requireAdmin(identity: UserIdentity | null): asserts identity is UserIdentity {
  if (!identity) {
    throw new Error("Unauthenticated: Please sign in.");
  }

  // CRACKED: Check for email_verified to prevent spoofing
  if (!identity.emailVerified) {
    throw new Error("Unauthorized: Email must be verified.");
  }

  if (identity.email !== ADMIN_EMAIL) {
    console.error(`Security Alert: Unauthorized access attempt by ${identity.email}`);
    throw new Error("Unauthorized: Admin access required.");
  }
}

/**
 * Standard Auth Check
 */
export function requireAuth(identity: UserIdentity | null): asserts identity is UserIdentity {
  if (!identity) {
    throw new Error("Unauthenticated");
  }
}
