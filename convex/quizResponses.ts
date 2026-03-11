import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Save/update quiz response
export const upsert = mutation({
  args: {
    quizId: v.id("quizzes"),
    conversationId: v.id("conversations"),
    userId: v.string(),
    questionId: v.string(),
    selectedValue: v.string(),
    followUpValue: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    // Check if response already exists for this question
    const existingResponse = await ctx.db
      .query("quizResponses")
      .withIndex("by_quiz", (q) => q.eq("quizId", args.quizId))
      .filter((q) => q.eq(q.field("questionId"), args.questionId))
      .first();

    if (existingResponse) {
      // Update existing response
      return await ctx.db.patch(existingResponse._id, {
        selectedValue: args.selectedValue,
        followUpValue: args.followUpValue,
        timestamp: Date.now()
      });
    } else {
      // Create new response
      return await ctx.db.insert("quizResponses", {
        ...args,
        timestamp: Date.now()
      });
    }
  }
});

// Get all responses for a quiz
export const getByQuiz = query({
  args: {
    quizId: v.id("quizzes")
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("quizResponses")
      .withIndex("by_quiz", (q) => q.eq("quizId", args.quizId))
      .collect();
  }
});

// Get responses for a conversation (all quizzes in that conversation)
export const getByConversation = query({
  args: {
    conversationId: v.id("conversations")
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("quizResponses")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();
  }
});