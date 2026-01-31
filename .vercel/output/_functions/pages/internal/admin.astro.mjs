import { e as createComponent, k as renderHead, l as renderComponent, r as renderTemplate } from '../../chunks/astro/server_CbToLR3j.mjs';
import 'piccolore';
/* empty css                                   */
export { renderers } from '../../renderers.mjs';

const $$Admin = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`<html lang="en"> <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Admin Dashboard - RL Strings</title><meta name="robots" content="noindex, nofollow">${renderHead()}</head> <body> ${renderComponent($$result, "AdminDashboardApp", null, { "client:only": "react", "client:component-hydration": "only", "client:component-path": "/Users/ma1/Development/Consulting/rl-strings-llc/src/components/AdminDashboardApp", "client:component-export": "default" })} </body></html>`;
}, "/Users/ma1/Development/Consulting/rl-strings-llc/src/pages/internal/admin.astro", void 0);

const $$file = "/Users/ma1/Development/Consulting/rl-strings-llc/src/pages/internal/admin.astro";
const $$url = "/internal/admin";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Admin,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
