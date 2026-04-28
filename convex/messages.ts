import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {
    conversationId: v.id("conversations"),
    guestId: v.optional(v.string()),
    estimateThreadId: v.optional(v.string()),
    includeEstimateThread: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      // Guest mode: allow listing if conversation belongs to guestId.
      if (!args.guestId) return [];
      const conversation = await ctx.db.get(args.conversationId);
      if (!conversation || conversation.userId !== args.guestId) return [];
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation_and_time", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("asc")
      .collect();

    const includeEstimateThread = args.includeEstimateThread === true;
    if (args.estimateThreadId) {
      return messages.filter((message) => {
        const metadata = (message.metadata ?? {}) as Record<string, unknown>;
        return (
          metadata.threadType === "estimate" &&
          metadata.estimateThreadId === args.estimateThreadId
        );
      });
    }

    if (!includeEstimateThread) {
      return messages.filter((message) => {
        const metadata = (message.metadata ?? {}) as Record<string, unknown>;
        return metadata.threadType !== "estimate";
      });
    }

    return messages;
  },
});

export const create = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    source: v.union(v.literal("voice"), v.literal("text"), v.literal("contextual")),
    metadata: v.optional(v.any()),
    guestId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    let userId: string;

    if (!identity) {
      // Guest mode: persist if conversation belongs to this guest.
      if (!args.guestId) return null;
      const conversation = await ctx.db.get(args.conversationId);
      if (!conversation || conversation.userId !== args.guestId) return null;
      userId = args.guestId;
    } else {
      userId = identity.subject;
    }

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      userId,
      guestId: args.guestId,
      role: args.role,
      content: args.content,
      source: args.source,
      metadata: args.metadata,
      createdAt: Date.now(),
    });

    // Update conversation last message time
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: Date.now(),
    });

    return messageId;
  },
});

export const send = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    source: v.union(v.literal("voice"), v.literal("text"), v.literal("contextual")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      userId: identity.subject,
      role: "user",
      content: args.content,
      source: args.source,
      createdAt: Date.now(),
    });

    // Update conversation last message time
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: Date.now(),
    });

    return messageId;
  },
});

export const clearForConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      // If the user is not authenticated (e.g. just signed out), simply
      // skip clearing instead of throwing an error to the UI.
      return { deleted: 0, reason: "not_authenticated" as const };
    }

    // Ensure conversation belongs to user
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== identity.subject) {
      throw new Error("Conversation not found or not owned by user");
    }

    // Batch delete to avoid Convex per-function read limits.
    const batchLimit = Math.max(1, Math.min(500, Math.floor(args.limit ?? 200)));
    const toDelete = await ctx.db
      .query("messages")
      .withIndex("by_conversation_and_time", (q) => q.eq("conversationId", args.conversationId))
      .order("asc")
      .take(batchLimit);

    // Delete in a small loop (only <= batchLimit reads).
    let deleted = 0;
    for (const msg of toDelete) {
      await ctx.db.delete(msg._id);
      deleted += 1;
    }

    // Update conversation timestamp
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: Date.now(),
    });

    return { deleted, reason: "ok" as const };
  },
});