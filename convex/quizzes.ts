import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new quiz
export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    questions: v.any(),
    conversationId: v.id("conversations"),
    userId: v.string()
  },
  handler: async (ctx, args) => {
    // Deactivate any existing active quiz for this conversation
    const existingQuiz = await ctx.db
      .query("quizzes")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (existingQuiz) {
      await ctx.db.patch(existingQuiz._id, { isActive: false });
    }

    return await ctx.db.insert("quizzes", {
      ...args,
      isActive: true,
      createdAt: Date.now()
    });
  }
});

// Get active quiz for a conversation
export const getActive = query({
  args: {
    conversationId: v.id("conversations")
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("quizzes")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
  }
});

// Complete/deactivate a quiz
export const complete = mutation({
  args: {
    quizId: v.id("quizzes")
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.quizId, { 
      isActive: false 
    });
  }
});

// Get quiz by ID
export const getById = query({
  args: {
    quizId: v.id("quizzes")
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.quizId);
  }
});