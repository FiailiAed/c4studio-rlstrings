import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import type { Id } from "../../convex/_generated/dataModel";

interface Props {
  orderId: string;
}

export default function DropOff({ orderId }: Props) {
  // Validate ID format - Convex IDs start with specific prefixes
  const isValidId = orderId && (orderId.startsWith('j') || orderId.startsWith('k'));

  const order = useQuery(
    api.orders.getOrderById,
    isValidId ? { orderId: orderId as Id<"orders"> } : "skip"
  );
  const updateStatus = useMutation(api.orders.updateOrderStatus);
  const [isConfirming, setIsConfirming] = useState(false);

  if (!isValidId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h1 className="text-4xl font-bold text-red-400 mb-4">Invalid Order ID</h1>
          <p className="text-slate-400 mb-6">
            The order ID in the QR code is not valid. Please scan again or contact support.
          </p>
        </div>
      </div>
    );
  }

  if (order === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-8">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  if (order === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h1 className="text-4xl font-bold text-red-400 mb-4">Order Not Found</h1>
          <p className="text-slate-400 mb-6">
            We couldn't find this order. Please check the QR code or contact support.
          </p>
        </div>
      </div>
    );
  }

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await updateStatus({
        orderId: orderId as Id<"orders">,
        newStatus: "dropped_off"
      });
    } catch (error) {
      console.error("Failed to confirm drop-off:", error);
      alert("Failed to confirm drop-off. Please try again.");
    } finally {
      setIsConfirming(false);
    }
  };

  const isDroppedOff = order.status !== "paid";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-2xl mx-auto">
        {isDroppedOff ? (
          // Success state
          <div className="bg-green-900/20 border-2 border-green-700 p-8 rounded-2xl">
            <h1 className="text-4xl font-bold text-green-400 mb-4">✓ Stick Received</h1>
            <p className="text-slate-300 mb-2">
              Dropped off on: {new Date(order.droppedOffAt!).toLocaleString()}
            </p>
            <p className="text-slate-300 mb-4">
              Current status: <strong className="text-white uppercase">{order.status.replace("_", " ")}</strong>
            </p>
            <p className="text-slate-400">
              We'll send a text to <strong className="text-white">{order.phone || order.email}</strong> when it's ready for pickup!
            </p>
          </div>
        ) : (
          // Confirm drop-off state
          <div className="bg-slate-800 border-2 border-slate-700 p-8 rounded-2xl">
            <h1 className="text-4xl font-bold text-white mb-6">Confirm Stick Drop-off</h1>

            <div className="bg-black/30 p-6 rounded-lg mb-6 space-y-3">
              <p className="text-slate-400">
                Customer: <strong className="text-white">{order.customerName}</strong>
              </p>
              <p className="text-slate-400">
                Item: <strong className="text-white">{order.itemDescription}</strong>
              </p>
              <div className="pt-2 border-t border-slate-700">
                <p className="text-slate-400 text-sm mb-1">Pickup Code:</p>
                <span className="text-pink-500 font-mono text-3xl font-bold tracking-widest">
                  {order.pickupCode}
                </span>
              </div>
            </div>

            <button
              onClick={handleConfirm}
              disabled={isConfirming}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xl font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isConfirming ? "Confirming..." : "Confirm Drop-off"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
