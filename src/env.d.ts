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

interface Window {
  // Orders page handlers
  openPanel: (orderId: string) => void;
  closePanel: () => void;
  handleStatusUpdate: (
    orderId: string,
    newStatus: string,
    panelId: string,
    btn: HTMLButtonElement
  ) => Promise<void>;
  // Products page handlers
  openProductPanel: (id: string) => void;
  closeProductPanel: () => void;
  syncFromStripe: (btn: HTMLButtonElement) => Promise<void>;
  submitEdit: (inventoryId: string, stripeProductId: string, btn: HTMLButtonElement) => Promise<void>;
  confirmArchive: (inventoryId: string, stripeProductId: string, productName: string) => Promise<void>;
  submitNewProduct: (btn: HTMLButtonElement) => Promise<void>;
  switchTab: (cat: string) => void;
}
