import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  
  conversations: defineTable({
    userId: v.string(),
    title: v.string(),
    lastMessageAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_last_message", ["lastMessageAt"]),
  
  messages: defineTable({
    conversationId: v.id("conversations"),
    userId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    source: v.union(v.literal("voice"), v.literal("text"), v.literal("contextual"), v.literal("websocket"), v.literal("webrtc")),
    sessionId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_and_time", ["conversationId", "createdAt"])
    .index("by_session", ["sessionId"]),
  
  charts: defineTable({
    conversationId: v.id("conversations"),
    userId: v.string(),
    type: v.union(v.literal("pie"), v.literal("bar"), v.literal("line")),
    title: v.string(),
    data: v.any(),
    config: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_user", ["userId"])
    .index("by_created", ["createdAt"]),
  
  voiceSessions: defineTable({
    userId: v.string(),
    conversationId: v.id("conversations"),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    duration: v.optional(v.number()),
    transcript: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_conversation", ["conversationId"]),
  
  streamingTranscripts: defineTable({
    conversationId: v.id("conversations"),
    streamId: v.string(),
    content: v.string(),
    isComplete: v.boolean(),
    userId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_stream", ["streamId"])
    .index("by_complete", ["isComplete"]),
  
  savingsGoals: defineTable({
    userId: v.string(),
    goalName: v.string(),
    goalAmount: v.number(),
    currentSavings: v.number(),
    deadline: v.optional(v.string()),
    monthlyTarget: v.optional(v.number()),
    currency: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_created", ["createdAt"]),

  savingsHistory: defineTable({
    userId: v.string(),
    goalId: v.id("savingsGoals"),
    month: v.string(),  // "2024-01" format
    amount: v.number(),
    percentChange: v.number(),
    createdAt: v.number(),
  })
    .index("by_goal", ["goalId"])
    .index("by_user_month", ["userId", "month"])
    .index("by_goal_month", ["goalId", "month"]),

  savingsInsights: defineTable({
    userId: v.string(),
    goalId: v.id("savingsGoals"),
    type: v.union(v.literal("tip"), v.literal("trend"), v.literal("milestone")),
    content: v.string(),
    priority: v.number(),  // 1-5 for sorting
    createdAt: v.number(),
  })
    .index("by_goal", ["goalId"])
    .index("by_user_type", ["userId", "type"]),

  documents: defineTable({
    userId: v.string(),
    documentType: v.string(),
    documentId: v.string(),
    fullName: v.string(),
    dateOfBirth: v.string(),
    expirationDate: v.string(),
    issuingState: v.optional(v.string()),
    address: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    restrictions: v.optional(v.string()),
    endorsements: v.optional(v.string()),
    isDefault: v.optional(v.boolean()), // Mark the primary document
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_document_id", ["documentId"])
    .index("by_user_default", ["userId", "isDefault"]),

  quizzes: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    questions: v.any(), // Flexible for MVP; tighten later as needed
    conversationId: v.id("conversations"),
    userId: v.string(),
    isActive: v.boolean(),
    createdAt: v.number()
  })
    .index("by_conversation", ["conversationId"])
    .index("by_user", ["userId"])
    .index("by_active", ["isActive"]),
  
  quizResponses: defineTable({
    quizId: v.id("quizzes"),
    conversationId: v.id("conversations"),
    userId: v.string(),
    questionId: v.string(),
    selectedValue: v.string(),
    followUpValue: v.optional(v.string()),
    timestamp: v.number()
  })
    .index("by_quiz", ["quizId"]) 
    .index("by_conversation", ["conversationId"])
    .index("by_user", ["userId"]),

  userPreferences: defineTable({
    userId: v.string(),
    lendingViewMode: v.optional(v.union(v.literal("compact"), v.literal("full"))),
    theme: v.optional(v.union(v.literal("light"), v.literal("dark"), v.literal("system"))),
    language: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]),

  chatSessions: defineTable({
    conversationId: v.id("conversations"),
    userId: v.string(),
    sessionId: v.string(),
    mode: v.union(v.literal("text"), v.literal("voice")),
    connectionType: v.union(v.literal("websocket"), v.literal("webrtc")),
    status: v.union(v.literal("active"), v.literal("ended"), v.literal("transitioning")),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    metadata: v.optional(v.any()),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"])
    .index("by_status", ["status"]),

  sessionContext: defineTable({
    sessionId: v.string(),
    conversationId: v.id("conversations"),
    userId: v.string(),
    context: v.string(),
    summary: v.optional(v.string()),
    messageCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_conversation", ["conversationId"])
    .index("by_user", ["userId"]),
});