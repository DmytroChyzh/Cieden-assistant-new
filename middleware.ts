import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

// Define protected routes (authentication required)
const isProtectedRoute = createRouteMatcher(["/orchestration/(.*)"]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const { pathname } = request.nextUrl;
  const isAuthenticated = await convexAuth.isAuthenticated();

  // Route landing page to voice chat (the main entry point)
  if (pathname === "/") {
    return nextjsMiddlewareRedirect(request, "/voice-chat");
  }

  // Redirect ALL traffic away from legacy auth pages
  // We no longer expose dedicated sign-in / sign-up screens.
  if (pathname === "/signin" || pathname === "/signup") {
    return nextjsMiddlewareRedirect(request, "/voice-chat");
  }

  // Protect admin-only routes
  if (isProtectedRoute(request) && !isAuthenticated) {
    return nextjsMiddlewareRedirect(request, "/voice-chat");
  }

  return;
});

export const config = {
  matcher: ["/((?!.*\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
