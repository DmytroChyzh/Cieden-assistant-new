# Basic Security Examples for Convex

Core patterns demonstrating essential security practices.

## Example 1: Secure User Data Query

This shows the fundamental pattern for securing queries with ownership verification.

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    // Step 1: Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Step 2: Fetch conversation
    const conversation = await ctx.db.get(args.conversationId);

    // Step 3: Verify ownership
    if (!conversation || conversation.userId !== identity.subject) {
      throw new Error("Conversation not found or not owned by user");
    }

    // Step 4: Fetch related messages with ownership guarantee
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation_and_time", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("asc")
      .collect();

    return {
      ...conversation,
      messages,
    };
  },
});
```

**Key Points**:
- Always authenticate first (`getUserIdentity()`)
- Fetch the parent resource (conversation)
- Verify ownership before returning child data (messages)
- Use indexes for performance

## Example 2: Complete Schema with Security Indexes

Database schema with proper indexes for authorization queries.

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Conversations - requires userId index for auth
  conversations: defineTable({
    userId: v.string(), // identity.subject OR anonymous identifier
    title: v.string(),
    lastMessageAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"]) // CRITICAL for auth queries
    .index("by_user_and_time", ["userId", "lastMessageAt"]), // Sorted queries

  // Messages - requires conversation and user indexes
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
    .index("by_user", ["userId"]),

  // Charts - requires ownership verification
  charts: defineTable({
    conversationId: v.id("conversations"),
    userId: v.string(),
    chartType: v.union(v.literal("pie"), v.literal("bar")),
    title: v.string(),
    data: v.array(v.object({
      label: v.string(),
      value: v.number(),
    })),
    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_user", ["userId"]),

  // Rate limiting (for advanced patterns)
  rateLimits: defineTable({
    identifier: v.string(), // IP or userId
    timestamp: v.number(),
  })
    .index("by_identifier_and_time", ["identifier", "timestamp"])
    .index("by_timestamp", ["timestamp"]),
});
```

**Key Points**:
- Index on `userId` for every user-owned table
- Compound indexes for sorted queries (`["userId", "createdAt"]`)
- Index on `timestamp` for cleanup operations
- Use specific types (avoid `v.any()` where possible)

## Testing Basic Patterns

### Test authenticated query
```typescript
// Should succeed for owned conversation
const result = await convex.query(api.conversations.get, {
  conversationId: myConversationId,
});

// Should throw for unowned conversation
try {
  await convex.query(api.conversations.get, {
    conversationId: otherUserConversationId,
  });
} catch (error) {
  console.log("Expected error:", error.message); // "Forbidden"
}
```

### Test ownership verification
```typescript
// Test that ownership check prevents unauthorized access
const identity = await ctx.auth.getUserIdentity();
const conversation = await ctx.db.get(conversationId);

// This should be true for owned resources
assert(conversation.userId === identity.subject);
```

## Common Mistakes to Avoid

### ❌ Missing ownership check
```typescript
// WRONG - Returns any user's messages!
export const list = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Missing: verify conversation ownership!
    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", q => q.eq("conversationId", args.conversationId))
      .collect();
  }
});
```

### ✅ Correct approach
```typescript
export const list = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Verify ownership first!
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== identity.subject) {
      throw new Error("Forbidden");
    }

    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", q => q.eq("conversationId", args.conversationId))
      .collect();
  }
});
```

## References

- [Convex Authentication](https://docs.convex.dev/auth)
- [Database Queries](https://docs.convex.dev/database/reading-data)
- [Schema Definition](https://docs.convex.dev/database/schemas)

For advanced patterns (CORS, rate limiting, webhooks), see [advanced-examples.md](advanced-examples.md).
