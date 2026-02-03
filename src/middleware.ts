import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server';

const isAdminRoute = createRouteMatcher(['/admin(.*)']);

export const onRequest = clerkMiddleware((auth, context) => {
    const { redirectToSignIn, userId } = auth();
    const { request } = context;

    if (isAdminRoute(request) && !userId) {
        return redirectToSignIn();
    }
});
