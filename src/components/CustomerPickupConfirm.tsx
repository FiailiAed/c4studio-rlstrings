import { useState, useMemo } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexProvider, useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

const CustomerPickupInner = ({ pickupCode }: { pickupCode: string }) => {
  const order = useQuery(api.orders.getPublicOrderByPickupCode, { pickupCode });
  const confirmPickup = useMutation(api.orders.confirmCustomerPickup);
  const confirmReview = useMutation(api.orders.confirmReview);

  const [showInput, setShowInput] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleLeaveReview = async () => {
    try {
      await confirmReview({ pickupCode });
    } catch {
      // fire-and-forget — open review link regardless
    }
    window.open("https://g.page/r/review", "_blank", "noopener,noreferrer");
  };

  if (order === undefined) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 text-center space-y-2">
        <div className="h-4 w-48 mx-auto bg-slate-700/50 rounded animate-pulse" />
        <div className="mt-2 w-full h-14 bg-slate-700/50 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!order) return null;

  if (success || order.status === "picked_up_by_customer" || order.status === "review" || order.status === "completed") {
    const pickedUpAt = order.pickedUpByCustomerAt
      ? new Date(order.pickedUpByCustomerAt).toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : null;
    const showReview = order.status !== "completed";

    return (
      <>
        <div className="bg-slate-900/50 backdrop-blur-sm border border-green-700/50 rounded-xl p-6 text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-full bg-green-600/20 border-2 border-green-500 flex items-center justify-center">
            <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white">Pickup Confirmed!</h3>
          {pickedUpAt && <p className="text-slate-400 text-sm">{pickedUpAt}</p>}
          <p className="text-slate-300 text-sm">You've picked up your stick! {showReview ? "Please leave us a review." : "Thank you!"}</p>
        </div>

        {showReview && (
          <div className="bg-slate-900/50 backdrop-blur-sm border border-pink-700/50 rounded-xl p-6 text-center space-y-3 mt-4">
            <p className="text-pink-300 text-xs uppercase tracking-widest">One Last Thing!</p>
            <h3 className="text-xl font-bold text-white">Leave Us a Review</h3>
            <p className="text-slate-400 text-sm">We'd love to hear about your experience with RL Strings.</p>
            <button
              onClick={handleLeaveReview}
              className="mt-2 w-full px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white font-bold uppercase tracking-widest rounded-lg transition-colors"
            >
              Leave a Review
            </button>
          </div>
        )}
      </>
    );
  }

  if (order.status !== "ready_for_pickup") return null;

  if (!showInput) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-700/50 rounded-xl p-6 text-center space-y-2">
        <p className="text-purple-300 text-xs uppercase tracking-widest">Your Stick is Ready!</p>
        <p className="text-slate-400 text-sm">Pick up your stick at Stellar and confirm below.</p>
        <button
          onClick={() => setShowInput(true)}
          className="mt-2 w-full py-4 bg-purple-600 hover:bg-purple-700 text-white text-lg font-bold uppercase tracking-widest rounded-lg transition-colors"
        >
          Confirm Pickup
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await confirmPickup({ pickupCode, confirmCode: code });
      setSuccess(true);
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : "Something went wrong.";
      const match = raw.match(/Uncaught Error:\s*(.+)/);
      setError(match ? match[1].trim() : raw);
    }
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-700/50 rounded-xl p-6 text-center space-y-4">
      <p className="text-slate-400 text-sm">Enter your 4-digit order code to confirm pickup</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          inputMode="numeric"
          maxLength={4}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="0000"
          className="w-full text-center text-4xl font-mono font-black tracking-[0.5em] bg-slate-800/50 border border-slate-600/50 rounded-lg p-4 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50"
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => { setShowInput(false); setCode(""); setError(""); }}
            className="flex-1 py-3 border border-slate-600/50 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={code.length < 4}
            className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold uppercase tracking-widest rounded-lg transition-colors"
          >
            Confirm
          </button>
        </div>
      </form>
    </div>
  );
};

export default function CustomerPickupConfirm({ pickupCode, convexUrl }: { pickupCode: string; convexUrl: string }) {
  const client = useMemo(() => new ConvexReactClient(convexUrl), [convexUrl]);
  return (
    <ConvexProvider client={client}>
      <CustomerPickupInner pickupCode={pickupCode} />
    </ConvexProvider>
  );
}
