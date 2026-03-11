import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    conversationId: v.id("conversations"),
    type: v.union(v.literal("pie"), v.literal("bar"), v.literal("line")),
    title: v.string(),
    data: v.any(),
    config: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    return await ctx.db.insert("charts", {
      conversationId: args.conversationId,
      userId: identity.subject,
      type: args.type,
      title: args.title,
      data: args.data,
      config: args.config,
      createdAt: Date.now(),
    });
  },
});

export const list = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      // Return empty array instead of throwing error during sign out
      return [];
    }

    return await ctx.db
      .query("charts")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: {
    chartId: v.id("charts"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      // Return null instead of throwing error during sign out
      return null;
    }

    const chart = await ctx.db.get(args.chartId);
    if (!chart) {
      throw new Error("Chart not found");
    }

    // Verify user owns this chart
    if (chart.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    return chart;
  },
});