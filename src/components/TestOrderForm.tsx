import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";

interface OrderFormData {
  customerName: string;
  email: string;
  phone: string;
  orderType: "service" | "product";
  itemDescription: string;
}

export default function TestOrderForm() {
  const [formData, setFormData] = useState<OrderFormData>({
    customerName: "Test Customer",
    email: "test@example.com",
    phone: "+1234567890",
    orderType: "service",
    itemDescription: "Signature Mesh Re-string",
  });

  const [result, setResult] = useState<{
    success: boolean;
    orderId?: string;
    error?: string;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const createOrder = useAction(api.stripe.handleCheckoutCompleted);
  const orders = useQuery(api.orders.getActiveOrders);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await createOrder({
        customerName: formData.customerName,
        email: formData.email,
        phone: formData.phone || undefined,
        stripeSessionId: `test_session_${Date.now()}`,
        orderType: formData.orderType,
        itemDescription: formData.itemDescription,
      });

      setResult({
        success: true,
        orderId: response.orderId,
      });
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message || "Failed to create order",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Find the created order to show pickup code
  const createdOrder = result?.orderId
    ? orders?.find((o) => o._id === result.orderId)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">
          Test Order Creation
        </h1>
        <p className="text-slate-400 mb-8">
          Test the Stripe webhook handler by creating orders directly
        </p>

        <form
          onSubmit={handleSubmit}
          className="bg-slate-800 border border-slate-700 p-6 rounded-2xl mb-6"
        >
          {/* Customer Name */}
          <div className="mb-4">
            <label
              htmlFor="customerName"
              className="block text-white font-medium mb-2"
            >
              Customer Name
            </label>
            <input
              type="text"
              id="customerName"
              name="customerName"
              value={formData.customerName}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
          </div>

          {/* Email */}
          <div className="mb-4">
            <label htmlFor="email" className="block text-white font-medium mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
          </div>

          {/* Phone */}
          <div className="mb-4">
            <label htmlFor="phone" className="block text-white font-medium mb-2">
              Phone (Optional)
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
          </div>

          {/* Order Type */}
          <div className="mb-4">
            <label className="block text-white font-medium mb-2">
              Order Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center text-white cursor-pointer">
                <input
                  type="radio"
                  name="orderType"
                  value="service"
                  checked={formData.orderType === "service"}
                  onChange={handleChange}
                  className="mr-2 accent-purple-600"
                />
                Service
              </label>
              <label className="flex items-center text-white cursor-pointer">
                <input
                  type="radio"
                  name="orderType"
                  value="product"
                  checked={formData.orderType === "product"}
                  onChange={handleChange}
                  className="mr-2 accent-purple-600"
                />
                Product
              </label>
            </div>
          </div>

          {/* Item Description */}
          <div className="mb-6">
            <label
              htmlFor="itemDescription"
              className="block text-white font-medium mb-2"
            >
              Item Description
            </label>
            <textarea
              id="itemDescription"
              name="itemDescription"
              value={formData.itemDescription}
              onChange={handleChange}
              required
              rows={3}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSubmitting ? "Creating Order..." : "Create Test Order"}
          </button>
        </form>

        {/* Success/Error Result Display */}
        {result && (
          <div
            className={`p-6 rounded-2xl ${
              result.success
                ? "bg-green-900/20 border border-green-700"
                : "bg-red-900/20 border border-red-700"
            }`}
          >
            {result.success ? (
              <>
                <h3 className="text-green-400 font-bold text-xl mb-2">
                  ✓ Order Created Successfully!
                </h3>
                <p className="text-slate-300 mb-2">
                  Order ID:{" "}
                  <code className="bg-black/30 px-2 py-1 rounded text-xs">
                    {result.orderId}
                  </code>
                </p>
                <p className="text-xs text-slate-500 mb-4">
                  ⚠️ Use the full Order ID above in URLs, not the pickup code
                </p>
                {createdOrder && (
                  <p className="text-slate-300 mb-4">
                    Pickup Code:{" "}
                    <span className="text-pink-500 font-mono text-2xl font-bold">
                      {createdOrder.pickupCode}
                    </span>
                  </p>
                )}
                <div className="flex gap-3">
                  <a
                    href={`/order/${result.orderId}`}
                    className="inline-block px-4 py-2 bg-purple-600 text-white rounded-lg hover:opacity-90"
                  >
                    View Order Page
                  </a>
                  <a
                    href="/internal/admin"
                    className="inline-block px-4 py-2 bg-slate-600 text-white rounded-lg hover:opacity-90"
                  >
                    View Dashboard
                  </a>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-red-400 font-bold text-xl mb-2">
                  ✗ Order Creation Failed
                </h3>
                <p className="text-slate-300">Error: {result.error}</p>
              </>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-slate-800/50 border border-slate-700 p-6 rounded-2xl">
          <h3 className="text-white font-bold mb-2">How This Works</h3>
          <ul className="text-slate-400 space-y-2 text-sm">
            <li>
              • This page calls{" "}
              <code className="bg-black/30 px-1">
                api.stripe.handleCheckoutCompleted
              </code>{" "}
              directly
            </li>
            <li>• Bypasses webhook signature verification for testing</li>
            <li>• Generates a fake Stripe session ID</li>
            <li>• Order is created with status "paid"</li>
            <li>• View created orders on the dashboard</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
