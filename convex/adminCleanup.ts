import { mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

const startOfTodayMs = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

// Dev/test helper:
// Deletes chat/estimate-related data for all users, keeping only records from "today".
// This does NOT touch auth tables.
export const cleanupOldTestData = mutation({
  args: {
    // If omitted, uses local "today" start timestamp.
    keepFromMs: v.optional(v.number()),
    batchConversations: v.optional(v.number()),
    batchMessages: v.optional(v.number()),
    batchOther: v.optional(v.number()),
    maxRounds: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const keepFrom = args.keepFromMs ?? startOfTodayMs();
    const batchConversations = Math.max(1, args.batchConversations ?? 5);
    const batchMessages = Math.max(1, args.batchMessages ?? 100);
    const batchOther = Math.max(1, args.batchOther ?? 100);
    const maxRounds = Math.max(1, args.maxRounds ?? 200);

    let totalConversations = 0;
    let totalDeletedMessages = 0;
    let totalDeletedOther = 0;

    const deleteByConversation = async (conversationId: Id<"conversations">) => {
      // messages
      while (true) {
        const msgs = await ctx.db
          .query("messages")
          .withIndex("by_conversation_and_time", (q) =>
            q.eq("conversationId", conversationId)
          )
          .order("asc")
          .take(batchMessages);
        if (msgs.length === 0) break;

        for (const m of msgs) {
          await ctx.db.delete(m._id);
          totalDeletedMessages++;
        }
      }

      // chatSessions
      while (true) {
        const rows = await ctx.db
          .query("chatSessions")
          .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
          .take(batchOther);
        if (rows.length === 0) break;
        for (const r of rows) {
          await ctx.db.delete(r._id);
          totalDeletedOther++;
        }
      }

      // sessionContext
      while (true) {
        const rows = await ctx.db
          .query("sessionContext")
          .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
          .take(batchOther);
        if (rows.length === 0) break;
        for (const r of rows) {
          await ctx.db.delete(r._id);
          totalDeletedOther++;
        }
      }

      // charts
      while (true) {
        const rows = await ctx.db
          .query("charts")
          .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
          .take(batchOther);
        if (rows.length === 0) break;
        for (const r of rows) {
          await ctx.db.delete(r._id);
          totalDeletedOther++;
        }
      }

      // voiceSessions
      while (true) {
        const rows = await ctx.db
          .query("voiceSessions")
          .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
          .take(batchOther);
        if (rows.length === 0) break;
        for (const r of rows) {
          await ctx.db.delete(r._id);
          totalDeletedOther++;
        }
      }

      // streamingTranscripts
      while (true) {
        const rows = await ctx.db
          .query("streamingTranscripts")
          .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
          .take(batchOther);
        if (rows.length === 0) break;
        for (const r of rows) {
          await ctx.db.delete(r._id);
          totalDeletedOther++;
        }
      }

      // quizResponses
      while (true) {
        const resp = await ctx.db
          .query("quizResponses")
          .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
          .take(batchOther);
        if (resp.length === 0) break;
        for (const r of resp) {
          await ctx.db.delete(r._id);
          totalDeletedOther++;
        }
      }

      // quizzes
      while (true) {
        const quizzes = await ctx.db
          .query("quizzes")
          .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
          .take(batchOther);
        if (quizzes.length === 0) break;
        for (const qz of quizzes) {
          await ctx.db.delete(qz._id);
          totalDeletedOther++;
        }
      }

      // Finally delete the conversation row itself
      await ctx.db.delete(conversationId);
    };

    // delete old conversations and their data
    for (let round = 0; round < maxRounds; round++) {
      const oldConversations = await ctx.db
        .query("conversations")
        .withIndex("by_last_message", (q) => q.lt("lastMessageAt", keepFrom))
        .order("asc")
        .take(batchConversations);

      if (oldConversations.length === 0) break;

      for (const conv of oldConversations) {
        await deleteByConversation(conv._id);
        totalConversations++;
      }
    }

    return {
      keepFrom,
      deletedConversations: totalConversations,
      deletedMessages: totalDeletedMessages,
      deletedOther: totalDeletedOther,
    };
  },
});

