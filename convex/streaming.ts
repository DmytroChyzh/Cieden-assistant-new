import { v } from "convex/values";
import { mutation, query, httpAction } from "./_generated/server";
import { PersistentTextStreaming } from "@convex-dev/persistent-text-streaming";
import { components } from "./_generated/api";

// Initialize the streaming component
const persistentTextStreaming = new PersistentTextStreaming(
  components.persistentTextStreaming
);

// Create a new transcript stream
export const createTranscriptStream = mutation({
  args: { 
    conversationId: v.id("conversations"),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, { conversationId, userId }) => {
    // Create stream using the component
    const streamId = await persistentTextStreaming.createStream(ctx);
    
    // Store stream metadata in database
    await ctx.db.insert("streamingTranscripts", {
      conversationId,
      streamId,
      content: "",
      isComplete: false,
      userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    console.log('📝 Created transcript stream:', streamId);
    return streamId;
  },
});

// Get transcript stream content
export const getTranscriptStreamBody = query({
  args: { 
    streamId: v.string() 
  },
  handler: async (ctx, { streamId }) => {
    return await persistentTextStreaming.getStreamBody(ctx, streamId as any);
  },
});

// HTTP action for streaming transcript chunks
export const streamTranscript = httpAction(async (ctx, request) => {
  const { streamId, content, isFinal } = await request.json();
  
  if (!streamId || !content) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const appendTranscriptChunk = async (ctx: any, request: any, streamId: string, chunkAppender: (text: string) => Promise<void>) => {
    // Append the transcript content
    await chunkAppender(content);
    
    // Update database record
    const stream = await ctx.runQuery(internal.streaming.getStreamByStreamId, { streamId });
      
    if (stream) {
      await ctx.runMutation(internal.streaming.updateStreamContent, {
        streamId,
        content,
        isComplete: isFinal || false,
      });
      
      // If final, create message in conversations
      if (isFinal && content.trim()) {
        await ctx.runMutation(internal.streaming.createFinalMessage, {
          conversationId: stream.conversationId,
          userId: stream.userId || "",
          content: content.trim(),
        });
      }
    }
  };

  const response = await persistentTextStreaming.stream(
    ctx,
    request,
    streamId,
    appendTranscriptChunk
  );

  // Set CORS headers
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  response.headers.set("Vary", "Origin");
  
  return response;
});

// Internal mutations for HTTP action
import { internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

export const getStreamByStreamId = internalQuery({
  args: { streamId: v.string() },
  handler: async (ctx, { streamId }) => {
    return await ctx.db
      .query("streamingTranscripts")
      .withIndex("by_stream", (q) => q.eq("streamId", streamId))
      .first();
  },
});

export const updateStreamContent = internalMutation({
  args: {
    streamId: v.string(),
    content: v.string(),
    isComplete: v.boolean(),
  },
  handler: async (ctx, { streamId, content, isComplete }) => {
    const stream = await ctx.db
      .query("streamingTranscripts")
      .withIndex("by_stream", (q) => q.eq("streamId", streamId))
      .first();
    
    if (stream) {
      await ctx.db.patch(stream._id, {
        content,
        isComplete,
        updatedAt: Date.now(),
      });
    }
  },
});

export const createFinalMessage = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.string(),
    content: v.string(),
  },
  handler: async (ctx, { conversationId, userId, content }) => {
    await ctx.db.insert("messages", {
      conversationId,
      userId,
      role: "user",
      content,
      source: "voice",
      createdAt: Date.now(),
    });
  },
});

// Get active streams for a conversation
export const getActiveStreams = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, { conversationId }) => {
    return await ctx.db
      .query("streamingTranscripts")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .filter((q) => q.eq(q.field("isComplete"), false))
      .order("desc")
      .take(5);
  },
});

// Complete a transcript stream
export const completeTranscriptStream = mutation({
  args: { 
    streamId: v.string(),
    finalContent: v.optional(v.string()),
  },
  handler: async (ctx, { streamId, finalContent }) => {
    const stream = await ctx.db
      .query("streamingTranscripts")
      .withIndex("by_stream", (q) => q.eq("streamId", streamId))
      .first();
      
    if (stream && !stream.isComplete) {
      await ctx.db.patch(stream._id, {
        content: finalContent || stream.content,
        isComplete: true,
        updatedAt: Date.now(),
      });
      
      // Create final message if content exists
      if ((finalContent || stream.content).trim()) {
        await ctx.db.insert("messages", {
          conversationId: stream.conversationId,
          userId: stream.userId || "",
          role: "user",
          content: (finalContent || stream.content).trim(),
          source: "voice",
          createdAt: Date.now(),
        });
      }
      
      console.log('✅ Completed transcript stream:', streamId);
    }
    
    return stream?._id;
  },
});

// Legacy functions for backward compatibility
export const startStreamingTranscript = mutation({
  args: {
    conversationId: v.id("conversations"),
    streamId: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    return await ctx.db.insert("streamingTranscripts", {
      conversationId: args.conversationId,
      streamId: args.streamId,
      content: "",
      isComplete: false,
      userId: args.userId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateStreamingTranscript = mutation({
  args: {
    streamId: v.string(),
    content: v.string(),
    isComplete: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existingStream = await ctx.db
      .query("streamingTranscripts")
      .withIndex("by_stream", (q) => q.eq("streamId", args.streamId))
      .first();
    
    if (!existingStream) {
      throw new Error(`Stream ${args.streamId} not found`);
    }
    
    const now = Date.now();
    
    await ctx.db.patch(existingStream._id, {
      content: args.content,
      isComplete: args.isComplete ?? false,
      updatedAt: now,
    });
    
    // If transcript is complete, create final message
    if (args.isComplete && args.content.trim()) {
      await ctx.db.insert("messages", {
        conversationId: existingStream.conversationId,
        userId: existingStream.userId || "",
        role: "user",
        content: args.content.trim(),
        source: "voice",
        createdAt: Date.now(),
      });
    }
    
    return existingStream._id;
  },
});

export const finalizeTranscript = internalMutation({
  args: {
    streamId: v.string(),
    conversationId: v.id("conversations"),
    content: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Create final message in conversations
    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      userId: args.userId || "",
      role: "user",
      content: args.content,
      source: "voice",
      createdAt: Date.now(),
    });
    
    // Mark stream as complete
    const stream = await ctx.db
      .query("streamingTranscripts")
      .withIndex("by_stream", (q) => q.eq("streamId", args.streamId))
      .first();
    
    if (stream) {
      await ctx.db.patch(stream._id, {
        content: `[FINALIZED] ${args.content}`,
        isComplete: true,
        updatedAt: Date.now(),
      });
    }
  },
});

export const getStreamingTranscripts = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("streamingTranscripts")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .filter((q) => q.eq(q.field("isComplete"), false))
      .order("desc")
      .take(10);
  },
});

export const getStreamingTranscript = query({
  args: {
    streamId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("streamingTranscripts")
      .withIndex("by_stream", (q) => q.eq("streamId", args.streamId))
      .first();
  },
});

export const cleanupOldStreams = mutation({
  args: {
    olderThanMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - (args.olderThanMs ?? 24 * 60 * 60 * 1000);
    
    // Clean up both completed streams and old incomplete streams (abandoned)
    const oldCompletedStreams = await ctx.db
      .query("streamingTranscripts")
      .filter((q) => q.lt(q.field("updatedAt"), cutoff))
      .filter((q) => q.eq(q.field("isComplete"), true))
      .take(50);
    
    const oldIncompleteStreams = await ctx.db
      .query("streamingTranscripts")
      .filter((q) => q.lt(q.field("updatedAt"), cutoff))
      .filter((q) => q.eq(q.field("isComplete"), false))
      .take(50);
    
    let deletedCount = 0;
    
    // Delete completed streams
    for (const stream of oldCompletedStreams) {
      await ctx.db.delete(stream._id);
      deletedCount++;
    }
    
    // Delete abandoned incomplete streams
    for (const stream of oldIncompleteStreams) {
      await ctx.db.delete(stream._id);
      deletedCount++;
    }
    
    return { deleted: deletedCount };
  },
});

export const handleStreamError = mutation({
  args: {
    streamId: v.string(),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const stream = await ctx.db
      .query("streamingTranscripts")
      .withIndex("by_stream", (q) => q.eq("streamId", args.streamId))
      .first();
    
    if (stream) {
      await ctx.db.patch(stream._id, {
        content: `[ERROR] ${args.error} - Partial: ${stream.content}`,
        isComplete: true,
        updatedAt: Date.now(),
      });
    }
  },
});