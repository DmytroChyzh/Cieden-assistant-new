import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

// Only protect the orchestration area.
const isProtectedRoute = createRouteMatcher(["/orchestration/(.*)"]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const { pathname } = request.nextUrl;

  // Route landing page to voice chat (main entry point)
  if (pathname === "/") {
    return nextjsMiddlewareRedirect(request, "/voice-chat");
  }

  // Redirect legacy auth pages to the main entry point
  if (pathname === "/signin" || pathname === "/signup") {
    return nextjsMiddlewareRedirect(request, "/voice-chat");
  }

  // Protect admin-only routes
  if (isProtectedRoute(request)) {
    // Pre-auth onboarding gate:
    // Until the client submits name+email, we skip calling `isAuthenticated()`
    // to avoid OIDC discovery errors spamming logs and blocking the flow.
    const onboardingDone = request.cookies.get("cieden_onboarding_done")?.value === "1";
    if (!onboardingDone) {
      return;
    }

    let isAuthenticated = false;
    try {
      isAuthenticated = await convexAuth.isAuthenticated();
    } catch (e) {
      // Discovery can temporarily fail. Don't crash UI; just treat as unauthenticated.
      const code = (e as any)?.code;
      const isDiscoveryIssue = code === "AuthProviderDiscoveryFailed";

      // Silence the common discovery noise; it doesn't block UI due to our try/catch.
      if (process.env.NODE_ENV === "development" && !isDiscoveryIssue) {
        console.warn("Auth isAuthenticated() failed:", e);
      }
      isAuthenticated = false;
    }

    if (!isAuthenticated) {
      return nextjsMiddlewareRedirect(request, "/voice-chat");
    }
  }

  return;
});

export const config = {
  // Run middleware only where needed to avoid excessive discovery calls.
  // Include Convex Auth actions route so `signIn`/`signOut` can be proxied.
  matcher: ["/", "/signin", "/signup", "/orchestration/(.*)", "/api/auth", "/api/auth/(.*)"],
};
