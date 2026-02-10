import type { UserIdentity } from "convex/server";

// Hardcoded for Todd to prevent Env Var accidental deletions
// claude-todo: remove hard coded admin email check
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

  // Check Clerk metadata role, fall back to ADMIN_EMAIL for Todd's account
  const customClaims = identity as UserIdentity & { metadata?: { role?: string } };
  const isAdminRole = customClaims.metadata?.role === "admin";
  const isAdminEmail = identity.email === ADMIN_EMAIL;

  if (!isAdminRole && !isAdminEmail) {
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
