import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get user preferences
export const get = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const preferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    // Return defaults if no preferences exist
    if (!preferences) {
      return {
        lendingViewMode: "compact" as const,
        theme: "system" as const,
        language: "en",
      };
    }

    return {
      lendingViewMode: preferences.lendingViewMode || "compact",
      theme: preferences.theme || "system",
      language: preferences.language || "en",
    };
  },
});

// Update user preferences
export const update = mutation({
  args: {
    userId: v.string(),
    lendingViewMode: v.optional(v.union(v.literal("compact"), v.literal("full"))),
    theme: v.optional(v.union(v.literal("light"), v.literal("dark"), v.literal("system"))),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, ...updates } = args;
    
    // Check if preferences exist
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing preferences
      await ctx.db.patch(existing._id, {
        ...updates,
        updatedAt: now,
      });
    } else {
      // Create new preferences
      await ctx.db.insert("userPreferences", {
        userId,
        ...updates,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

// Update specific preference
export const updateLendingViewMode = mutation({
  args: {
    userId: v.string(),
    mode: v.union(v.literal("compact"), v.literal("full")),
  },
  handler: async (ctx, args) => {
    const { userId, mode } = args;
    
    // Check if preferences exist
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing preferences
      await ctx.db.patch(existing._id, {
        lendingViewMode: mode,
        updatedAt: now,
      });
    } else {
      // Create new preferences
      await ctx.db.insert("userPreferences", {
        userId,
        lendingViewMode: mode,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});