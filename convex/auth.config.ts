export default {
  providers: [
    {
      // Convex Auth uses the OIDC issuer for JWT validation. We also provide
      // explicit endpoints to avoid runtime discovery (the Convex
      // `/.well-known/openid-configuration` is missing token/userinfo).
      domain:
        process.env.CONVEX_SITE_URL ||
        process.env.SITE_URL ||
        "http://localhost:3000",
      applicationID: "convex",
      authorization: {
        url:
          (process.env.CONVEX_SITE_URL ||
            process.env.SITE_URL ||
            "http://localhost:3000") + "/oauth/authorize",
      },
      token: {
        // Not used for our credentials providers directly, but required
        // by auth.js to avoid discovery-time failures.
        url:
          (process.env.CONVEX_SITE_URL ||
            process.env.SITE_URL ||
            "http://localhost:3000") + "/oauth/token",
      },
      userinfo: {
        // Not used for our credentials providers directly, but required
        // by auth.js to avoid discovery-time failures.
        url:
          (process.env.CONVEX_SITE_URL ||
            process.env.SITE_URL ||
            "http://localhost:3000") + "/oauth/userinfo",
      },
    },
  ],
};
