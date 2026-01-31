# Project Context: RL Strings (1822 Lacrosse)

## 1. The Stack (Non-Negotiable)
- **Runtime:** Bun (Use `bun install`, `bunx`, `bun run`)
- **Frontend:** Astro + React (Islands Architecture)
- **Styling:** Tailwind CSS v4 (No `tailwind.config.js`, use `@theme` in CSS)
- **Backend:** Convex (Real-time database, serverless functions)
- **Auth:** Clerk (`@clerk/astro`)
- **Payments:** Stripe (Checkout, Webhooks, Connect)
- **Deployment:** Vercel

## 2. Core Philosophy
- **Typesafety is Law:** If it's not typed, it doesn't exist. Use Zod for validation.
- **Convex First:** Do not build API routes in Astro unless absolutely necessary (e.g., Webhooks). All data fetching and mutation logic lives in `convex/`.
- **"Todd-Proof" UX:** The Admin Dashboard must be resilient. No "developer" error messages. Handle failures gracefully with toast notifications.
- **Mobile-First:** 80% of usage is Todd on his phone at the field or parents dropping off sticks.

## 3. Architecture & Patterns

### Database (Convex)
- **Schema:** Defined in `convex/schema.ts`.
- **Tables:** - `orders`: Tracks the lifecycle of a stick (`paid` -> `dropped_off` -> `in_progress` -> `ready_for_pickup` -> `completed`).
  - `inventory`: Tracks physical items (Heads, Mesh, Shafts). Linked to Stripe via `priceId`.
- **Internal Mutations:** Sensitive logic (like Inventory sync) must be `internalMutation` and only accessible via Actions.
- **Authorization:** ALL public mutations must check `ctx.auth.getUserIdentity()`.

### Payments (Stripe)
- **Webhooks:** Handled in `convex/stripe.ts` via `httpAction`.
- **Security:** MUST verify `stripe-signature` using `stripe.webhooks.constructEvent`.
- **Sync:** Products are created in Stripe via Convex Actions (`createProductAndSync`), then IDs are stored in `inventory`.

### The "Drop-off" Flow
1. Parent buys online (Stripe).
2. Webhook creates Order in Convex (Status: `paid`).
3. Parent scans QR at "Stellar Athletics".
4. Frontend calls `confirmDropOff` mutation.
5. Status updates to `dropped_off`.

## 4. Coding Rules (The "Vibe Check")

### Do's
- Use `import { internal } from "./_generated/api"` for internal calls.
- Use `import { v } from "convex/values"` for arguments.
- Initialize Stripe inside functions/getters, NEVER at the global scope (avoids build crashes).
- Use `bun add` for new packages.

### Don'ts
- **NO** `useEffect` for data fetching. Use `useQuery` from `convex/react`.
- **NO** traditional Node.js `process.env` checks without type safety.
- **NO** manual CSS classes if a Tailwind utility exists.

## 5. Key File Structure
- `convex/schema.ts`: The Source of Truth.
- `convex/orders.ts`: Core business logic (Queries/Mutations).
- `convex/stripe.ts`: Webhook handlers and Stripe sync actions.
- `convex/inventory.ts`: Internal mutations for stock management.
- `src/pages/admin/`: Protected routes (Clerk Middleware) for Todd.

## 6. Common Errors & Fixes
- **"Internal not found":** Remember to run `bunx convex dev` to regenerate API types.
- **"Stripe API Key missing":** Ensure keys are set in BOTH Vercel (Frontend) and Convex Dashboard (Backend).
- **"Process is not defined":** Ensure `@types/node` is installed or `declare var process` is at the top of the file.

## 7. Route Specifications (Pre-Clerk Testing)
- `/order/[orderId]`: Customer Receipt Page. Shows order details and the "Stellar Drop-off" QR code.
- `/drop-off/[orderId]`: The "Stellar Athletics" Page. Scanned via QR. Big button to confirm drop-off.
- `/internal/admin`: Todd's Command Center. Real-time list of all orders. 
- `/internal/inventory`: Todd's Stock Room. Add/Edit products and sync with Stripe.

---
**Goal:** Ship a high-performance, automated fulfillment engine by Feb 1st. Speed is life.
