import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server';

const isAdminRoute = createRouteMatcher(['/admin(.*)']);

export const onRequest = clerkMiddleware((auth, context) => {
    const { userId, sessionClaims, redirectToSignIn } = auth();
    const role = (sessionClaims?.metadata as { role?: string })?.role;
    const { request } = context;

    // 1. If it's an admin route and they aren't logged in, send them to sign-in
    if (isAdminRoute(request) && !userId) {
        return redirectToSignIn();
    }

    if (isAdminRoute(request) && role !== 'admin') {
        return redirectToSignIn();
    }

});
