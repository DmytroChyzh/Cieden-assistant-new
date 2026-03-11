# Internal Mutations for System Operations

## Overview

**Internal mutations** bypass Convex authentication but **still require ownership verification**. Use them for:
- MCP tool integrations (server-to-server)
- HTTP action handlers (CORS-validated endpoints)
- Webhook handlers (third-party services)
- Background jobs and scheduled tasks

## When to Use Internal Mutations

### ✅ Use Internal Mutations For:
1. **MCP Integrations** - Server-side tool execution bypassing client auth
2. **HTTP Actions** - Public endpoints with custom authentication (CORS, API keys)
3. **Webhooks** - Third-party service callbacks (Stripe, ElevenLabs, etc.)
4. **System Operations** - Automated tasks, cleanup jobs, migrations

### ❌ Don't Use Internal Mutations For:
1. **Client-facing queries/mutations** - Use regular queries/mutations with `ctx.auth`
2. **User-initiated actions** - Prefer authenticated mutations
3. **Direct database access** - Use when you need to bypass auth for a reason

## Pattern 1: Internal Mutation with Visitor Ownership

**Use for widget endpoints** where visitorId acts as identity:

```typescript
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const sendMessage = internalMutation({
  args: {
    visitorId: v.string(),
    conversationId: v.string(),
    content: v.string(),
  },
  handler: async (ctx, { visitorId, conversationId, content }) => {
    // Step 1: Normalize ID (string to Id<"conversations">)
    const convId = ctx.db.normalizeId("conversations", conversationId);
    if (!convId) throw new Error("invalid_conversation");

    // Step 2: Fetch resource
    const conv = await ctx.db.get(convId);

    // Step 3: CRITICAL - Verify ownership
    if (!conv || conv.userId !== visitorId) {
      throw new Error("forbidden");
    }

    // Step 4: Perform operation
    await ctx.db.insert("messages", {
      conversationId: convId,
      userId: visitorId,
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

**Key Points**:
- `visitorId` parameter replaces `identity.subject`
- Always verify `conv.userId === visitorId`
- Use `normalizeId` to convert string to Id type

## Pattern 2: Internal Mutation Called from HTTP Action

**HTTP endpoint** calling internal mutation:

```typescript
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/widget/assistant",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Step 1: Validate CORS (see cors-patterns.md)
    const origin = request.headers.get("origin");
    const isAllowed = validateOrigin(origin);
    if (!isAllowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: corsHeaders(origin),
      });
    }

    // Step 2: Parse and validate input
    const body = await request.json();
    const { visitorId, conversationId, content } = body;

    if (!visitorId || !conversationId || !content) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    // Step 3: Call internal mutation with ownership parameters
    try {
      await ctx.runMutation(internal.visitorInternal.sendMessage, {
        visitorId,
        conversationId,
        content,
      });

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: corsHeaders(origin),
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: corsHeaders(origin) }
      );
    }
  }),
});

export default http;
```

## Pattern 3: Internal Mutation for MCP Tools

**MCP tool handler** calling internal mutation:

```typescript
// convex/mcp.ts
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const createChart = internalMutation({
  args: {
    userId: v.string(),
    conversationId: v.id("conversations"),
    chartType: v.union(v.literal("pie"), v.literal("bar")),
    chartData: v.any(),
  },
  handler: async (ctx, { userId, conversationId, chartType, chartData }) => {
    // Step 1: Verify conversation ownership
    const conv = await ctx.db.get(conversationId);
    if (!conv || conv.userId !== userId) {
      throw new Error("forbidden");
    }

    // Step 2: Create chart
    const chartId = await ctx.db.insert("charts", {
      conversationId,
      userId,
      chartType,
      data: chartData,
      createdAt: Date.now(),
    });

    // Step 3: Create message referencing chart
    await ctx.db.insert("messages", {
      conversationId,
      userId,
      role: "assistant",
      content: `TOOL_CALL:create_${chartType}_chart:${JSON.stringify({ chartId })}`,
      source: "voice",
      createdAt: Date.now(),
    });

    return { chartId };
  },
});
```

**MCP endpoint calling it**:

```typescript
// app/api/mcp/route.ts
export async function POST(request: Request) {
  const { userId, conversationId, chartType, chartData } = await request.json();

  // Call internal mutation
  const result = await convexClient.mutation(internal.mcp.createChart, {
    userId,
    conversationId,
    chartType,
    chartData,
  });

  return Response.json(result);
}
```

## Pattern 4: Webhook Handler with Internal Mutation

**ElevenLabs webhook** handler:

```typescript
// convex/http.ts
http.route({
  path: "/webhook/elevenlabs",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Step 1: Verify webhook signature
    const signature = request.headers.get("x-elevenlabs-signature");
    const body = await request.text();
    const isValid = verifyWebhookSignature(signature, body);

    if (!isValid) {
      return new Response("Invalid signature", { status: 401 });
    }

    // Step 2: Parse webhook payload
    const event = JSON.parse(body);

    // Step 3: Call internal mutation to process event
    if (event.type === "conversation.message") {
      await ctx.runMutation(internal.streaming.processWebhookMessage, {
        sessionId: event.session_id,
        message: event.message,
        timestamp: event.timestamp,
      });
    }

    return new Response("OK", { status: 200 });
  }),
});
```

**Internal mutation for webhook processing**:

```typescript
export const processWebhookMessage = internalMutation({
  args: {
    sessionId: v.string(),
    message: v.string(),
    timestamp: v.number(),
  },
  handler: async (ctx, { sessionId, message, timestamp }) => {
    // Find session (no auth context available)
    const session = await ctx.db
      .query("voiceSessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", sessionId))
      .first();

    if (!session) {
      throw new Error("Session not found");
    }

    // Store transcript
    await ctx.db.insert("streamingTranscripts", {
      sessionId,
      userId: session.userId, // From session, not auth
      message,
      timestamp,
      createdAt: Date.now(),
    });
  },
});
```

## Pattern 5: Background Job with Internal Mutation

**Scheduled cleanup job**:

```typescript
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "cleanup old sessions",
  { hours: 24 }, // Run daily
  internal.jobs.cleanupOldSessions
);

export default crons;
```

**Internal mutation for cleanup**:

```typescript
// convex/jobs.ts
export const cleanupOldSessions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    // Find old sessions (no user context needed)
    const oldSessions = await ctx.db
      .query("voiceSessions")
      .withIndex("by_created_at")
      .filter((q) => q.lt(q.field("createdAt"), thirtyDaysAgo))
      .collect();

    // Delete them
    for (const session of oldSessions) {
      await ctx.db.delete(session._id);
    }

    console.log(`Cleaned up ${oldSessions.length} old sessions`);
  },
});
```

## Common Internal Mutation Issues

### ❌ Issue 1: No Ownership Verification
```typescript
// VULNERABLE - Anyone can call this via MCP/HTTP and modify any data!
export const updateData = internalMutation({
  args: { dataId: v.id("data"), value: v.string() },
  handler: async (ctx, { dataId, value }) => {
    await ctx.db.patch(dataId, { value }); // No ownership check!
  },
});
```

### ✅ Fixed
```typescript
export const updateData = internalMutation({
  args: {
    userId: v.string(), // Required for ownership
    dataId: v.id("data"),
    value: v.string()
  },
  handler: async (ctx, { userId, dataId, value }) => {
    const data = await ctx.db.get(dataId);
    if (!data || data.userId !== userId) {
      throw new Error("forbidden");
    }
    await ctx.db.patch(dataId, { value });
  },
});
```

### ❌ Issue 2: Using ctx.auth in Internal Mutations
```typescript
// WRONG - ctx.auth is undefined in internal mutations!
export const getData = internalMutation({
  args: { dataId: v.id("data") },
  handler: async (ctx, { dataId }) => {
    const identity = await ctx.auth.getUserIdentity(); // Always undefined!
    // ...
  },
});
```

### ✅ Fixed
```typescript
// Pass userId as parameter instead
export const getData = internalMutation({
  args: {
    userId: v.string(),
    dataId: v.id("data")
  },
  handler: async (ctx, { userId, dataId }) => {
    const data = await ctx.db.get(dataId);
    if (!data || data.userId !== userId) {
      throw new Error("forbidden");
    }
    return data;
  },
});
```

### ❌ Issue 3: Trusting Client-Provided IDs
```typescript
// RISKY - Client could send any userId
export const clientCalledInternal = internalMutation({
  args: {
    userId: v.string(), // Client-provided, could be forged!
    data: v.string()
  },
  handler: async (ctx, { userId, data }) => {
    // Dangerous if called directly from client
    await ctx.db.insert("data", { userId, data });
  },
});
```

### ✅ Fixed - Call from Authenticated Endpoint
```typescript
// HTTP action with auth before calling internal mutation
http.route({
  path: "/api/data",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Step 1: Authenticate request (API key, session, etc.)
    const apiKey = request.headers.get("x-api-key");
    const userId = await validateApiKey(apiKey);
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Step 2: Parse body
    const { data } = await request.json();

    // Step 3: Call internal mutation with verified userId
    await ctx.runMutation(internal.data.createData, {
      userId, // Now verified by API key
      data,
    });

    return new Response("OK");
  }),
});
```

### ❌ Issue 4: Missing Input Validation
```typescript
// RISKY - No validation on internal mutation parameters
export const processData = internalMutation({
  args: {
    userId: v.string(),
    data: v.any() // Too permissive!
  },
  handler: async (ctx, { userId, data }) => {
    await ctx.db.insert("data", { userId, ...data }); // Dangerous spread!
  },
});
```

### ✅ Fixed
```typescript
export const processData = internalMutation({
  args: {
    userId: v.string(),
    // Explicit schema
    data: v.object({
      title: v.string(),
      amount: v.number(),
      category: v.string(),
    })
  },
  handler: async (ctx, { userId, data }) => {
    // Validate ranges
    if (data.amount < 0) {
      throw new Error("Amount must be positive");
    }

    await ctx.db.insert("data", {
      userId,
      title: data.title,
      amount: data.amount,
      category: data.category,
      createdAt: Date.now(),
    });
  },
});
```

## Security Checklist for Internal Mutations

- [ ] Ownership verification (userId/visitorId matches resource owner)
- [ ] Input validation (use explicit v.object schemas, not v.any)
- [ ] Called only from authenticated contexts (HTTP with auth, MCP with verification)
- [ ] Error handling (don't leak sensitive info in error messages)
- [ ] Rate limiting on public HTTP endpoints calling internal mutations
- [ ] Logging for debugging (but don't log sensitive data)
- [ ] No ctx.auth usage (will always be undefined)

## Testing Internal Mutations

```typescript
// Test from authenticated HTTP action
const response = await fetch("http://localhost:3000/api/data", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": "test-key"
  },
  body: JSON.stringify({ data: { title: "Test", amount: 100 } })
});

// Should succeed if API key is valid
// Should fail if API key is invalid
// Should fail if trying to access other user's data
```

## References

- [Convex Internal Functions](https://docs.convex.dev/functions/internal-functions)
- [HTTP Actions](https://docs.convex.dev/functions/http-actions)
- [Scheduled Functions](https://docs.convex.dev/scheduling/cron-jobs)
- Related patterns: `convex/http.ts`, `convex/internal/*`, `convex/mcp.ts`
