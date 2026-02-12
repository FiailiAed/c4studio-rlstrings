import { useState, useMemo } from 'react';
import { ConvexProvider, ConvexReactClient, useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

const ALL_STATUSES = [
  { key: 'paid', label: 'Paid - Pending Dropoff', color: 'bg-green-500/20 text-green-400 ring-green-500/40', owner: 'system' },
  { key: 'dropped_off', label: 'Ready for Pickup', color: 'bg-blue-500/20 text-blue-400 ring-blue-500/40', owner: 'customer' },
  { key: 'picked_up', label: 'Confirm Pick Up', color: 'bg-cyan-500/20 text-cyan-400 ring-cyan-500/40', owner: 'admin' },
  { key: 'stringing', label: 'Start Stringing', color: 'bg-yellow-500/20 text-yellow-400 ring-yellow-500/40', owner: 'admin' },
  { key: 'strung', label: 'Work Complete', color: 'bg-amber-500/20 text-amber-400 ring-amber-500/40', owner: 'admin' },
  { key: 'ready_for_pickup', label: 'Dropped Off — Awaiting Customer', color: 'bg-purple-500/20 text-purple-400 ring-purple-500/40', owner: 'admin' },
  { key: 'picked_up_by_customer', label: 'Customer Picked Up', color: 'bg-teal-500/20 text-teal-400 ring-teal-500/40', owner: 'customer' },
  { key: 'review', label: 'Awaiting Review', color: 'bg-pink-500/20 text-pink-400 ring-pink-500/40', owner: 'customer' },
  { key: 'completed', label: 'Complete', color: 'bg-slate-500/20 text-slate-300 ring-slate-500/40', owner: 'system' },
] as const;

const TIMESTAMP_FIELDS: Record<string, string> = {
  paid: '_creationTime',
  dropped_off: 'droppedOffAt',
  picked_up: 'pickedUpAt',
  stringing: 'stringingAt',
  strung: 'strungAt',
  ready_for_pickup: 'readyForPickupAt',
  picked_up_by_customer: 'pickedUpByCustomerAt',
  review: 'reviewAt',
  completed: 'completedAt',
};

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

interface LineItem {
  productName: string;
  quantity: number;
  unitAmount: number;
  totalAmount: number;
}

interface OrderStatusManagerProps {
  pickupCode: string;
  convexUrl: string;
  lineItems?: string;
  itemDescription?: string;
}

function OrderDetail({ pickupCode, lineItems, itemDescription }: { pickupCode: string; lineItems: LineItem[]; itemDescription?: string }) {
  const order = useQuery(api.orders.getAdminOrderByPickupCode, { pickupCode });
  const updateStatus = useMutation(api.orders.orderStatusUpdate);
  const [confirming, setConfirming] = useState<'back' | 'next' | null>(null);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (order === undefined) {
    return <div className="text-slate-400 text-sm py-4">Loading order...</div>;
  }
  if (order === null) {
    return <div className="text-red-400 text-sm py-4">Order not found.</div>;
  }

  const currentIdx = ALL_STATUSES.findIndex((s) => s.key === order.status);
  const currentStatus = ALL_STATUSES[currentIdx];
  const isFirst = currentIdx === 0;
  const isLast = currentIdx === ALL_STATUSES.length - 1;

  const nextStatus = !isLast ? ALL_STATUSES[currentIdx + 1] : null;
  const nextIsCustomerOwned = nextStatus?.owner === 'customer';

  const orderTotal = lineItems.reduce((acc, item) => acc + item.totalAmount, 0);

  async function handleMove(direction: 'back' | 'next') {
    if (!order) return;
    if (confirming !== direction) {
      setConfirming(direction);
      return;
    }

    const targetIdx = direction === 'back' ? currentIdx - 1 : currentIdx + 1;
    const targetStatus = ALL_STATUSES[targetIdx];
    if (!targetStatus) return;

    setLoading(true);
    setConfirming(null);
    try {
      await updateStatus({
        id: order._id as Id<"orders">,
        status: targetStatus.key,
      });
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update order status. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Main scrollable content */}
      <div className="space-y-4">
        {/* Status Control — compact */}
        <div className="bg-slate-800/30 rounded-lg ring-1 ring-slate-700 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Update Status</h3>
          <div className="space-y-2">
            {/* Row 1: Status badge */}
            <div className="text-center">
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${currentStatus.color}`}>
                {currentStatus.label}
              </span>
            </div>

            {/* Row 2: Back / Next */}
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => handleMove('back')}
                onBlur={() => { if (confirming === 'back') setConfirming(null); }}
                disabled={isFirst || loading}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all min-h-[36px] disabled:opacity-30 disabled:cursor-not-allowed ${
                  confirming === 'back'
                    ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/40'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {confirming === 'back' ? 'Confirm?' : `← ${ALL_STATUSES[currentIdx - 1]?.label ?? ''}`}
              </button>

              {nextIsCustomerOwned ? (
                <div className="rounded-lg px-3 py-1.5 text-xs font-medium bg-slate-800/50 text-slate-500 border border-slate-700/50 text-center min-h-[36px] flex items-center">
                  Waiting on customer
                </div>
              ) : (
                <button
                  onClick={() => handleMove('next')}
                  onBlur={() => { if (confirming === 'next') setConfirming(null); }}
                  disabled={isLast || loading}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all min-h-[36px] disabled:opacity-30 disabled:cursor-not-allowed ${
                    confirming === 'next'
                      ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/40'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {confirming === 'next' ? 'Confirm?' : `${ALL_STATUSES[currentIdx + 1]?.label ?? ''} →`}
                </button>
              )}
            </div>
          </div>
          {loading && <p className="mt-2 text-xs text-slate-500 text-center">Updating...</p>}
        </div>

        {/* Timeline — vertical rail, only completed steps */}
        <div className="bg-slate-800/30 rounded-lg ring-1 ring-slate-700 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Timeline</h3>
          <div className="space-y-1.5 border-l border-slate-700 ml-1 pl-3">
            {ALL_STATUSES.map((s, i) => {
              const field = TIMESTAMP_FIELDS[s.key];
              const value = field ? (order as Record<string, unknown>)[field] as number | undefined : undefined;
              if (!value) return null;
              return (
                <div key={s.key} className="flex items-start gap-2.5 relative">
                  <div className={`w-2 h-2 mt-0.5 rounded-full shrink-0 -ml-[17px] ${
                    i <= currentIdx ? 'bg-green-500' : 'bg-slate-600'
                  }`} />
                  <div className="flex-1 flex justify-between text-xs">
                    <span className="text-slate-400">{s.label}</span>
                    <span className="text-slate-300 tabular-nums">{formatDate(value)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 inset-x-0 z-50">
        {/* Expandable Drawer */}
        <div
          className={`overflow-hidden transition-[max-height] duration-300 ease-in-out bg-slate-900/95 backdrop-blur-xl border-t border-slate-700/50 ${
            drawerOpen ? 'max-h-[60vh] overflow-y-auto' : 'max-h-0'
          }`}
        >
          <div className="px-3 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Order Details</h3>
            {lineItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-700 text-xs">
                  <thead>
                    <tr>
                      <th className="text-left py-1.5 pr-3 text-xs font-semibold uppercase text-slate-400">Item</th>
                      <th className="text-center py-1.5 px-3 text-xs font-semibold uppercase text-slate-400">Qty</th>
                      <th className="text-right py-1.5 px-3 text-xs font-semibold uppercase text-slate-400">Price</th>
                      <th className="text-right py-1.5 pl-3 text-xs font-semibold uppercase text-slate-400">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {lineItems.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-1.5 pr-3 text-slate-200">{item.productName}</td>
                        <td className="py-1.5 px-3 text-center text-slate-300">{item.quantity}</td>
                        <td className="py-1.5 px-3 text-right text-slate-300">{formatCents(item.unitAmount)}</td>
                        <td className="py-1.5 pl-3 text-right text-white font-medium">{formatCents(item.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-700">
                      <td colSpan={3} className="py-1.5 pr-3 text-right text-xs font-semibold text-slate-300">Total</td>
                      <td className="py-1.5 pl-3 text-right text-white font-bold">{formatCents(orderTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-300">{itemDescription ?? 'No details available'}</p>
            )}
          </div>
        </div>

        {/* Bar */}
        <div className="bg-slate-900/90 backdrop-blur-xl border-t border-slate-700/50 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between">
            {/* Left: pickup code */}
            <span className="text-sm font-mono font-bold text-white">#{pickupCode}</span>

            {/* Center: 9 stepper dots */}
            <div className="flex items-center gap-1">
              {ALL_STATUSES.map((s, i) => (
                <div
                  key={s.key}
                  className={`w-2 h-2 rounded-full ${
                    i < currentIdx ? 'bg-green-500'
                    : i === currentIdx ? 'bg-indigo-500'
                    : 'bg-slate-600'
                  }`}
                  title={s.label}
                />
              ))}
            </div>

            {/* Right: chevron toggle */}
            <button
              onClick={() => setDrawerOpen(!drawerOpen)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
              aria-label={drawerOpen ? 'Close order details' : 'Open order details'}
            >
              <svg
                className={`w-4 h-4 transition-transform duration-300 ${drawerOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function OrderStatusManager({ pickupCode, convexUrl, lineItems: lineItemsJson, itemDescription }: OrderStatusManagerProps) {
  const client = useMemo(() => new ConvexReactClient(convexUrl), [convexUrl]);
  const lineItems: LineItem[] = useMemo(() => {
    if (!lineItemsJson) return [];
    try { return JSON.parse(lineItemsJson); } catch { return []; }
  }, [lineItemsJson]);

  return (
    <ConvexProvider client={client}>
      <OrderDetail pickupCode={pickupCode} lineItems={lineItems} itemDescription={itemDescription} />
    </ConvexProvider>
  );
}
