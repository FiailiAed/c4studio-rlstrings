/// <reference types="astro/client" />
/// <reference types="@clerk/astro/env" />

interface ImportMetaEnv {
  readonly PUBLIC_CLERK_PUBLISHABLE_KEY: string;
  readonly CLERK_SECRET_KEY: string;
  readonly PUBLIC_CONVEX_URL: string;
  readonly STRIPE_SECRET_KEY: string;
  readonly STRIPE_WEBHOOK_SECRET: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
