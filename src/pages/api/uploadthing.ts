import type { APIRoute } from "astro";
import { createRouteHandler } from "uploadthing/server";
import { ourFileRouter } from "../../lib/uploadthing";

const handler = createRouteHandler({
  router: ourFileRouter,
  config: {
    token: import.meta.env.UPLOADTHING_TOKEN,
  },
});

export const GET: APIRoute = ({ request }) => handler(request);
export const POST: APIRoute = ({ request }) => handler(request);
