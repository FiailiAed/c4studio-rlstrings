import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";

export default function InventoryManager() {
  const inventory = useQuery(api.inventory.getStorefront);
  const createProduct = useAction(api.stripe.createProductAndSync);

  const [formData, setFormData] = useState({
    name: "",
    price: "",
    category: "mesh" as "head" | "shaft" | "mesh",
  });

  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResult(null);

    const priceInCents = Math.round(parseFloat(formData.price) * 100);

    try {
      await createProduct({
        name: formData.name,
        priceInCents,
        category: formData.category,
      });

      setResult({ success: true });
      setFormData({ name: "", price: "", category: "mesh" }); // Reset form
    } catch (error: any) {
      setResult({ success: false, error: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">Inventory Manager</h1>
          <a
            href="/internal/admin"
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
          >
            ← Dashboard
          </a>
        </div>

        {/* Add Product Form */}
        <div className="bg-slate-800 border-2 border-slate-700 p-8 rounded-2xl mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Add New Product</h2>

          <form onSubmit={handleSubmit}>
            {/* Product Name */}
            <div className="mb-4">
              <label className="block text-white font-medium mb-2">Product Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                minLength={3}
                placeholder="e.g., STX Stallion 700"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>

            {/* Price */}
            <div className="mb-4">
              <label className="block text-white font-medium mb-2">Price (USD)</label>
              <div className="relative">
                <span className="absolute left-4 top-2 text-slate-400 text-lg">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                  placeholder="24.99"
                  className="w-full pl-8 pr-4 py-2 bg-slate-900 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>
            </div>

            {/* Category */}
            <div className="mb-6">
              <label className="block text-white font-medium mb-2">Category</label>
              <div className="flex gap-6">
                {(["head", "shaft", "mesh"] as const).map((cat) => (
                  <label key={cat} className="flex items-center text-white cursor-pointer">
                    <input
                      type="radio"
                      name="category"
                      value={cat}
                      checked={formData.category === cat}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                      className="mr-2 accent-purple-600"
                    />
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </label>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isSubmitting ? "Adding to Stripe..." : "Add Product to Stripe"}
            </button>
          </form>

          {/* Result Message */}
          {result && (
            <div className={`mt-4 p-4 rounded-lg ${
              result.success
                ? "bg-green-900/20 border border-green-700 text-green-400"
                : "bg-red-900/20 border border-red-700 text-red-400"
            }`}>
              {result.success
                ? "✓ Product added to Stripe and synced!"
                : `✗ Error: ${result.error}`}
            </div>
          )}
        </div>

        {/* Current Inventory */}
        <div className="bg-slate-800 border-2 border-slate-700 p-8 rounded-2xl">
          <h2 className="text-2xl font-bold text-white mb-6">Current Inventory</h2>

          {!inventory ? (
            <p className="text-slate-400">Loading inventory...</p>
          ) : inventory.length === 0 ? (
            <p className="text-slate-400">No items in inventory yet.</p>
          ) : (
            <div className="space-y-3">
              {inventory.map((item) => (
                <div
                  key={item._id}
                  className="bg-slate-900 border border-slate-700 p-4 rounded-lg flex justify-between items-center"
                >
                  <div>
                    <span className="text-white font-bold">{item.name}</span>
                    <span className="text-slate-400 text-sm ml-3">({item.category})</span>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-500 text-xs">
                      Stock: {item.stock}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
