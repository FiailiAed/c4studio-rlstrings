import { useState, useMemo } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexProvider, useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

const DropOffConfirmInner = ({ pickupCode }: { pickupCode: string }) => {
  const order = useQuery(api.orders.getPublicOrderByPickupCode, { pickupCode });
  const confirmDropOff = useMutation(api.orders.confirmDropOff);

  const [showInput, setShowInput] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (order === undefined) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 text-center space-y-2">
        <div className="h-4 w-48 mx-auto bg-slate-700/50 rounded animate-pulse" />
        <div className="mt-2 w-full h-14 bg-slate-700/50 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (order === null) return null;

  if (success || order.status === "dropped_off") {
    const droppedOffAt = order.droppedOffAt
      ? new Date(order.droppedOffAt).toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : new Date().toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        });

    return (
      <div className="bg-slate-900/50 backdrop-blur-sm border border-green-700/50 rounded-xl p-6 text-center space-y-3">
        <div className="mx-auto w-14 h-14 rounded-full bg-green-600/20 border-2 border-green-500 flex items-center justify-center">
          <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-white">Drop-Off Confirmed!</h3>
        <p className="text-slate-400 text-sm">{droppedOffAt}</p>
        <p className="text-slate-300 text-sm">Your stick is at Stellar, waiting for pickup by the stringer.</p>
      </div>
    );
  }

  if (order.status !== "paid") return null;

  if (!showInput) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 text-center space-y-2">
        <p className="text-slate-400 text-xs uppercase tracking-widest">Ready to Drop Off Your Stick?</p>
        <button
          onClick={() => setShowInput(true)}
          className="mt-2 w-full py-4 bg-red-600 hover:bg-red-700 text-white text-lg font-bold uppercase tracking-widest rounded-lg transition-colors"
        >
          Confirm Drop-Off
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await confirmDropOff({ pickupCode, confirmCode: code });
      setSuccess(true);
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : "Something went wrong.";
      const match = raw.match(/Uncaught Error:\s*(.+)/);
      setError(match ? match[1].trim() : raw);
    }
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 text-center space-y-4">
      <p className="text-slate-400 text-sm">Enter your 4-digit order code to confirm drop-off</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          inputMode="numeric"
          maxLength={4}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="0000"
          className="w-full text-center text-4xl font-mono font-black tracking-[0.5em] bg-slate-800/50 border border-slate-600/50 rounded-lg p-4 text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50"
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
            className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold uppercase tracking-widest rounded-lg transition-colors"
          >
            Confirm
          </button>
        </div>
      </form>
    </div>
  );
};

export default function DropOffConfirm({ pickupCode, convexUrl }: { pickupCode: string; convexUrl: string }) {
  const client = useMemo(() => new ConvexReactClient(convexUrl), [convexUrl]);
  return (
    <ConvexProvider client={client}>
      <DropOffConfirmInner pickupCode={pickupCode} />
    </ConvexProvider>
  );
}
