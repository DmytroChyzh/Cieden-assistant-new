# Complete Code Examples for Convex Security

## Example 1: Secure Widget HTTP Endpoint (Full Implementation)

This example shows a complete HTTP action with CORS validation, ownership verification, and error handling.

### convex/http.ts
```typescript
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

// Helper: Parse allowed origins from environment
function getAllowedOrigins(): string[] {
  const env = process.env.WIDGET_ALLOWED_ORIGINS;
  if (!env) return [];
  return env
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Helper: Extract origin from header
function originFromHeader(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

// Helper: Generate CORS headers
function corsHeaders(origin: string | null) {
  const allowed = getAllowedOrigins();
  const isDev = process.env.NODE_ENV !== "production";

  const allowOrigin = isDev
    ? "*"
    : (origin && allowed.includes(origin) ? origin : "");

  return {
    "Access-Control-Allow-Origin": allowOrigin || "",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
    "Content-Type": "application/json",
  };
}

// POST /widget/assistant - Send assistant message
http.route({
  path: "/widget/assistant",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Step 1: Extract and validate origin
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    const requestOrigin = originFromHeader(origin) || originFromHeader(referer);

    const allowed = getAllowedOrigins();
    const isDev = process.env.NODE_ENV !== "production";
    const isAllowed = isDev || (requestOrigin ? allowed.includes(requestOrigin) : false);

    if (!isAllowed) {
      return new Response(
        JSON.stringify({ error: "Origin not allowed" }),
        {
          status: 403,
          headers: corsHeaders(requestOrigin),
        }
      );
    }

    // Step 2: Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON" }),
        {
          status: 400,
          headers: corsHeaders(requestOrigin),
        }
      );
    }

    const { visitorId, conversationId, content, source, metadata } = body;

    if (!visitorId || !conversationId || !content) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: visitorId, conversationId, content" }),
        {
          status: 400,
          headers: corsHeaders(requestOrigin),
        }
      );
    }

    // Step 3: Call internal mutation with ownership verification
    try {
      await ctx.runMutation(internal.visitorInternal.appendAssistantMessage, {
        visitorId,
        conversationId,
        content,
        source: source || "text",
        metadata: metadata || {},
      });

      return new Response(
        JSON.stringify({ ok: true }),
        {
          status: 200,
          headers: corsHeaders(requestOrigin),
        }
      );
    } catch (error: any) {
      console.error("[HTTP] Failed to append assistant message:", error);

      // Don't leak internal error details
      const message = error.message === "forbidden"
        ? "Access denied"
        : "Internal server error";

      return new Response(
        JSON.stringify({ error: message }),
        {
          status: error.message === "forbidden" ? 403 : 500,
          headers: corsHeaders(requestOrigin),
        }
      );
    }
  }),
});

// OPTIONS /widget/assistant - Preflight request
http.route({
  path: "/widget/assistant",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }),
});

export default http;
```

### convex/internal/messages.ts
```typescript
import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const appendAssistantMessage = internalMutation({
  args: {
    conversationId: v.string(),
    visitorId: v.string(),
    content: v.string(),
    source: v.optional(v.union(
      v.literal("voice"),
      v.literal("text"),
      v.literal("webrtc"),
      v.literal("websocket"),
      v.literal("contextual")
    )),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, { conversationId, visitorId, content, source, metadata }) => {
    // Step 1: Normalize conversation ID
    const convId = ctx.db.normalizeId("conversations", conversationId);
    if (!convId) throw new Error("invalid_conversation");

    // Step 2: Fetch conversation
    const conv = await ctx.db.get(convId);

    // Step 3: Verify ownership
    if (!conv || conv.userId !== visitorId) {
      throw new Error("forbidden");
    }

    // Step 4: Insert message
    await ctx.db.insert("messages", {
      conversationId: convId,
      userId: visitorId,
      role: "assistant",
      content,
      source: source ?? "voice",
      createdAt: Date.now(),
    });

    // Step 5: Update conversation timestamp
    await ctx.db.patch(convId, { lastMessageAt: Date.now() });

    return { ok: true };
  },
});
```

## Example 2: Secure User Data Query

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

## Example 3: Secure Chart Creation (MCP Integration)

### app/api/mcp/route.ts
```typescript
import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api, internal } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    // Step 1: Authenticate request (example with API key)
    const apiKey = request.headers.get("x-api-key");
    if (apiKey !== process.env.MCP_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Parse request
    const body = await request.json();
    const { userId, conversationId, chartType, chartData } = body;

    // Step 3: Validate input
    if (!userId || !conversationId || !chartType || !chartData) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!["pie", "bar"].includes(chartType)) {
      return NextResponse.json(
        { error: "Invalid chart type" },
        { status: 400 }
      );
    }

    // Step 4: Call internal mutation
    const result = await convex.mutation(internal.mcp.createChart, {
      userId,
      conversationId,
      chartType,
      chartData,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[MCP] Chart creation failed:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
```

### convex/mcp.ts
```typescript
import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const createChart = internalMutation({
  args: {
    userId: v.string(),
    conversationId: v.string(), // String from HTTP, will normalize
    chartType: v.union(v.literal("pie"), v.literal("bar")),
    chartData: v.object({
      title: v.string(),
      data: v.array(v.object({
        label: v.string(),
        value: v.number(),
      })),
    }),
  },
  handler: async (ctx, { userId, conversationId, chartType, chartData }) => {
    // Step 1: Normalize conversation ID
    const convId = ctx.db.normalizeId("conversations", conversationId);
    if (!convId) throw new Error("invalid_conversation");

    // Step 2: Verify conversation ownership
    const conv = await ctx.db.get(convId);
    if (!conv || conv.userId !== userId) {
      throw new Error("forbidden");
    }

    // Step 3: Create chart
    const chartId = await ctx.db.insert("charts", {
      conversationId: convId,
      userId,
      chartType,
      title: chartData.title,
      data: chartData.data,
      createdAt: Date.now(),
    });

    // Step 4: Create message referencing chart
    await ctx.db.insert("messages", {
      conversationId: convId,
      userId,
      role: "assistant",
      content: `TOOL_CALL:create_${chartType}_chart:${JSON.stringify({ chartId })}`,
      source: "voice",
      createdAt: Date.now(),
    });

    // Step 5: Update conversation
    await ctx.db.patch(convId, { lastMessageAt: Date.now() });

    return { chartId };
  },
});
```

## Example 4: Rate-Limited Endpoint

### convex/rateLimiting.ts
```typescript
import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

// Simple fixed-window rate limiting
export const checkRateLimit = internalQuery({
  args: {
    identifier: v.string(), // IP or visitorId
    maxRequests: v.number(),
    windowMs: v.number(),
  },
  handler: async (ctx, { identifier, maxRequests, windowMs }) => {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Count requests in current window
    const requests = await ctx.db
      .query("rateLimits")
      .withIndex("by_identifier_and_time", (q) =>
        q.eq("identifier", identifier).gt("timestamp", windowStart)
      )
      .collect();

    const allowed = requests.length < maxRequests;

    return {
      allowed,
      remaining: Math.max(0, maxRequests - requests.length),
      resetAt: windowStart + windowMs,
    };
  },
});

export const recordRequest = internalMutation({
  args: {
    identifier: v.string(),
  },
  handler: async (ctx, { identifier }) => {
    await ctx.db.insert("rateLimits", {
      identifier,
      timestamp: Date.now(),
    });
  },
});

export const cleanupOldRecords = internalMutation({
  args: {},
  handler: async (ctx) => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    const oldRecords = await ctx.db
      .query("rateLimits")
      .withIndex("by_timestamp")
      .filter((q) => q.lt(q.field("timestamp"), oneHourAgo))
      .collect();

    for (const record of oldRecords) {
      await ctx.db.delete(record._id);
    }
  },
});
```

### HTTP endpoint with rate limiting
```typescript
http.route({
  path: "/widget/message",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");

    // Extract identifier (IP or visitorId from body)
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const body = await request.json();
    const identifier = body.visitorId || ip;

    // Check rate limit (10 req/min)
    const rateLimit = await ctx.runQuery(internal.rateLimiting.checkRateLimit, {
      identifier,
      maxRequests: 10,
      windowMs: 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          resetAt: rateLimit.resetAt,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders(origin),
            "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }

    // Record request
    await ctx.runMutation(internal.rateLimiting.recordRequest, { identifier });

    // Process request...
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: corsHeaders(origin),
    });
  }),
});
```

## Example 5: Webhook Handler with Signature Verification

```typescript
import crypto from "crypto";

// Helper: Verify webhook signature
function verifyWebhookSignature(
  signature: string | null,
  body: string,
  secret: string
): boolean {
  if (!signature) return false;

  const hash = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  // Convert signature from hex and ensure equal length before comparison
  const sigBuf = Buffer.from(signature ?? "", "hex");
  const hashBuf = Buffer.from(hash, "hex");

  if (sigBuf.length !== hashBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuf, hashBuf);
}

// Webhook endpoint
http.route({
  path: "/webhook/elevenlabs",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Step 1: Get body as text for signature verification
    const body = await request.text();

    // Step 2: Verify signature
    const signature = request.headers.get("x-elevenlabs-signature");
    const secret = process.env.ELEVENLABS_WEBHOOK_SECRET!;
    const isValid = verifyWebhookSignature(signature, body, secret);

    if (!isValid) {
      console.error("[Webhook] Invalid signature");
      return new Response("Invalid signature", { status: 401 });
    }

    // Step 3: Parse event
    let event;
    try {
      event = JSON.parse(body);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    // Step 4: Process event
    if (event.type === "conversation.message") {
      await ctx.runMutation(internal.streaming.processWebhookMessage, {
        sessionId: event.session_id,
        userId: event.user_id,
        message: event.message,
        timestamp: event.timestamp,
      });
    }

    return new Response("OK", { status: 200 });
  }),
});
```

## Example 6: Complete Schema with Security Indexes

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Conversations - requires userId index for auth
  conversations: defineTable({
    userId: v.string(), // identity.subject OR visitorId
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

  // Rate limiting
  rateLimits: defineTable({
    identifier: v.string(), // IP or visitorId
    timestamp: v.number(),
  })
    .index("by_identifier_and_time", ["identifier", "timestamp"])
    .index("by_timestamp", ["timestamp"]),
});
```

## Testing Examples

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

### Test CORS endpoint
```bash
# Valid origin - should succeed
curl -X POST http://localhost:3000/widget/assistant \
  -H "Origin: http://localhost:3000" \
  -H "Content-Type: application/json" \
  -d '{"visitorId":"test","conversationId":"test","content":"hello"}'

# Invalid origin - should fail (403)
curl -X POST https://api.example.com/widget/assistant \
  -H "Origin: https://evil.com" \
  -H "Content-Type: application/json" \
  -d '{"visitorId":"test","conversationId":"test","content":"hello"}'
```

### Test rate limiting
```bash
# Send 11 requests in 1 minute
for i in {1..11}; do
  curl -X POST http://localhost:3000/widget/message \
    -H "Content-Type: application/json" \
    -d '{"visitorId":"test","content":"msg'$i'"}'
done
# 11th request should return 429
```

## References

- [Convex Docs](https://docs.convex.dev)
- [Security Best Practices](https://docs.convex.dev/production/best-practices)
- Related patterns: `convex/messages.ts`, `convex/http.ts`, `convex/internal/*`
