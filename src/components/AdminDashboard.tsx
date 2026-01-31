import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const statusColors: Record<string, string> = {
  paid: "bg-yellow-500/20 text-yellow-400 border-yellow-700",
  dropped_off: "bg-blue-500/20 text-blue-400 border-blue-700",
  in_progress: "bg-purple-500/20 text-purple-400 border-purple-700",
  ready_for_pickup: "bg-green-500/20 text-green-400 border-green-700",
  completed: "bg-slate-500/20 text-slate-400 border-slate-700",
};

interface ActionButton {
  label: string;
  nextStatus: "dropped_off" | "in_progress" | "ready_for_pickup" | "completed";
}

function getActionButton(status: string): ActionButton | null {
  switch (status) {
    case "dropped_off":
      return { label: "Start Working", nextStatus: "in_progress" };
    case "in_progress":
      return { label: "Mark Ready", nextStatus: "ready_for_pickup" };
    case "ready_for_pickup":
      return { label: "Complete", nextStatus: "completed" };
    default:
      return null;
  }
}

export default function AdminDashboard() {
  const orders = useQuery(api.orders.getActiveOrders);
  const updateStatus = useMutation(api.orders.updateOrderStatus);

  if (!orders) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-8">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  const handleStatusUpdate = async (orderId: Id<"orders">, newStatus: "dropped_off" | "in_progress" | "ready_for_pickup" | "completed") => {
    try {
      await updateStatus({ orderId, newStatus });
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Failed to update status. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">Admin Dashboard</h1>
          <a
            href="/internal/inventory"
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
          >
            Manage Inventory
          </a>
        </div>

        {orders.length === 0 ? (
          <div className="text-center text-slate-400 text-xl mt-16">
            No orders yet. LFG! 🚀
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {orders.map((order) => {
              const action = getActionButton(order.status);
              return (
                <div
                  key={order._id}
                  className="bg-slate-800 border-2 border-slate-700 p-6 rounded-2xl hover:border-purple-500/50 transition-all"
                >
                  {/* Status Badge */}
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-white">
                      {order.customerName}
                    </h3>
                    <span className={`px-3 py-1 border rounded-full text-xs font-bold uppercase ${statusColors[order.status]}`}>
                      {order.status.replace("_", " ")}
                    </span>
                  </div>

                  {/* Item */}
                  <p className="text-slate-400 mb-4">{order.itemDescription}</p>

                  {/* Pickup Code */}
                  <div className="bg-black/30 p-4 rounded-lg mb-4">
                    <span className="text-xs text-slate-500 block uppercase mb-1">
                      Pickup Code
                    </span>
                    <span className="text-3xl font-mono text-pink-500 tracking-widest font-bold">
                      {order.pickupCode}
                    </span>
                  </div>

                  {/* Action Button */}
                  {action && (
                    <button
                      onClick={() => handleStatusUpdate(order._id, action.nextStatus)}
                      className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg hover:opacity-90 transition-opacity"
                    >
                      {action.label}
                    </button>
                  )}

                  {order.status === "completed" && (
                    <div className="text-center text-slate-500 py-3">
                      ✓ Completed
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
