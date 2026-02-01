import { e as createComponent, k as renderHead, g as addAttribute, r as renderTemplate, h as createAstro } from "../../chunks/astro/server_DIDqcQmM.mjs";
import "piccolore";
import "clsx";
/* empty css                                    */
import { ConvexClient } from "convex/browser";
import { a as api } from "../../chunks/api_CiOgqZ63.mjs";
import { renderers } from "../../renderers.mjs";
const convexUrl = "https://kindly-beagle-851.convex.cloud";
let client = null;
function getConvexClient() {
  if (!client) {
    client = new ConvexClient(convexUrl);
  }
  return client;
}
new ConvexClient(convexUrl);
const $$Astro = createAstro();
const $$id = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$id;
  const { id } = Astro2.params;
  if (!id) return Astro2.redirect("/404");
  const convex = getConvexClient();
  const order = await convex.query(api.orders.getOrderById, { orderId: id });
  if (!order) return Astro2.redirect("/404");
  const progressSteps = [
    { step: 1, label: "Order Placed", active: true },
    { step: 2, label: "Pending Dropoff", active: order.status === "paid" && !order.droppedOffAt },
    { step: 3, label: "Dropped Off", active: order.status === "dropped_off" || !!order.droppedOffAt },
    { step: 4, label: "Admin Picked Up", active: ["in_progress", "ready_for_pickup", "completed"].includes(order.status) },
    { step: 5, label: "Stringing in Progress", active: ["in_progress", "ready_for_pickup", "completed"].includes(order.status) },
    { step: 6, label: "Stringing Complete", active: ["ready_for_pickup", "completed"].includes(order.status) },
    { step: 7, label: "Waiting at Stellar", active: ["ready_for_pickup", "completed"].includes(order.status) },
    { step: 8, label: "Customer Picked Up", active: order.status === "completed" },
    { step: 9, label: "Customer Review Left", active: false },
    // Future feature
    { step: 10, label: "Order Complete", active: order.status === "completed" }
  ];
  const currentStep = progressSteps.filter((s) => s.active).length;
  return renderTemplate`<html lang="en"> <head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Order ${order.pickupCode} - RL Strings</title>${renderHead()}</head> <body class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"> <main class="container mx-auto px-4 py-16 max-w-4xl"> <!-- Header --> <h1 class="text-4xl font-bold text-white mb-8 text-center">
Order Tracking
</h1> <!-- Progress Indicator --> <div class="bg-white/5 backdrop-blur-lg rounded-2xl p-8 mb-8"> <div class="grid grid-cols-5 gap-2 mb-6"> ${progressSteps.map((step) => renderTemplate`<div${addAttribute(`text-center ${step.active ? "text-green-400" : "text-gray-500"}`, "class")}> <div${addAttribute(`w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-2 text-sm font-bold ${step.active ? "bg-green-500 text-white" : "bg-gray-700"}`, "class")}> ${step.step} </div> <p class="text-xs leading-tight">${step.label}</p> </div>`)} </div> <!-- Progress Bar --> <div class="w-full bg-gray-700 h-3 rounded-full overflow-hidden"> <div class="bg-green-500 h-3 rounded-full transition-all duration-500"${addAttribute(`width: ${currentStep / progressSteps.length * 100}%`, "style")}></div> </div> </div> <!-- Order Details --> <div class="bg-white/5 backdrop-blur-lg rounded-2xl p-8"> <h2 class="text-2xl font-bold text-white mb-6">Order Information</h2> <div class="grid md:grid-cols-2 gap-6 text-white"> <div> <p class="text-gray-400 text-sm mb-1">Pickup Code</p> <p class="text-4xl font-bold text-purple-400">${order.pickupCode}</p> </div> <div> <p class="text-gray-400 text-sm mb-1">Customer Name</p> <p class="text-xl">${order.customerName}</p> </div> <div> <p class="text-gray-400 text-sm mb-1">Email</p> <p class="text-xl break-all">${order.email}</p> </div> <div> <p class="text-gray-400 text-sm mb-1">Order Type</p> <p class="text-xl capitalize">${order.orderType}</p> </div> <div class="md:col-span-2"> <p class="text-gray-400 text-sm mb-1">Item Description</p> <p class="text-xl">${order.itemDescription}</p> </div> ${order.droppedOffAt && renderTemplate`<div> <p class="text-gray-400 text-sm mb-1">Dropped Off</p> <p class="text-lg">${new Date(order.droppedOffAt).toLocaleString()}</p> </div>`} ${order.completedAt && renderTemplate`<div> <p class="text-gray-400 text-sm mb-1">Completed</p> <p class="text-lg">${new Date(order.completedAt).toLocaleString()}</p> </div>`} </div> </div> </main> </body></html>`;
}, "/Users/ma1/Development/Consulting/rl-strings-llc/src/pages/order/[id].astro", void 0);
const $$file = "/Users/ma1/Development/Consulting/rl-strings-llc/src/pages/order/[id].astro";
const $$url = "/order/[id]";
const _page = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: $$id,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: "Module" }));
const page = () => _page;
export {
  page,
  renderers
};
