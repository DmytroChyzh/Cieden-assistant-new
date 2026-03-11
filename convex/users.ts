import { query } from "./_generated/server";

/**
 * Get the current authenticated user's information
 * Returns null if not authenticated
 */
export const getCurrentUser = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    return {
      id: identity.subject,
      email: identity.email,
      name: identity.name,
    };
  },
});
