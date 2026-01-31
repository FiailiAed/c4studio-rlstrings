import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export default function OrdersDashboard() {
  const orders = useQuery(api.orders.getActiveOrders);
  const updateStatus = useMutation(api.orders.updateOrderStatus);

  if (!orders) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white text-xl">Loading orders...</div>
      </div>
    );
  }

  const handleComplete = async (orderId: Id<"orders">) => {
    try {
      await updateStatus({ orderId, newStatus: "completed" });
    } catch (error) {
      console.error("Failed to update order:", error);
      // TODO: Add toast notification for errors (future enhancement)
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Orders Dashboard</h1>

        {orders.length === 0 ? (
          <div className="text-center text-gray-400 text-xl mt-16">
            No orders yet. Time to get some customers! 🚀
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {orders.map((order) => (
              <div
                key={order._id}
                className="bg-slate-800 border border-slate-700 p-6 rounded-2xl hover:border-purple-500/50 transition-all"
              >
                {/* Header with name and status badge */}
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-white">
                    {order.customerName}
                  </h3>
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs font-bold uppercase">
                    {order.status}
                  </span>
                </div>

                {/* Item description */}
                <p className="text-slate-400 mb-4">{order.itemDescription}</p>

                {/* Pickup code display */}
                <div className="bg-black/30 p-4 rounded-lg mb-4">
                  <span className="text-xs text-slate-500 block uppercase mb-1">
                    Pickup Code
                  </span>
                  <span className="text-3xl font-mono text-pink-500 tracking-widest font-bold">
                    {order.pickupCode}
                  </span>
                </div>

                {/* Complete button */}
                <button
                  onClick={() => handleComplete(order._id)}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={order.status === "completed"}
                >
                  {order.status === "completed" ? "Completed ✓" : "Complete"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
