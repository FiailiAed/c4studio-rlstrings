import Stripe from "stripe";

export type ProductWithPrice = Stripe.Product & {
  default_price: Stripe.Price | null;
};

export async function getProducts(): Promise<ProductWithPrice[]> {
  const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-01-28.clover',
  });

  const products = await stripe.products.list({
    limit: 10,
    expand: ['data.default_price'],
  });

  return products.data as ProductWithPrice[];
}

// Normalized shape — works for both Treasury and BalanceTransaction sources
export type StripeTransaction = {
  id: string;
  amount: number;
  currency: string;
  description: string | null;
  status: string;   // 'open'|'posted'|'void' (Treasury) or 'available'|'pending' (Balance)
  created: number;
  type: string;     // flow_type (Treasury) or type (BalanceTransaction)
};

export async function getTransactions(): Promise<StripeTransaction[]> {
  const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-01-28.clover',
  });

  // --- Try Treasury (requires Treasury to be enabled on the account) ---
  try {
    const accounts = await stripe.treasury.financialAccounts.list({ limit: 1 });
    if (!accounts.data.length) return [];

    const financialAccountId = accounts.data[0].id;
    const transactions = await stripe.treasury.transactions.list({
      financial_account: financialAccountId,
      limit: 100,
    });

    return transactions.data.map((tx) => ({
      id: tx.id,
      amount: tx.amount,
      currency: tx.currency,
      description: tx.description ?? null,
      status: tx.status,
      created: tx.created,
      type: tx.flow_type,
    }));
  } catch (err) {
    // Treasury not enabled or not accessible — fall back to Balance Transactions.
    // Only swallow Stripe API errors; re-throw anything else (network issues, etc.).
    if (!(err instanceof Stripe.errors.StripeError)) throw err;

    const txs = await stripe.balanceTransactions.list({ limit: 100 });
    return txs.data.map((tx) => ({
      id: tx.id,
      amount: tx.amount,
      currency: tx.currency,
      description: tx.description ?? null,
      status: tx.status,
      created: tx.created,
      type: tx.type,
    }));
  }
}
