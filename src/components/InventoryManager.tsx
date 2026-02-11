import { useState } from 'react';
import { useAuth } from '@clerk/astro/react';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Loader2, RefreshCw, Trash2, Plus, Minus, AlertCircle, X } from 'lucide-react';

export type InventoryItem = {
  _id: string;
  _creationTime: number;
  name: string;
  priceId: string;
  stock: number;
  category: string;
  showInShop?: boolean;
  showInBuilder?: boolean;
  description?: string;
  images?: string[];
  stripeProductId?: string;
  unitAmount?: number;
  currency?: string;
  priceType?: 'one_time' | 'recurring';
};

interface InventoryManagerProps {
  initialItems: InventoryItem[];
  convexUrl: string;
}

const categoryColor: Record<string, string> = {
  head:    'bg-blue-500/20 text-blue-400',
  shaft:   'bg-purple-500/20 text-purple-400',
  mesh:    'bg-green-500/20 text-green-400',
  strings: 'bg-yellow-500/20 text-yellow-400',
  service: 'bg-red-500/20 text-red-400',
  upsell:  'bg-pink-500/20 text-pink-400',
};

function stockColor(stock: number): string {
  if (stock === 0) return 'text-red-400 font-bold';
  if (stock <= 5) return 'text-yellow-400 font-semibold';
  return 'text-green-400';
}

export default function InventoryManager({ initialItems, convexUrl }: InventoryManagerProps) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [syncing, setSyncing] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  async function getClient(): Promise<ConvexHttpClient> {
    const token = await getToken({ template: 'convex' });
    if (!token) throw new Error('Failed to get auth token. Please sign in again.');
    const client = new ConvexHttpClient(convexUrl);
    client.setAuth(token);
    return client;
  }

  async function refreshItems(client: ConvexHttpClient) {
    const fresh = await client.query(api.inventory.listInventory, {});
    setItems(fresh as unknown as InventoryItem[]);
  }

  async function handleSync() {
    setError(null);
    setSyncResult(null);
    setSyncing(true);
    try {
      const client = await getClient();
      const result = await client.action(api.inventory.syncFromStripe, {});
      setSyncResult(`Sync complete: ${result.created} created, ${result.updated} updated`);
      await refreshItems(client);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  async function handleStockAdjust(id: string, adjustment: number) {
    setError(null);
    setLoadingId(id);
    try {
      const client = await getClient();
      await client.mutation(api.inventory.updateStock, {
        inventoryId: id as Id<"inventory">,
        adjustment,
      });
      await refreshItems(client);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Stock update failed');
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}" from inventory?`)) return;
    setError(null);
    setLoadingId(id);
    try {
      const client = await getClient();
      await client.mutation(api.inventory.deleteItem, {
        inventoryId: id as Id<"inventory">,
      });
      await refreshItems(client);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setLoadingId(null);
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        <span className="ml-3 text-sm text-slate-400">Loading auth...</span>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6 text-center">
        <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
        <p className="text-sm text-yellow-400 font-semibold">Sign in required</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Inventory</h2>
          <p className="text-xs text-slate-400 mt-1">{items.length} items in inventory</p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold uppercase px-4 py-2 rounded-lg transition-colors"
        >
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {syncing ? 'Syncing...' : 'Sync from Stripe'}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-400 flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {syncResult && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-start gap-3">
          <RefreshCw className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
          <p className="text-sm text-green-400 flex-1">{syncResult}</p>
          <button onClick={() => setSyncResult(null)} className="text-green-500 hover:text-green-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <p className="mt-6 text-slate-400">No inventory items. Click "Sync from Stripe" to import products.</p>
      ) : (
        <>
        {/* Mobile card layout */}
        <div className="md:hidden space-y-3">
          {items.map((item) => (
            <div key={item._id} className="bg-slate-900 ring-1 ring-slate-700 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-200 truncate">{item.name}</span>
                <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${categoryColor[item.category] ?? 'bg-slate-700 text-slate-300'}`}>
                  {item.category}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-500 truncate">{item.priceId}</p>
              <div className="flex items-center gap-1.5">
                {item.showInShop && (
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-500/20 text-emerald-400">Shop</span>
                )}
                {item.showInBuilder && (
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-indigo-500/20 text-indigo-400">Builder</span>
                )}
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className={`text-sm ${stockColor(item.stock)}`}>Stock: {item.stock}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleStockAdjust(item._id, -1)}
                    disabled={loadingId === item._id || item.stock === 0}
                    className="min-h-9 min-w-9 flex items-center justify-center rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-slate-300 transition-colors"
                    title="Decrease stock"
                  >
                    {loadingId === item._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Minus className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleStockAdjust(item._id, 1)}
                    disabled={loadingId === item._id}
                    className="min-h-9 min-w-9 flex items-center justify-center rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-slate-300 transition-colors"
                    title="Increase stock"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item._id, item.name)}
                    disabled={loadingId === item._id}
                    className="min-h-9 min-w-9 flex items-center justify-center rounded bg-red-900/50 hover:bg-red-800/50 disabled:opacity-30 text-red-400 transition-colors ml-2"
                    title="Delete item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table layout */}
        <div className="hidden md:block overflow-x-auto rounded-lg ring-1 ring-slate-700">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">Price ID</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">Visibility</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">Stock</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900">
              {items.map((item) => (
                <tr key={item._id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-slate-200">{item.name}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${categoryColor[item.category] ?? 'bg-slate-700 text-slate-300'}`}>
                      {item.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-500 max-w-[200px] truncate">{item.priceId}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {item.showInShop && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-500/20 text-emerald-400">Shop</span>
                      )}
                      {item.showInBuilder && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-indigo-500/20 text-indigo-400">Builder</span>
                      )}
                      {!item.showInShop && !item.showInBuilder && (
                        <span className="text-[10px] text-slate-600">—</span>
                      )}
                    </div>
                  </td>
                  <td className={`whitespace-nowrap px-4 py-3 text-sm text-center ${stockColor(item.stock)}`}>
                    {item.stock}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleStockAdjust(item._id, -1)}
                        disabled={loadingId === item._id || item.stock === 0}
                        className="p-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-slate-300 transition-colors"
                        title="Decrease stock"
                      >
                        {loadingId === item._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Minus className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleStockAdjust(item._id, 1)}
                        disabled={loadingId === item._id}
                        className="p-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-slate-300 transition-colors"
                        title="Increase stock"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item._id, item.name)}
                        disabled={loadingId === item._id}
                        className="p-1 rounded bg-red-900/50 hover:bg-red-800/50 disabled:opacity-30 text-red-400 transition-colors ml-2"
                        title="Delete item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}
