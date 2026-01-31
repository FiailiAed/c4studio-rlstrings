import { e as createComponent, k as renderHead, l as renderComponent, r as renderTemplate, h as createAstro } from '../../chunks/astro/server_CbToLR3j.mjs';
import 'piccolore';
/* empty css                                   */
export { renderers } from '../../renderers.mjs';

const $$Astro = createAstro();
const $$id = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$id;
  const { id } = Astro2.params;
  if (!id) {
    return Astro2.redirect("/");
  }
  return renderTemplate`<html lang="en"> <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Confirm Drop-off - RL Strings</title>${renderHead()}</head> <body> ${renderComponent($$result, "DropOffApp", null, { "client:only": "react", "orderId": id, "client:component-hydration": "only", "client:component-path": "/Users/ma1/Development/Consulting/rl-strings-llc/src/components/DropOffApp", "client:component-export": "default" })} </body></html>`;
}, "/Users/ma1/Development/Consulting/rl-strings-llc/src/pages/drop-off/[id].astro", void 0);

const $$file = "/Users/ma1/Development/Consulting/rl-strings-llc/src/pages/drop-off/[id].astro";
const $$url = "/drop-off/[id]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$id,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
