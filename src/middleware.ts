import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server';

const isAdminRoute = createRouteMatcher(['/admin(.*)']);

export const onRequest = clerkMiddleware((auth, context) => {
    const { redirectToSignIn, userId } = auth();
    const { request } = context;

    // 1. If it's an admin route and they aren't logged in, send them to sign-in
    if (isAdminRoute(request) && !userId) {
        return redirectToSignIn();
    }
});
