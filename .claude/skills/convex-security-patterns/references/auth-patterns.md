# Authentication Patterns for Convex

## Overview

Convex applications typically use **@convex-dev/auth** or similar authentication libraries. Common authentication models:

1. **Authenticated users** - Standard auth with `ctx.auth.getUserIdentity()`
2. **Anonymous users** - Widgets/embeds with anonymous identifiers (no login required)

This document covers both patterns.

## Pattern 1: Authenticated User Queries

Use for main app endpoints where users must be logged in.

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

export const listConversations = query({
  args: {},
  handler: async (ctx) => {
    // Step 1: Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Step 2: Query with ownership filter
    return await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();
  },
});
```

**Key Points**:
- `identity.subject` is the unique user ID from auth system
- ALWAYS use indexed queries for performance (`withIndex`)
- Throw errors for unauthorized access (don't return empty arrays silently)

## Pattern 2: Authenticated User Mutations

Use for operations that modify user data.

```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const updateConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    // Step 1: Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Step 2: Fetch resource
    const conversation = await ctx.db.get(args.conversationId);

    // Step 3: Verify ownership
    if (!conversation || conversation.userId !== identity.subject) {
      throw new Error("Conversation not found or not owned by user");
    }

    // Step 4: Perform mutation
    await ctx.db.patch(args.conversationId, {
      title: args.title,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
```

**Security Checklist**:
- ✅ Authentication check (`getUserIdentity`)
- ✅ Resource existence check (`db.get`)
- ✅ Ownership verification (`userId === identity.subject`)
- ✅ Error on unauthorized access (don't silently fail)

## Pattern 3: Visitor (Anonymous) Internal Mutations

Use for widget endpoints where visitors don't have user accounts.

```typescript
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const visitorSendMessage = internalMutation({
  args: {
    visitorId: v.string(),
    conversationId: v.string(),
    content: v.string(),
  },
  handler: async (ctx, { visitorId, conversationId, content }) => {
    // Step 1: Normalize ID (visitorId is string, not Id<"conversations">)
    const convId = ctx.db.normalizeId("conversations", conversationId);
    if (!convId) throw new Error("invalid_conversation");

    // Step 2: Fetch resource
    const conv = await ctx.db.get(convId);

    // Step 3: Verify visitor ownership
    if (!conv || conv.userId !== visitorId) {
      throw new Error("forbidden");
    }

    // Step 4: Perform operation
    await ctx.db.insert("messages", {
      conversationId: convId,
      userId: visitorId, // Store visitorId as userId
      role: "user",
      content,
      source: "text",
      createdAt: Date.now(),
    });

    // Step 5: Update conversation timestamp
    await ctx.db.patch(convId, { lastMessageAt: Date.now() });

    return { ok: true };
  },
});
```

**Key Differences from User Auth**:
- Uses `internalMutation` (no auth context)
- `visitorId` is passed as parameter (generated client-side)
- Still verifies ownership: `conv.userId === visitorId`
- Requires `normalizeId` since visitorId is string

## Pattern 4: Optional Authentication

Use when endpoint can be called by both authenticated users and visitors.

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getPublicData = query({
  args: {
    resourceId: v.id("resources"),
  },
  handler: async (ctx, args) => {
    // Optional auth
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;

    const resource = await ctx.db.get(args.resourceId);
    if (!resource) {
      throw new Error("Resource not found");
    }

    // Return different data based on auth status
    if (userId === resource.userId) {
      // Owner sees full data
      return resource;
    } else {
      // Public sees limited data
      return {
        id: resource._id,
        title: resource.title,
        publicField: resource.publicField,
      };
    }
  },
});
```

## Pattern 5: Database Indexes for Auth

**REQUIRED** for performance on auth-based queries.

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  conversations: defineTable({
    userId: v.string(), // Auth identity.subject OR visitorId
    title: v.string(),
    lastMessageAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"]) // CRITICAL for auth queries
    .index("by_user_and_time", ["userId", "lastMessageAt"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    userId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    source: v.union(
      v.literal("voice"),
      v.literal("text"),
      v.literal("contextual")
    ),
    createdAt: v.number(),
  })
    .index("by_conversation_and_time", ["conversationId", "createdAt"])
    .index("by_user", ["userId"]), // For user-wide queries
});
```

**Index Best Practices**:
- Always index on `userId` for auth queries
- Compound indexes for sorted auth queries: `["userId", "createdAt"]`
- Test queries in Convex dashboard to verify index usage

## Common Auth Issues

### ❌ Issue 1: Missing Authentication Check
```typescript
// VULNERABLE - Anyone can access any conversation!
export const getConversation = query({
  args: { id: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  }
});
```

### ✅ Fixed
```typescript
export const getConversation = query({
  args: { id: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const conv = await ctx.db.get(args.id);
    if (!conv || conv.userId !== identity.subject) {
      throw new Error("Forbidden");
    }
    return conv;
  }
});
```

### ❌ Issue 2: Silently Returning Empty Arrays
```typescript
// BAD - Hides security issues
export const getUserData = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return []; // Silent failure!

    return await ctx.db
      .query("data")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  }
});
```

### ✅ Fixed
```typescript
export const getUserData = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated"); // Explicit error
    }

    return await ctx.db
      .query("data")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  }
});
```

### ❌ Issue 3: Using Internal Mutations Without Ownership Checks
```typescript
// VULNERABLE - Internal mutation trusts all input!
export const systemUpdate = internalMutation({
  args: { conversationId: v.string(), content: v.string() },
  handler: async (ctx, args) => {
    const convId = ctx.db.normalizeId("conversations", args.conversationId);
    // Missing ownership check - any caller can modify any conversation!
    await ctx.db.patch(convId, { content: args.content });
  }
});
```

### ✅ Fixed
```typescript
export const systemUpdate = internalMutation({
  args: {
    conversationId: v.string(),
    visitorId: v.string(), // Required for verification
    content: v.string()
  },
  handler: async (ctx, args) => {
    const convId = ctx.db.normalizeId("conversations", args.conversationId);
    if (!convId) throw new Error("invalid_conversation");

    const conv = await ctx.db.get(convId);
    if (!conv || conv.userId !== args.visitorId) {
      throw new Error("forbidden"); // Ownership verification
    }

    await ctx.db.patch(convId, { content: args.content });
  }
});
```

## Testing Auth Patterns

```typescript
// Test authenticated user query
const result = await ctx.runQuery(api.conversations.get, {
  conversationId: "test-id"
});
// Should throw if not authenticated or not owned by user

// Test visitor internal mutation
await ctx.runMutation(internal.visitor.sendMessage, {
  visitorId: "visitor-123",
  conversationId: "conv-abc",
  content: "Hello"
});
// Should throw if visitorId doesn't own conversation
```

## References

- [Convex Authentication](https://docs.convex.dev/auth)
- [@convex-dev/auth](https://labs.convex.dev/auth)
- [Reading Data with Auth](https://docs.convex.dev/database/reading-data#access-control)
- Related patterns: `convex/messages.ts`, `convex/internal/*`
