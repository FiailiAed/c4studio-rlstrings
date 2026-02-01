import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server';

const isAdminRoute = createRouteMatcher(['/admin(.*)']);
const isInternalRoute = createRouteMatcher(['/internal(.*)']);

export const onRequest = clerkMiddleware((auth, context) => {
  const { redirectToSignIn, userId } = auth();
  const { request } = context;

  if ((isAdminRoute(request) || isInternalRoute(request)) && !userId) {
    return redirectToSignIn();
  }
});
