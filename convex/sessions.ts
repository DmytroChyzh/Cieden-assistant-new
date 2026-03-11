import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createSession = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.string(),
    sessionId: v.string(),
    mode: v.union(v.literal("text"), v.literal("voice")),
    connectionType: v.union(v.literal("websocket"), v.literal("webrtc")),
  },
  handler: async (ctx, args) => {
    // End any existing active sessions for this conversation
    const activeSessions = await ctx.db
      .query("chatSessions")
      .withIndex("by_conversation", q => q.eq("conversationId", args.conversationId))
      .filter(q => q.eq(q.field("status"), "active"))
      .collect();

    for (const session of activeSessions) {
      await ctx.db.patch(session._id, {
        status: "ended",
        endedAt: Date.now(),
      });
    }

    // Create new session
    const sessionDoc = await ctx.db.insert("chatSessions", {
      conversationId: args.conversationId,
      userId: args.userId,
      sessionId: args.sessionId,
      mode: args.mode,
      connectionType: args.connectionType,
      status: "active",
      startedAt: Date.now(),
    });

    return sessionDoc;
  },
});

export const endSession = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("chatSessions")
      .withIndex("by_session", q => q.eq("sessionId", args.sessionId))
      .first();

    if (!session) {
      throw new Error(`Session ${args.sessionId} not found`);
    }

    await ctx.db.patch(session._id, {
      status: "ended",
      endedAt: Date.now(),
    });

    return { success: true };
  },
});

export const transitionSession = mutation({
  args: {
    oldSessionId: v.string(),
    newSessionId: v.string(),
    newMode: v.union(v.literal("text"), v.literal("voice")),
    newConnectionType: v.union(v.literal("websocket"), v.literal("webrtc")),
  },
  handler: async (ctx, args) => {
    // Mark old session as transitioning
    const oldSession = await ctx.db
      .query("chatSessions")
      .withIndex("by_session", q => q.eq("sessionId", args.oldSessionId))
      .first();

    if (!oldSession) {
      throw new Error(`Session ${args.oldSessionId} not found`);
    }

    await ctx.db.patch(oldSession._id, {
      status: "transitioning",
    });

    // Create new session
    const newSession = await ctx.db.insert("chatSessions", {
      conversationId: oldSession.conversationId,
      userId: oldSession.userId,
      sessionId: args.newSessionId,
      mode: args.newMode,
      connectionType: args.newConnectionType,
      status: "active",
      startedAt: Date.now(),
    });

    // End old session
    await ctx.db.patch(oldSession._id, {
      status: "ended",
      endedAt: Date.now(),
    });

    return newSession;
  },
});

export const getActiveSession = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const activeSession = await ctx.db
      .query("chatSessions")
      .withIndex("by_conversation", q => q.eq("conversationId", args.conversationId))
      .filter(q => q.eq(q.field("status"), "active"))
      .first();

    return activeSession;
  },
});

export const getSessionsByConversation = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("chatSessions")
      .withIndex("by_conversation", q => q.eq("conversationId", args.conversationId))
      .collect();

    return sessions;
  },
});

export const enforceSessionLimit = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find all active sessions for this user across all conversations
    const activeSessions = await ctx.db
      .query("chatSessions")
      .withIndex("by_user", q => q.eq("userId", args.userId))
      .filter(q => q.eq(q.field("status"), "active"))
      .collect();

    // If more than one session is active, end all but the most recent
    if (activeSessions.length > 1) {
      const sortedSessions = activeSessions.sort((a, b) => b.startedAt - a.startedAt);
      const sessionsToEnd = sortedSessions.slice(1);

      for (const session of sessionsToEnd) {
        await ctx.db.patch(session._id, {
          status: "ended",
          endedAt: Date.now(),
        });
      }

      return {
        enforced: true,
        endedCount: sessionsToEnd.length,
      };
    }

    return {
      enforced: false,
      endedCount: 0,
    };
  },
});