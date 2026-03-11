import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const saveContext = mutation({
  args: {
    sessionId: v.string(),
    conversationId: v.id("conversations"),
    userId: v.string(),
    context: v.string(),
    summary: v.optional(v.string()),
    messageCount: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if context already exists for this session
    const existing = await ctx.db
      .query("sessionContext")
      .withIndex("by_session", q => q.eq("sessionId", args.sessionId))
      .first();

    if (existing) {
      // Update existing context
      await ctx.db.patch(existing._id, {
        context: args.context,
        summary: args.summary,
        messageCount: args.messageCount,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    // Create new context
    const contextDoc = await ctx.db.insert("sessionContext", {
      sessionId: args.sessionId,
      conversationId: args.conversationId,
      userId: args.userId,
      context: args.context,
      summary: args.summary,
      messageCount: args.messageCount,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return contextDoc;
  },
});

export const getContext = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const context = await ctx.db
      .query("sessionContext")
      .withIndex("by_session", q => q.eq("sessionId", args.sessionId))
      .first();

    return context;
  },
});

export const getLatestContext = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const contexts = await ctx.db
      .query("sessionContext")
      .withIndex("by_conversation", q => q.eq("conversationId", args.conversationId))
      .collect();

    if (contexts.length === 0) {
      return null;
    }

    // Return the most recently updated context
    const latestContext = contexts.reduce((latest, current) =>
      current.updatedAt > latest.updatedAt ? current : latest
    );

    return latestContext;
  },
});

export const mergeContexts = mutation({
  args: {
    sessionIds: v.array(v.string()),
    newSessionId: v.string(),
    conversationId: v.id("conversations"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const contexts = await Promise.all(
      args.sessionIds.map(async (sessionId) => {
        const context = await ctx.db
          .query("sessionContext")
          .withIndex("by_session", q => q.eq("sessionId", sessionId))
          .first();
        return context;
      })
    );

    const validContexts = contexts.filter(c => c !== null);

    if (validContexts.length === 0) {
      return null;
    }

    // Merge all contexts into one
    const mergedContext = validContexts
      .map(c => c!.context)
      .join("\n---\n");

    const totalMessages = validContexts.reduce(
      (sum, c) => sum + (c!.messageCount || 0),
      0
    );

    // Create new merged context
    const mergedDoc = await ctx.db.insert("sessionContext", {
      sessionId: args.newSessionId,
      conversationId: args.conversationId,
      userId: args.userId,
      context: mergedContext,
      summary: `Merged context from ${validContexts.length} sessions`,
      messageCount: totalMessages,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return mergedDoc;
  },
});

export const cleanupOldContexts = mutation({
  args: {
    olderThanMs: v.number(),
  },
  handler: async (ctx, args) => {
    const cutoffTime = Date.now() - args.olderThanMs;

    const oldContexts = await ctx.db
      .query("sessionContext")
      .filter(q => q.lt(q.field("updatedAt"), cutoffTime))
      .collect();

    let deletedCount = 0;
    for (const context of oldContexts) {
      await ctx.db.delete(context._id);
      deletedCount++;
    }

    return { deleted: deletedCount };
  },
});

export const getConversationContext = query({
  args: {
    conversationId: v.id("conversations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get recent messages for context
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", q => q.eq("conversationId", args.conversationId))
      .order("desc")
      .take(args.limit || 20);

    // Get latest session context if available
    const latestContext = await ctx.db
      .query("sessionContext")
      .withIndex("by_conversation", q => q.eq("conversationId", args.conversationId))
      .order("desc")
      .first();

    return {
      messages: messages.reverse(),
      sessionContext: latestContext,
    };
  },
});