import { useState } from 'react';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';
import { Loader2, AlertCircle, X, Check, ShoppingCart, RotateCcw } from 'lucide-react';

export type BuilderProduct = {
  id: string;
  name: string;
  description: string | null;
  images: string[];
  priceId: string | null;
  priceAmount: number | null;
  priceCurrency: string;
  priceType: 'one_time' | 'recurring';
  category: string;
  playerType?: 'boys' | 'girls' | 'goalies';
};

interface BuilderWizardProps {
  products: BuilderProduct[];
  convexUrl: string;
}

const STEPS = [
  { key: 'service', label: 'Category', required: true,  multi: false },
  { key: 'head',    label: 'Head',    required: true,  multi: false },
  { key: 'mesh',    label: 'Mesh',    required: true, multi: false },
  { key: 'strings', label: 'Strings', required: true, multi: false },
  { key: 'pocket',  label: 'Pocket',  required: true,  multi: false },
  { key: 'upsell',  label: 'Extras',  required: false, multi: true  },
] as const;

const POCKET_OPTIONS = ['High', 'Mid', 'Low', 'Re-Create My Pocket'] as const;

const TEXT_ONLY_STEPS = new Set<string>(['service']);

function formatPrice(amount: number | null, currency: string): string {
  if (amount === null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

export default function BuilderWizard({ products, convexUrl }: BuilderWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highestReached, setHighestReached] = useState(0);
  const [selections, setSelections] = useState<Record<string, BuilderProduct>>({});
  const [upsellSelections, setUpsellSelections] = useState<BuilderProduct[]>([]);
  const [byoHead, setByoHead] = useState(false);
  const [pocketSelection, setPocketSelection] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = STEPS[currentStep];

  // Derive playerType from selected service
  const selectedPlayerType = selections['service']?.playerType ?? null;

  // Filter products based on step and playerType
  const universalSteps = new Set(['service', 'strings', 'upsell']);
  const stepProducts = products.filter((p) => {
    if (p.category !== step.key) return false;
    if (universalSteps.has(step.key)) return true;
    if (!p.playerType) return true;
    return p.playerType === selectedPlayerType;
  });

  // Calculate running total
  const totalAmount = Object.values(selections).reduce((sum, p) => sum + (p.priceAmount ?? 0), 0)
    + upsellSelections.reduce((sum, p) => sum + (p.priceAmount ?? 0), 0);
  const selectedCount = Object.keys(selections).length + upsellSelections.length + (pocketSelection ? 1 : 0);
  const currency = products[0]?.priceCurrency ?? 'usd';

  const canCheckout = !!selections['service'];

  const isStepCompleted = (idx: number): boolean => {
    const s = STEPS[idx];
    if (s.key === 'head') return byoHead || !!selections['head'];
    if (s.key === 'upsell') return upsellSelections.length > 0;
    if (s.key === 'pocket') return !!pocketSelection;
    return !!selections[s.key];
  };

  const canAdvance = !step.required || isStepCompleted(currentStep);
  const isTextOnlyStep = TEXT_ONLY_STEPS.has(step.key);

  const handleSelect = (product: BuilderProduct) => {
    if (step.key === 'service') {
      const isSameProduct = selections['service']?.id === product.id;
      if (isSameProduct) {
        setSelections({});
      } else {
        setSelections({ service: product });
        setUpsellSelections([]);
        setByoHead(false);
        setPocketSelection(null);
        setHighestReached(0);
      }
      return;
    }
    if (step.key === 'upsell') {
      setUpsellSelections((prev) => {
        const exists = prev.find((p) => p.id === product.id);
        if (exists) return prev.filter((p) => p.id !== product.id);
        return [...prev, product];
      });
    } else {
      setSelections((prev) => {
        if (prev[step.key]?.id === product.id) {
          const next = { ...prev };
          delete next[step.key];
          return next;
        }
        return { ...prev, [step.key]: product };
      });
    }
  };

  const isSelected = (product: BuilderProduct): boolean => {
    if (step.key === 'upsell') return upsellSelections.some((p) => p.id === product.id);
    return selections[step.key]?.id === product.id;
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setHighestReached(prev => Math.max(prev, currentStep + 1));
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleByoToggle = () => {
    const next = !byoHead;
    setByoHead(next);
    if (next) {
      const updated = { ...selections };
      delete updated['head'];
      setSelections(updated);
      setHighestReached(prev => Math.max(prev, currentStep + 1));
      setCurrentStep(currentStep + 1);
    }
  };

  const handleCheckout = async () => {
    if (!canCheckout) {
      setError('A service selection is required to checkout.');
      return;
    }

    setError(null);
    setIsCheckingOut(true);

    const allItems = [...Object.values(selections), ...upsellSelections];
    const items = allItems
      .filter((p) => p.priceId)
      .map((p) => ({ priceId: p.priceId!, quantity: 1 }));

    if (items.length === 0) {
      setError('No valid items to checkout.');
      setIsCheckingOut(false);
      return;
    }

    try {
      const client = new ConvexHttpClient(convexUrl);
      const result = await client.action(api.stripe.createPublicCheckout, {
        items,
        mode: 'payment' as const,
        pocketPreference: pocketSelection ?? undefined,
      });

      if (result.url) {
        window.location.href = result.url;
      } else {
        setError('Checkout session created but no redirect URL was returned.');
        setIsCheckingOut(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setIsCheckingOut(false);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setHighestReached(0);
    setSelections({});
    setUpsellSelections([]);
    setByoHead(false);
    setPocketSelection(null);
    setError(null);
  };

  return (
    <div className="space-y-4">
      {/* Step Indicator */}
      <div className="overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
        <div className="flex items-center gap-1 min-w-max mx-auto w-fit">
          {STEPS.map((s, idx) => {
            const completed = isStepCompleted(idx);
            const active = idx === currentStep;
            const disabled = idx > highestReached;
            return (
              <div key={s.key} className="flex items-center">
                <button
                  onClick={() => !disabled && setCurrentStep(idx)}
                  disabled={disabled}
                  className={`flex flex-col items-center gap-1 px-1.5 py-2 rounded-lg transition-all duration-200 min-h-11 disabled:opacity-40 disabled:cursor-not-allowed ${
                    active
                      ? 'text-red-500'
                      : completed
                        ? 'text-white/70'
                        : 'text-neutral-500'
                  }`}
                >
                  <div
                    className={`rounded-full flex items-center justify-center font-bold border-2 transition-all duration-200 ${
                      active
                        ? 'w-8 h-8 text-sm border-red-500 bg-red-500/10 text-red-500'
                        : completed
                          ? 'w-5 h-5 text-[9px] border-white/50 bg-white/10 text-white/70'
                          : 'w-5 h-5 text-[9px] border-neutral-700 bg-neutral-900 text-neutral-500'
                    }`}
                  >
                    {completed && !active ? (
                      <Check className={active ? 'w-4 h-4' : 'w-3 h-3'} />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <span className={`font-semibold whitespace-nowrap ${active ? 'text-xs' : 'text-[9px]'}`}>
                    {s.label}
                    {s.required && <span className="text-red-500">*</span>}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-400 flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step Header */}
      <div>
        <h2 className="text-xl font-bold text-white">
          {step.label}
          {step.required && <span className="text-red-500 text-sm ml-2">(Required)</span>}
          {step.multi && <span className="text-neutral-500 text-sm ml-2">(Select multiple)</span>}
        </h2>
        {step.key === 'head' && (
          <p className="text-sm text-neutral-400 mt-1">Choose a head, or bring your own.</p>
        )}
        {step.key === 'pocket' && (
          <p className="text-sm text-neutral-400 mt-1">Select your preferred pocket placement.</p>
        )}
      </div>

      {/* BYO Head Toggle */}
      {step.key === 'head' && (
        <button
          onClick={handleByoToggle}
          className={`flex items-center gap-2 w-full p-3 rounded-xl border transition-colors ${
            byoHead
              ? 'border-emerald-500/50 bg-emerald-500/10'
              : 'border-neutral-700 bg-neutral-900/50 hover:border-neutral-600'
          }`}
        >
          <div
            className={`w-10 h-6 rounded-full p-0.5 transition-colors ${
              byoHead ? 'bg-emerald-500' : 'bg-neutral-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                byoHead ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </div>
          <span className="text-sm font-semibold text-white">I'm bringing my own head</span>
        </button>
      )}

      {/* Pocket Step — UI-only cards */}
      {step.key === 'pocket' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {POCKET_OPTIONS.map((option) => {
            const selected = pocketSelection === option;
            return (
              <button
                key={option}
                onClick={() => setPocketSelection(selected ? null : option)}
                className={`text-left p-4 rounded-xl border transition-all flex items-center justify-center min-h-[80px] ${
                  selected
                    ? 'ring-2 ring-red-600 border-red-600/50 bg-red-600/10'
                    : 'border-slate-700/50 bg-slate-900/50 hover:border-slate-600'
                }`}
              >
                <div className="text-center">
                  {selected && (
                    <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <span className="text-sm font-semibold text-white">{option}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Product Grid — skip for pocket step */}
      {step.key !== 'pocket' && !(step.key === 'head' && byoHead) && (
        stepProducts.length > 0 ? (
          <div className={`grid ${isTextOnlyStep ? 'grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'} gap-3`}>
            {stepProducts.map((product) => {
              const selected = isSelected(product);
              return isTextOnlyStep ? (
                <button
                  key={product.id}
                  onClick={() => handleSelect(product)}
                  className={`relative text-center rounded-xl border transition-all flex items-center justify-center min-h-[80px] p-4 ${
                    selected
                      ? 'ring-2 ring-red-600 border-red-600/50 bg-red-600/10'
                      : 'bg-slate-900/50 backdrop-blur-sm border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  {selected && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <span className="text-sm font-semibold text-white">{product.name}</span>
                </button>
              ) : (
                <button
                  key={product.id}
                  onClick={() => handleSelect(product)}
                  className={`text-left bg-slate-900/50 backdrop-blur-sm border rounded-xl overflow-hidden flex flex-col transition-all ${
                    selected
                      ? 'ring-2 ring-red-600 border-red-600/50'
                      : 'border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  <div className="relative">
                    {product.images[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="h-32 w-full object-cover object-center"
                      />
                    ) : (
                      <div className="h-32 w-full bg-slate-800/50 flex items-center justify-center">
                        <ShoppingCart className="w-10 h-10 text-slate-600" />
                      </div>
                    )}
                    {selected && (
                      <div className="absolute top-2 right-2 w-7 h-7 bg-red-600 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="p-3 flex-1 flex flex-col">
                    <h3 className="text-sm font-semibold text-white">{product.name}</h3>
                    {product.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{product.description}</p>
                    )}
                    <span className="text-base font-bold text-white mt-auto pt-2">
                      {formatPrice(product.priceAmount, product.priceCurrency)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No {step.label.toLowerCase()} products available.</p>
          </div>
        )
      )}

      {/* Spacer to prevent content hiding behind fixed toolbar */}
      <div className="h-20" />

      {/* Fixed Summary Bar */}
      <div className="fixed bottom-20 md:bottom-0 inset-x-0 z-40 px-3 sm:px-4">
        <div className="glass-dark rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 border border-neutral-800">
          <div className="text-sm">
            <span className="text-neutral-400">{selectedCount} item{selectedCount !== 1 ? 's' : ''}</span>
            <span className="text-white font-bold ml-3">{formatPrice(totalAmount, currency)}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              title="Reset all selections"
              className="min-h-11 px-3 py-2 text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className="min-h-11 px-4 py-2 text-sm font-semibold text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
              >
                Back
              </button>
            )}

            {currentStep < STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={!canAdvance}
                className="min-h-11 px-5 py-2 text-sm font-bold uppercase text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleCheckout}
                disabled={isCheckingOut || !canCheckout}
                className="min-h-11 px-5 py-2 text-sm font-bold uppercase text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
              >
                {isCheckingOut ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Redirecting...
                  </>
                ) : (
                  'Checkout'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
