import { useState } from 'react';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';
import { LayersPlus, ShoppingCart, Loader2, AlertCircle, X, CreditCard } from 'lucide-react';

export type ProductCardData = {
  id: string;
  name: string;
  description: string | null;
  images: string[];
  priceId: string | null;
  priceAmount: number | null;
  priceCurrency: string;
  priceType: 'one_time' | 'recurring';
};

interface StripeShopCheckoutProps {
  products: ProductCardData[];
  convexUrl: string;
}

function formatPrice(amount: number | null, currency: string): string {
  if (amount === null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function ProductCard({
  product,
  onCheckout,
  isLoading,
}: {
  product: ProductCardData;
  onCheckout: (product: ProductCardData) => void;
  isLoading: boolean;
}) {
  return (
    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden flex flex-col">
      {product.images[0] ? (
        <img
          src={product.images[0]}
          alt={product.name}
          className="h-48 w-full object-cover object-center"
        />
      ) : (
        <div className="h-48 w-full bg-slate-800/50 flex items-center justify-center">
          <ShoppingCart className="w-12 h-12 text-slate-600" />
        </div>
      )}

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-sm font-semibold text-white">{product.name}</h3>
          <span
            className={`shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
              product.priceType === 'recurring'
                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}
          >
            {product.priceType === 'recurring' ? 'Subscription' : 'One-time'}
          </span>
        </div>

        {product.description && (
          <p className="text-xs text-slate-400 mb-3 line-clamp-2">{product.description}</p>
        )}

        <div className="mt-auto pt-3 border-t border-slate-700/50 flex items-center justify-between">
          <span className="text-lg font-bold text-white">
            {formatPrice(product.priceAmount, product.priceCurrency)}
          </span>

          <button
            onClick={() => onCheckout(product)}
            disabled={isLoading || !product.priceId}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold uppercase px-3 py-2 rounded-lg transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CreditCard className="w-4 h-4" />
            )}
            {isLoading ? 'Redirecting...' : 'Buy Now'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StripeShopCheckout({ products, convexUrl }: StripeShopCheckoutProps) {
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async (product: ProductCardData) => {
    if (!product.priceId) {
      setError(`Product "${product.name}" has no price configured.`);
      return;
    }

    setError(null);
    setLoadingProductId(product.id);

    try {
      const client = new ConvexHttpClient(convexUrl);
      const result = await client.action(api.stripe.createPublicCheckout, {
        priceId: product.priceId,
        mode: product.priceType === 'recurring' ? 'subscription' : 'payment',
      });

      if (result.url) {
        window.location.href = result.url;
      } else {
        setError('Checkout session created but no redirect URL was returned.');
        setLoadingProductId(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(message);
      setLoadingProductId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Stripe Checkout Test</h2>
          <p className="text-xs text-slate-400 mt-1">
            Click the<code className="text-red-400">'Buy Now'</code> button to purchase today!
          </p>
        </div>
        <a
          href="/shop/builder"
          className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-400 hover:text-white bg-slate-800 px-3 py-1.5 rounded-md transition-colors"
        >
          <LayersPlus className="w-3 h-3" />
          Custom Build
        </a>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-400">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {products.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No products found in Stripe.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onCheckout={handleCheckout}
              isLoading={loadingProductId === product.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
