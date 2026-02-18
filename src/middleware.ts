import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server';

const isAdminRoute = createRouteMatcher(['/admin(.*)']);
const isAdminSignIn = createRouteMatcher(['/admin/sign-in']);

export const onRequest = clerkMiddleware((auth, context) => {
    const { userId, sessionClaims, redirectToSignIn } = auth();
    const role = (sessionClaims?.metadata as { role?: string })?.role;
    const { request } = context;

    // Allow unauthenticated access to admin sign-in (prevents redirect loop)
    if (isAdminSignIn(request)) return;

    // 1. If it's an admin route and they aren't logged in, send them to sign-in
    if (isAdminRoute(request) && !userId) {
        return redirectToSignIn();
    }

    if (isAdminRoute(request) && role !== 'admin') {
        return redirectToSignIn();
    }
});
