import { useState, useEffect } from 'react';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';
import { ShoppingCart, Loader2, AlertCircle, X, CreditCard, Plus, Minus, Trash2, Check } from 'lucide-react';

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

type CartItem = {
  product: ProductCardData;
  quantity: number;
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
  onAddToCart,
  isLoading,
}: {
  product: ProductCardData;
  onCheckout: (product: ProductCardData) => void;
  onAddToCart: (product: ProductCardData) => void;
  isLoading: boolean;
}) {
  const [justAdded, setJustAdded] = useState(false);

  const handleAddToCart = () => {
    onAddToCart(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

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

          <div className="flex items-center gap-2">
            <button
              onClick={handleAddToCart}
              disabled={!product.priceId || justAdded}
              className={`flex items-center gap-1.5 ${justAdded ? 'bg-emerald-600' : 'bg-slate-700 hover:bg-slate-600'} disabled:cursor-not-allowed text-white text-xs font-bold uppercase px-3 py-2 rounded-lg transition-colors`}
            >
              {justAdded ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {justAdded ? 'Added' : 'Cart'}
            </button>
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
    </div>
  );
}

function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemove,
  onCheckout,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onCheckout: () => void;
  isLoading: boolean;
}) {
  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const subtotal = cartItems.reduce((sum, item) => {
    return sum + (item.product.priceAmount ?? 0) * item.quantity;
  }, 0);
  const currency = cartItems[0]?.product.priceCurrency ?? 'usd';

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-md transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex h-full flex-col bg-slate-900 shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white">Shopping Cart</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <ShoppingCart className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">Your cart is empty</p>
              </div>
            ) : (
              <ul className="space-y-4">
                {cartItems.map((item) => (
                  <li key={item.product.id} className="flex gap-4 border-b border-slate-700/50 pb-4">
                    {item.product.images[0] ? (
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className="h-20 w-20 rounded-lg object-cover object-center flex-shrink-0"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-lg bg-slate-800/50 flex items-center justify-center flex-shrink-0">
                        <ShoppingCart className="w-6 h-6 text-slate-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-white truncate">{item.product.name}</h3>
                      <p className="text-sm text-slate-400 mt-0.5">
                        {formatPrice(item.product.priceAmount, item.product.priceCurrency)}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm text-white w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => onRemove(item.product.id)}
                          className="ml-auto p-1 text-red-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          {cartItems.length > 0 && (
            <div className="border-t border-slate-700 px-4 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-400">Subtotal</span>
                <span className="text-lg font-bold text-white">{formatPrice(subtotal, currency)}</span>
              </div>
              <button
                onClick={onCheckout}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold uppercase text-sm py-3 rounded-lg transition-colors"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                {isLoading ? 'Redirecting...' : 'Checkout'}
              </button>
              <button
                onClick={onClose}
                className="w-full text-sm text-slate-400 hover:text-white py-2 transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function StripeShopCheckout({ products, convexUrl }: StripeShopCheckoutProps) {
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCartCheckoutLoading, setIsCartCheckoutLoading] = useState(false);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const addToCart = (product: ProductCardData) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return;
    setCartItems((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, quantity } : item))
    );
  };

  const removeFromCart = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleBuyNow = async (product: ProductCardData) => {
    if (!product.priceId) {
      setError(`Product "${product.name}" has no price configured.`);
      return;
    }

    setError(null);
    setLoadingProductId(product.id);

    try {
      const client = new ConvexHttpClient(convexUrl);
      const result = await client.action(api.stripe.createPublicCheckout, {
        items: [{ priceId: product.priceId, quantity: 1 }],
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

  const handleCartCheckout = async () => {
    const invalidItem = cartItems.find((item) => !item.product.priceId);
    if (invalidItem) {
      setError(`Product "${invalidItem.product.name}" has no price configured.`);
      return;
    }

    // Cart checkout only supports one-time payments (mixed modes not supported by Stripe)
    const hasRecurring = cartItems.some((item) => item.product.priceType === 'recurring');
    const hasOneTime = cartItems.some((item) => item.product.priceType === 'one_time');
    if (hasRecurring && hasOneTime) {
      setError('Cannot mix subscriptions and one-time purchases in a single checkout. Please remove one type.');
      return;
    }

    setError(null);
    setIsCartCheckoutLoading(true);

    try {
      const client = new ConvexHttpClient(convexUrl);
      const items = cartItems.map((item) => ({
        priceId: item.product.priceId!,
        quantity: item.quantity,
      }));
      const mode = hasRecurring ? 'subscription' as const : 'payment' as const;

      const result = await client.action(api.stripe.createPublicCheckout, { items, mode });

      if (result.url) {
        window.location.href = result.url;
      } else {
        setError('Checkout session created but no redirect URL was returned.');
        setIsCartCheckoutLoading(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(message);
      setIsCartCheckoutLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Purchase a Ready-to-Go Product</h2>
          <p className="text-xs text-slate-400 mt-1">
            Click the<code className="text-red-400">'Buy Now'</code> button to purchase today!
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative flex items-center gap-2 text-slate-400 hover:text-white bg-slate-800 px-3 py-1.5 rounded-md transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
                {cartCount}
              </span>
            )}
          </button>
        </div>
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
              onCheckout={handleBuyNow}
              onAddToCart={addToCart}
              isLoading={loadingProductId === product.id}
            />
          ))}
        </div>
      )}

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={updateQuantity}
        onRemove={removeFromCart}
        onCheckout={handleCartCheckout}
        isLoading={isCartCheckoutLoading}
      />
    </div>
  );
}
