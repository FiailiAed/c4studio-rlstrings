import { renderers } from './renderers.mjs';
import { c as createExports, s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_D79KS9C4.mjs';
import { manifest } from './manifest_DJgZQJvV.mjs';

const serverIslandMap = new Map();;

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/api/webhooks/stripe.astro.mjs');
const _page2 = () => import('./pages/drop-off/_id_.astro.mjs');
const _page3 = () => import('./pages/internal/admin.astro.mjs');
const _page4 = () => import('./pages/internal/dashboard.astro.mjs');
const _page5 = () => import('./pages/internal/inventory.astro.mjs');
const _page6 = () => import('./pages/internal/testorder.astro.mjs');
const _page7 = () => import('./pages/order/_id_.astro.mjs');
const _page8 = () => import('./pages/index.astro.mjs');
const pageMap = new Map([
    ["node_modules/astro/dist/assets/endpoint/generic.js", _page0],
    ["src/pages/api/webhooks/stripe.ts", _page1],
    ["src/pages/drop-off/[id].astro", _page2],
    ["src/pages/internal/admin.astro", _page3],
    ["src/pages/internal/dashboard.astro", _page4],
    ["src/pages/internal/inventory.astro", _page5],
    ["src/pages/internal/testOrder.astro", _page6],
    ["src/pages/order/[id].astro", _page7],
    ["src/pages/index.astro", _page8]
]);

const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    actions: () => import('./noop-entrypoint.mjs'),
    middleware: () => import('./_noop-middleware.mjs')
});
const _args = {
    "middlewareSecret": "e7c4edc5-d68f-47b1-a0e3-f88ef4751081",
    "skewProtection": false
};
const _exports = createExports(_manifest, _args);
const __astrojsSsrVirtualEntry = _exports.default;
const _start = 'start';
if (Object.prototype.hasOwnProperty.call(serverEntrypointModule, _start)) ;

export { __astrojsSsrVirtualEntry as default, pageMap };
