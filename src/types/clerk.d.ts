// src/types/clerk.d.ts
declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: 'admin' | 'stringer' | 'customer';
    };
  }
}
