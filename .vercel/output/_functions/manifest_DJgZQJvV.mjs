import 'piccolore';
import { n as decodeKey } from './chunks/astro/server_CbToLR3j.mjs';
import 'clsx';
import { N as NOOP_MIDDLEWARE_FN } from './chunks/astro-designed-error-pages_D-ChK-1e.mjs';
import 'es-module-lexer';

function sanitizeParams(params) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => {
      if (typeof value === "string") {
        return [key, value.normalize().replace(/#/g, "%23").replace(/\?/g, "%3F")];
      }
      return [key, value];
    })
  );
}
function getParameter(part, params) {
  if (part.spread) {
    return params[part.content.slice(3)] || "";
  }
  if (part.dynamic) {
    if (!params[part.content]) {
      throw new TypeError(`Missing parameter: ${part.content}`);
    }
    return params[part.content];
  }
  return part.content.normalize().replace(/\?/g, "%3F").replace(/#/g, "%23").replace(/%5B/g, "[").replace(/%5D/g, "]");
}
function getSegment(segment, params) {
  const segmentPath = segment.map((part) => getParameter(part, params)).join("");
  return segmentPath ? "/" + segmentPath : "";
}
function getRouteGenerator(segments, addTrailingSlash) {
  return (params) => {
    const sanitizedParams = sanitizeParams(params);
    let trailing = "";
    if (addTrailingSlash === "always" && segments.length) {
      trailing = "/";
    }
    const path = segments.map((segment) => getSegment(segment, sanitizedParams)).join("") + trailing;
    return path || "/";
  };
}

function deserializeRouteData(rawRouteData) {
  return {
    route: rawRouteData.route,
    type: rawRouteData.type,
    pattern: new RegExp(rawRouteData.pattern),
    params: rawRouteData.params,
    component: rawRouteData.component,
    generate: getRouteGenerator(rawRouteData.segments, rawRouteData._meta.trailingSlash),
    pathname: rawRouteData.pathname || void 0,
    segments: rawRouteData.segments,
    prerender: rawRouteData.prerender,
    redirect: rawRouteData.redirect,
    redirectRoute: rawRouteData.redirectRoute ? deserializeRouteData(rawRouteData.redirectRoute) : void 0,
    fallbackRoutes: rawRouteData.fallbackRoutes.map((fallback) => {
      return deserializeRouteData(fallback);
    }),
    isIndex: rawRouteData.isIndex,
    origin: rawRouteData.origin
  };
}

function deserializeManifest(serializedManifest) {
  const routes = [];
  for (const serializedRoute of serializedManifest.routes) {
    routes.push({
      ...serializedRoute,
      routeData: deserializeRouteData(serializedRoute.routeData)
    });
    const route = serializedRoute;
    route.routeData = deserializeRouteData(serializedRoute.routeData);
  }
  const assets = new Set(serializedManifest.assets);
  const componentMetadata = new Map(serializedManifest.componentMetadata);
  const inlinedScripts = new Map(serializedManifest.inlinedScripts);
  const clientDirectives = new Map(serializedManifest.clientDirectives);
  const serverIslandNameMap = new Map(serializedManifest.serverIslandNameMap);
  const key = decodeKey(serializedManifest.key);
  return {
    // in case user middleware exists, this no-op middleware will be reassigned (see plugin-ssr.ts)
    middleware() {
      return { onRequest: NOOP_MIDDLEWARE_FN };
    },
    ...serializedManifest,
    assets,
    componentMetadata,
    inlinedScripts,
    clientDirectives,
    routes,
    serverIslandNameMap,
    key
  };
}

const manifest = deserializeManifest({"hrefRoot":"file:///Users/ma1/Development/Consulting/rl-strings-llc/","cacheDir":"file:///Users/ma1/Development/Consulting/rl-strings-llc/node_modules/.astro/","outDir":"file:///Users/ma1/Development/Consulting/rl-strings-llc/dist/","srcDir":"file:///Users/ma1/Development/Consulting/rl-strings-llc/src/","publicDir":"file:///Users/ma1/Development/Consulting/rl-strings-llc/public/","buildClientDir":"file:///Users/ma1/Development/Consulting/rl-strings-llc/dist/client/","buildServerDir":"file:///Users/ma1/Development/Consulting/rl-strings-llc/dist/server/","adapterName":"@astrojs/vercel","routes":[{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"page","component":"_server-islands.astro","params":["name"],"segments":[[{"content":"_server-islands","dynamic":false,"spread":false}],[{"content":"name","dynamic":true,"spread":false}]],"pattern":"^\\/_server-islands\\/([^/]+?)\\/?$","prerender":false,"isIndex":false,"fallbackRoutes":[],"route":"/_server-islands/[name]","origin":"internal","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"endpoint","isIndex":false,"route":"/_image","pattern":"^\\/_image\\/?$","segments":[[{"content":"_image","dynamic":false,"spread":false}]],"params":[],"component":"node_modules/astro/dist/assets/endpoint/generic.js","pathname":"/_image","prerender":false,"fallbackRoutes":[],"origin":"internal","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/webhooks/stripe","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/webhooks\\/stripe\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"webhooks","dynamic":false,"spread":false}],[{"content":"stripe","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/webhooks/stripe.ts","pathname":"/api/webhooks/stripe","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/_id_.EepwbcDB.css"}],"routeData":{"route":"/drop-off/[id]","isIndex":false,"type":"page","pattern":"^\\/drop-off\\/([^/]+?)\\/?$","segments":[[{"content":"drop-off","dynamic":false,"spread":false}],[{"content":"id","dynamic":true,"spread":false}]],"params":["id"],"component":"src/pages/drop-off/[id].astro","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/_id_.EepwbcDB.css"}],"routeData":{"route":"/internal/admin","isIndex":false,"type":"page","pattern":"^\\/internal\\/admin\\/?$","segments":[[{"content":"internal","dynamic":false,"spread":false}],[{"content":"admin","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/internal/admin.astro","pathname":"/internal/admin","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/_id_.EepwbcDB.css"}],"routeData":{"route":"/internal/dashboard","isIndex":false,"type":"page","pattern":"^\\/internal\\/dashboard\\/?$","segments":[[{"content":"internal","dynamic":false,"spread":false}],[{"content":"dashboard","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/internal/dashboard.astro","pathname":"/internal/dashboard","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/_id_.EepwbcDB.css"}],"routeData":{"route":"/internal/inventory","isIndex":false,"type":"page","pattern":"^\\/internal\\/inventory\\/?$","segments":[[{"content":"internal","dynamic":false,"spread":false}],[{"content":"inventory","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/internal/inventory.astro","pathname":"/internal/inventory","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/_id_.EepwbcDB.css"}],"routeData":{"route":"/internal/testorder","isIndex":false,"type":"page","pattern":"^\\/internal\\/testOrder\\/?$","segments":[[{"content":"internal","dynamic":false,"spread":false}],[{"content":"testOrder","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/internal/testOrder.astro","pathname":"/internal/testOrder","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/_id_.EepwbcDB.css"}],"routeData":{"route":"/order/[id]","isIndex":false,"type":"page","pattern":"^\\/order\\/([^/]+?)\\/?$","segments":[[{"content":"order","dynamic":false,"spread":false}],[{"content":"id","dynamic":true,"spread":false}]],"params":["id"],"component":"src/pages/order/[id].astro","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/_id_.EepwbcDB.css"}],"routeData":{"route":"/","isIndex":true,"type":"page","pattern":"^\\/$","segments":[],"params":[],"component":"src/pages/index.astro","pathname":"/","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}}],"base":"/","trailingSlash":"ignore","compressHTML":true,"componentMetadata":[["/Users/ma1/Development/Consulting/rl-strings-llc/src/pages/drop-off/[id].astro",{"propagation":"none","containsHead":true}],["/Users/ma1/Development/Consulting/rl-strings-llc/src/pages/internal/admin.astro",{"propagation":"none","containsHead":true}],["/Users/ma1/Development/Consulting/rl-strings-llc/src/pages/internal/dashboard.astro",{"propagation":"none","containsHead":true}],["/Users/ma1/Development/Consulting/rl-strings-llc/src/pages/internal/inventory.astro",{"propagation":"none","containsHead":true}],["/Users/ma1/Development/Consulting/rl-strings-llc/src/pages/internal/testOrder.astro",{"propagation":"none","containsHead":true}],["/Users/ma1/Development/Consulting/rl-strings-llc/src/pages/order/[id].astro",{"propagation":"none","containsHead":true}],["/Users/ma1/Development/Consulting/rl-strings-llc/src/pages/index.astro",{"propagation":"none","containsHead":true}]],"renderers":[],"clientDirectives":[["idle","(()=>{var l=(n,t)=>{let i=async()=>{await(await n())()},e=typeof t.value==\"object\"?t.value:void 0,s={timeout:e==null?void 0:e.timeout};\"requestIdleCallback\"in window?window.requestIdleCallback(i,s):setTimeout(i,s.timeout||200)};(self.Astro||(self.Astro={})).idle=l;window.dispatchEvent(new Event(\"astro:idle\"));})();"],["load","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).load=e;window.dispatchEvent(new Event(\"astro:load\"));})();"],["media","(()=>{var n=(a,t)=>{let i=async()=>{await(await a())()};if(t.value){let e=matchMedia(t.value);e.matches?i():e.addEventListener(\"change\",i,{once:!0})}};(self.Astro||(self.Astro={})).media=n;window.dispatchEvent(new Event(\"astro:media\"));})();"],["only","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).only=e;window.dispatchEvent(new Event(\"astro:only\"));})();"],["visible","(()=>{var a=(s,i,o)=>{let r=async()=>{await(await s())()},t=typeof i.value==\"object\"?i.value:void 0,c={rootMargin:t==null?void 0:t.rootMargin},n=new IntersectionObserver(e=>{for(let l of e)if(l.isIntersecting){n.disconnect(),r();break}},c);for(let e of o.children)n.observe(e)};(self.Astro||(self.Astro={})).visible=a;window.dispatchEvent(new Event(\"astro:visible\"));})();"]],"entryModules":{"\u0000noop-middleware":"_noop-middleware.mjs","\u0000virtual:astro:actions/noop-entrypoint":"noop-entrypoint.mjs","\u0000@astro-page:src/pages/api/webhooks/stripe@_@ts":"pages/api/webhooks/stripe.astro.mjs","\u0000@astro-page:src/pages/drop-off/[id]@_@astro":"pages/drop-off/_id_.astro.mjs","\u0000@astro-page:src/pages/internal/admin@_@astro":"pages/internal/admin.astro.mjs","\u0000@astro-page:src/pages/internal/dashboard@_@astro":"pages/internal/dashboard.astro.mjs","\u0000@astro-page:src/pages/internal/inventory@_@astro":"pages/internal/inventory.astro.mjs","\u0000@astro-page:src/pages/internal/testOrder@_@astro":"pages/internal/testorder.astro.mjs","\u0000@astro-page:src/pages/order/[id]@_@astro":"pages/order/_id_.astro.mjs","\u0000@astro-page:src/pages/index@_@astro":"pages/index.astro.mjs","\u0000@astrojs-ssr-virtual-entry":"entry.mjs","\u0000@astro-renderers":"renderers.mjs","\u0000@astro-page:node_modules/astro/dist/assets/endpoint/generic@_@js":"pages/_image.astro.mjs","\u0000@astrojs-ssr-adapter":"_@astrojs-ssr-adapter.mjs","\u0000@astrojs-manifest":"manifest_DJgZQJvV.mjs","/Users/ma1/Development/Consulting/rl-strings-llc/node_modules/astro/dist/assets/services/sharp.js":"chunks/sharp_CFCsCW8Z.mjs","/Users/ma1/Development/Consulting/rl-strings-llc/src/components/DropOffApp":"_astro/DropOffApp.p0rCb9VX.js","/Users/ma1/Development/Consulting/rl-strings-llc/src/components/InventoryManagerApp":"_astro/InventoryManagerApp.LCQLriyF.js","/Users/ma1/Development/Consulting/rl-strings-llc/src/components/DashboardApp":"_astro/DashboardApp.BS-1RKKN.js","/Users/ma1/Development/Consulting/rl-strings-llc/src/components/TestOrderApp":"_astro/TestOrderApp.z6IW5G1w.js","/Users/ma1/Development/Consulting/rl-strings-llc/src/components/AdminDashboardApp":"_astro/AdminDashboardApp.BvtXizbB.js","/Users/ma1/Development/Consulting/rl-strings-llc/src/components/OrderSuccessApp":"_astro/OrderSuccessApp.BfQ3gahG.js","@astrojs/react/client.js":"_astro/client.dXHaCmHv.js","astro:scripts/before-hydration.js":""},"inlinedScripts":[],"assets":["/_astro/_id_.EepwbcDB.css","/favicon.ico","/favicon.svg","/_astro/AdminDashboardApp.BvtXizbB.js","/_astro/DashboardApp.BS-1RKKN.js","/_astro/DropOffApp.p0rCb9VX.js","/_astro/InventoryManagerApp.LCQLriyF.js","/_astro/OrderSuccessApp.BfQ3gahG.js","/_astro/TestOrderApp.z6IW5G1w.js","/_astro/api.dMCnM2hZ.js","/_astro/client.dXHaCmHv.js","/_astro/index.DYrVU9rO.js"],"buildFormat":"directory","checkOrigin":true,"allowedDomains":[],"serverIslandNameMap":[],"key":"u7k5148GrbY6qZQtFsCtg7M6rVDOBlRc+bFidWMYRi8="});
if (manifest.sessionConfig) manifest.sessionConfig.driverModule = null;

export { manifest };
