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
