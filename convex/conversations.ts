import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    return await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    guestId: v.optional(v.string()),
    guestEmail: v.optional(v.string()),
    guestName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;
    const isAuthed = !!identity;

    if (isAuthed) {
      return await ctx.db.insert("conversations", {
        userId: userId!,
        title: args.title,
        lastMessageAt: Date.now(),
        createdAt: Date.now(),
      });
    }

    // Guest mode: persist conversation even if Convex Auth is unavailable.
    if (!args.guestId) {
      throw new Error("Not authenticated (missing guestId)");
    }

    return await ctx.db.insert("conversations", {
      userId: args.guestId,
      guestId: args.guestId,
      guestEmail: args.guestEmail,
      guestName: args.guestName,
      title: args.title,
      lastMessageAt: Date.now(),
      createdAt: Date.now(),
    });
  },
});