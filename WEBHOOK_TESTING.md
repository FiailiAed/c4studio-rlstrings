# Stripe Webhook Testing Guide

## Local Testing Setup

### 1. Start Development Environment

**Terminal 1: Start Convex**
```bash
bunx convex dev
```

**Terminal 2: Start Astro Dev Server**
```bash
bun run dev
```

**Terminal 3: Forward Stripe Webhooks**
```bash
stripe listen --forward-to http://localhost:4321/api/webhooks/stripe
```

This will output a webhook signing secret like:
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
```

### 2. Update Local Environment

Add the webhook secret to `.env.local`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

Restart Astro dev server (Terminal 2) after updating the secret.

### 3. Trigger Test Events

**Terminal 4: Send Test Webhook**
```bash
stripe trigger checkout.session.completed
```

## Verifying the Webhook

### Check Terminal Logs

**Terminal 2 (Astro)** should show:
```
Order created successfully: <convex-id>
```

**Terminal 3 (Stripe CLI)** should show:
```
✔  Received event checkout.session.completed
```

### Check Convex Dashboard

1. Open https://dashboard.convex.dev
2. Navigate to your project
3. Go to "Data" → "orders" table
4. Verify the new order appears with:
   - `status: "paid"`
   - 4-digit `pickupCode`
   - Customer details populated
   - `stripeSessionId` matches event

## Manual Testing with Custom Data

Create a test checkout session with metadata:

```bash
# Create a test product first
stripe products create --name="Test Lacrosse Re-string" --id=prod_test_restring

# Create a price
stripe prices create \
  --product=prod_test_restring \
  --unit-amount=2500 \
  --currency=usd

# Create a checkout session with metadata
stripe checkout sessions create \
  --success-url="https://example.com/success" \
  --line-items[0][price]=<price_id_from_above> \
  --line-items[0][quantity]=1 \
  --mode=payment \
  --customer-email="test@example.com" \
  --metadata[orderType]=service \
  --metadata[itemDescription]="Signature Mesh Re-string"
```

Then mark it as completed:
```bash
stripe checkout sessions expire <session_id>
```

## Common Issues

### Issue: "Missing stripe-signature header"
**Solution:** Make sure you're using the Stripe CLI to forward webhooks, not sending raw POST requests.

### Issue: "Invalid signature"
**Solution:** Verify `STRIPE_WEBHOOK_SECRET` in `.env.local` matches the secret from `stripe listen`.

### Issue: "Missing required customer data"
**Solution:** Test events from `stripe trigger` include customer details automatically. If creating manual sessions, ensure `--customer-email` is set.

### Issue: "Failed to create order in Convex"
**Solution:** Check that `bunx convex dev` is running and `PUBLIC_CONVEX_URL` is set correctly.

## Production Deployment

### 1. Configure Stripe Webhook Endpoint

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. URL: `https://your-domain.vercel.app/api/webhooks/stripe`
4. Select event: `checkout.session.completed`
5. Copy the "Signing secret" (starts with `whsec_`)

### 2. Set Environment Variable in Vercel

In Vercel dashboard:
1. Go to Project → Settings → Environment Variables
2. Add: `STRIPE_WEBHOOK_SECRET` = `whsec_xxxxx`
3. Redeploy your application

### 3. Test Production Webhook

After deployment, send a test event from Stripe Dashboard:
1. Go to Webhooks → Your endpoint
2. Click "Send test webhook"
3. Select `checkout.session.completed`
4. Check Vercel logs and Convex dashboard for the new order

## Webhook Flow

```
Customer Pays (Stripe Checkout)
    ↓
Stripe sends checkout.session.completed event
    ↓
Astro API Route (/api/webhooks/stripe.ts)
    ├─ Verifies signature
    ├─ Extracts customer data
    └─ Calls Convex action
        ↓
    Convex Action (api.stripe.handleCheckoutCompleted)
        └─ Calls internal mutation
            ↓
        Internal Mutation (internal.orders.createOrder)
            ├─ Generates 4-digit pickup code
            └─ Creates order with status "paid"
                ↓
            Order ready for drop-off flow
```

## Next Steps

After webhook creates order with "paid" status:
1. Parent receives confirmation email (future: integrate Resend)
2. Parent brings stick to Stellar Athletics
3. Parent scans QR code → triggers `confirmDropOff` mutation
4. Order status updates to `dropped_off`
5. Todd sees order in admin dashboard
