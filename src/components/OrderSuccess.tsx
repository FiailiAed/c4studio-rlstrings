import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { QRCodeSVG } from "qrcode.react";
import type { Id } from "../../convex/_generated/dataModel";

interface Props {
  orderId: string;
}

export default function OrderSuccess({ orderId }: Props) {
  // Validate ID format - Convex IDs start with specific prefixes
  const isValidId = orderId && (orderId.startsWith('j') || orderId.startsWith('k'));

  const order = useQuery(
    api.orders.getOrderById,
    isValidId ? { orderId: orderId as Id<"orders"> } : "skip"
  );

  if (!isValidId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h1 className="text-4xl font-bold text-red-400 mb-4">Invalid Order ID</h1>
          <p className="text-slate-400 mb-6">
            The order ID in the URL is not valid. Please check your link and try again.
          </p>
          <a
            href="/internal/testOrder"
            className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:opacity-90"
          >
            Create Test Order
          </a>
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
            We couldn't find an order with this ID. It may have been deleted or the link is incorrect.
          </p>
          <a
            href="/internal/testOrder"
            className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:opacity-90"
          >
            Create Test Order
          </a>
        </div>
      </div>
    );
  }

  const dropOffUrl = `${window.location.origin}/drop-off/${orderId}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Success header */}
        <h1 className="text-4xl font-bold text-white mb-2">✓ Order Confirmed!</h1>
        <p className="text-slate-400 mb-8">Your order has been received and payment confirmed.</p>

        {/* QR Code Card */}
        <div className="bg-slate-800 border-2 border-slate-700 p-8 rounded-2xl mb-6">
          <div className="flex justify-center mb-6">
            <div className="bg-white p-6 rounded-xl">
              <QRCodeSVG value={dropOffUrl} size={256} level="H" />
            </div>
          </div>

          {/* Pickup Code */}
          <div className="bg-black/30 p-6 rounded-lg mb-4">
            <span className="text-slate-400 block mb-2 text-sm uppercase">Your Pickup Code:</span>
            <span className="text-pink-500 font-mono text-4xl font-bold tracking-widest">
              {order.pickupCode}
            </span>
          </div>

          {/* Order Details */}
          <div className="text-slate-300 mb-6 space-y-2">
            <p className="flex justify-between">
              <strong className="text-slate-400">Item:</strong>
              <span>{order.itemDescription}</span>
            </p>
            <p className="flex justify-between">
              <strong className="text-slate-400">Name:</strong>
              <span>{order.customerName}</span>
            </p>
            <p className="flex justify-between">
              <strong className="text-slate-400">Email:</strong>
              <span className="text-sm">{order.email}</span>
            </p>
          </div>

          {/* Instructions */}
          <div className="border-t border-slate-700 pt-4">
            <p className="text-white font-bold mb-2">📍 Next Step:</p>
            <p className="text-slate-400">
              Bring your stick to <strong className="text-white">Stellar Athletics</strong> and
              scan this QR code when you arrive. We'll text you when it's ready!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-slate-500 text-sm">
          Questions? Text us or visit us at Stellar Athletics.
        </div>
      </div>
    </div>
  );
}
