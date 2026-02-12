import { useMemo } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexProvider, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const STATUS_STEPS = [
  { key: "paid", label: "Paid" },
  { key: "dropped_off", label: "Drop Off" },
  { key: "picked_up", label: "Pick Up" },
  { key: "stringing", label: "Picked Up" },
  { key: "strung", label: "Stringing" },
  { key: "ready_for_pickup", label: "Ready!" },
  { key: "picked_up_by_customer", label: "Confirm" },
  { key: "review", label: "Review" },
  { key: "completed", label: "Done" },
] as const;

const StepperInner = ({ pickupCode }: { pickupCode: string }) => {
  const order = useQuery(api.orders.getPublicOrderByPickupCode, { pickupCode });

  const statusIndex = order
    ? STATUS_STEPS.findIndex((s) => s.key === order.status)
    : -1;
  const currentStepIndex = statusIndex >= 0 ? statusIndex + 1 : -1;
  const headline = currentStepIndex < STATUS_STEPS.length
    ? STATUS_STEPS[currentStepIndex]?.label ?? "Order Status"
    : "Complete";

  if (!order) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-t border-slate-700/50 px-4 pt-3 pb-6 safe-bottom">
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="h-5 w-28 mx-auto bg-slate-700/50 rounded animate-pulse" />
          <div className="flex items-start gap-0">
            {STATUS_STEPS.map((_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-slate-700/50 animate-pulse" />
                <div className="mt-1.5 h-3 w-10 bg-slate-700/50 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-t border-slate-700/50 px-4 pt-3 pb-6 safe-bottom">
      <div className="max-w-2xl mx-auto space-y-2">
        <p className="text-center text-xs text-slate-400 uppercase tracking-widest">
          Status: <span className="text-white font-bold">{headline}</span>
        </p>
        <ol className="flex items-start gap-0">
          {STATUS_STEPS.map((step, i) => {
            const isCurrent = i === currentStepIndex;
            const isPast = i < currentStepIndex;
            const isFuture = i > currentStepIndex;
            const isLast = i === STATUS_STEPS.length - 1;

            return (
              <li
                key={step.key}
                className={`flex-1 flex flex-col items-center relative ${
                  !isLast
                    ? `after:content-[''] after:absolute after:top-3.5 after:left-[calc(50%+14px)] after:right-[calc(-50%+14px)] after:h-px ${
                        isPast ? "after:bg-red-600" : "after:bg-slate-700"
                      }`
                    : ""
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 text-[10px] font-bold border-2 transition-colors ${
                    isCurrent ? "bg-red-600 border-red-500 text-white" : ""
                  } ${isPast ? "bg-red-900/60 border-red-700 text-red-300" : ""} ${
                    isFuture ? "bg-slate-800 border-slate-600 text-slate-500" : ""
                  }`}
                >
                  {isPast ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                <p
                  className={`mt-1.5 text-center text-[10px] leading-tight px-0.5 ${
                    isCurrent ? "text-white font-bold" : ""
                  } ${isPast ? "text-red-400" : ""} ${isFuture ? "text-slate-500" : ""}`}
                >
                  {step.label}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
};

export default function OrderStatusStepper({
  pickupCode,
  convexUrl,
}: {
  pickupCode: string;
  convexUrl: string;
}) {
  const client = useMemo(() => new ConvexReactClient(convexUrl), [convexUrl]);
  return (
    <ConvexProvider client={client}>
      <StepperInner pickupCode={pickupCode} />
    </ConvexProvider>
  );
}
