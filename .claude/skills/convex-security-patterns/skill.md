---
name: convex-security-patterns
description: This skill should be used when implementing Convex queries/mutations, HTTP endpoints, or reviewing code for security issues. Provides security best practices including authentication, authorization, CORS validation, and internal functions.
---

# Convex Security Patterns

## When to Use This Skill

This skill provides patterns for:
- Implementing Convex queries or mutations that access user data
- Adding HTTP endpoints or webhook handlers
- Working with internal functions for system operations
- Implementing CORS for cross-origin requests
- Reviewing Convex code for security vulnerabilities

**Recommended library**: [convex-helpers](https://www.npmjs.com/package/convex-helpers) provides production-ready `corsRouter` and other security utilities.

## Core Security Principle

**Backend-first security**: Authorization must happen within your Convex backend before entering higher trust contexts. Never rely on client-side checks alone.

## 1. Authentication & Authorization

### Pattern: Verify Ownership Before Data Access

**Critical**: Always verify the authenticated user owns the resource before returning data.

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getResource = query({
  args: { resourceId: v.id("resources") },
  handler: async (ctx, args) => {
    // Step 1: Authenticate
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Step 2: Fetch resource
    const resource = await ctx.db.get(args.resourceId);

    // Step 3: Authorize (verify ownership)
    if (!resource || resource.userId !== identity.subject) {
      throw new Error("Forbidden");
    }

    // Step 4: Return data
    return resource;
  }
});
```

**Key pattern**: `resource.userId === identity.subject`

### Common Vulnerability: Missing Parent Ownership Check

When querying related data, verify ownership of the PARENT resource first:

```typescript
// ❌ VULNERABLE - Returns child records for ANY parent ID
export const listChildren = query({
  args: { parentId: v.id("parents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Missing: Verify user owns the parent!
    return await ctx.db
      .query("children")
      .withIndex("by_parent", q => q.eq("parentId", args.parentId))
      .collect();
  }
});
```

**Fix**: Add parent ownership verification:

```typescript
// ✅ SECURE - Verifies parent ownership first
export const listChildren = query({
  args: { parentId: v.id("parents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Verify parent ownership
    const parent = await ctx.db.get(args.parentId);
    if (!parent || parent.userId !== identity.subject) {
      throw new Error("Forbidden");
    }

    // Now safe to return children
    return await ctx.db
      .query("children")
      .withIndex("by_parent", q => q.eq("parentId", args.parentId))
      .collect();
  }
});
```

### Silent Failures for UX

**When acceptable**: Return empty state during sign-out for graceful UX degradation.

```typescript
export const list = query({
  args: { parentId: v.id("parents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return []; // Graceful: user signing out

    const parent = await ctx.db.get(args.parentId);
    if (!parent || parent.userId !== identity.subject) {
      throw new Error("Forbidden"); // Security: wrong user accessing data
    }

    return await ctx.db.query("children")...
  }
});
```

**Distinction**:
- Unauthenticated (no session) → Return `[]` for UX
- Unauthorized (wrong user) → Throw error for security

**⚠️ Important Note**: `getUserIdentity()` may return `null` briefly on initial page load even for authenticated users due to timing. Handle this gracefully in UI queries by returning empty state, but always verify ownership before returning actual data once identity is available.

## 2. Internal Functions Security

Internal functions bypass authentication but **must still verify ownership**.

```typescript
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const systemOperation = internalMutation({
  args: {
    userId: v.string(),
    resourceId: v.string(),
    data: v.string()
  },
  handler: async (ctx, { userId, resourceId, data }) => {
    // Normalize ID if needed
    const id = ctx.db.normalizeId("resources", resourceId);
    if (!id) throw new Error("invalid_id");

    // Verify ownership even in internal function
    const resource = await ctx.db.get(id);
    if (!resource || resource.userId !== userId) {
      throw new Error("forbidden");
    }

    // Safe to proceed
    await ctx.db.patch(id, { data });
  }
});
```

**Use cases**: HTTP actions, webhooks, MCP integrations, scheduled functions.

**Key point**: `internalMutation` and `internalQuery` have no `ctx.auth` context, so accept `userId` as parameter and verify ownership manually.

## 3. CORS Validation

### Recommended: Use convex-helpers corsRouter

**Production-ready approach** with automatic preflight handling:

```typescript
import { httpRouter } from "convex/server";
import { corsRouter } from "convex-helpers/server/cors";
import { httpAction } from "./_generated/server";

const http = httpRouter();

// Wrap router with CORS configuration
const cors = corsRouter(http, {
  allowedOrigins: ["https://app.example.com", "https://widget.example.com"],
  // Enforce strict origin validation (403 for unauthorized origins)
  enforceAllowOrigins: true,
  allowCredentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
});

// Routes automatically get CORS headers + OPTIONS handling
cors.route({
  path: "/api/data",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // CORS already validated by corsRouter
    return new Response(JSON.stringify({ ok: true }));
  })
});

export default cors;
```

**Install**: `npm install convex-helpers`

**Benefits**:
- Automatic OPTIONS preflight handling
- Built-in origin validation with 403 responses
- Configurable headers and credentials
- Production-tested and maintained

### Alternative: Manual CORS Implementation

For custom requirements or educational purposes:

<details>
<summary>Click to expand manual implementation</summary>

```typescript
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

function getAllowedOrigins(): string[] {
  const env = process.env.ALLOWED_ORIGINS;
  if (!env) return [];
  return env.split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
}

function corsHeaders(origin: string | null) {
  const allowed = getAllowedOrigins();
  const isDev = process.env.NODE_ENV !== "production";

  const allowOrigin = isDev
    ? "*"
    : (origin && allowed.includes(origin) ? origin : "");

  return {
    "Access-Control-Allow-Origin": allowOrigin || "",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
    "Vary": "Origin",
  };
}

const http = httpRouter();

http.route({
  path: "/api/data",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");

    // Validate origin
    const allowed = getAllowedOrigins();
    const isDev = process.env.NODE_ENV !== "production";
    if (!isDev && (!origin || !allowed.includes(origin))) {
      return new Response("Forbidden", {
        status: 403,
        headers: corsHeaders(origin)
      });
    }

    // Process request...
    return new Response(JSON.stringify({ ok: true }), {
      headers: corsHeaders(origin)
    });
  })
});

// Handle preflight
http.route({
  path: "/api/data",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin)
    });
  })
});
```

</details>

### When Wildcards Are Acceptable

- ✅ Authenticated internal tools (MCP with API key)
- ✅ Development environments
- ✅ Server-to-server endpoints
- ❌ Public endpoints that issue tokens or access user data

## 4. API Key Authentication

For server-to-server endpoints (webhooks, MCP integrations), validate API keys before processing requests. Store keys in environment variables, rotate periodically, and use constant-time comparison to prevent timing attacks. Internal mutations called via API key endpoints must still verify resource ownership.

**See**: [advanced-examples.md](references/advanced-examples.md) - Example 5: Webhook Handler with Signature Verification

## 5. Rate Limiting

Protect public endpoints with token bucket rate limiting using per-IP or per-user identifiers. Check limits before processing requests, record each request, and use scheduled cleanup to prevent unbounded table growth. Return 429 status when limits are exceeded.

**See**: [advanced-examples.md](references/advanced-examples.md) - Example 4: Rate-Limited Endpoint

## 6. Database Schema for Security

Always index fields used for authorization:

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  resources: defineTable({
    userId: v.string(), // From identity.subject
    data: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"]) // Critical for auth queries
    .index("by_user_and_time", ["userId", "createdAt"]), // For sorted queries

  children: defineTable({
    parentId: v.id("resources"),
    userId: v.string(),
    data: v.string(),
  })
    .index("by_parent", ["parentId"])
    .index("by_user", ["userId"]),
});
```

## Quick Security Checklist

Before deploying:

- [ ] All queries verify parent resource ownership before returning child data
- [ ] All mutations verify `identity.subject === resource.userId`
- [ ] Internal functions verify ownership using userId parameter
- [ ] CORS uses environment allowlist for public endpoints
- [ ] Rate limiting on public HTTP endpoints
- [ ] Database indexes on userId and parentId fields
- [ ] No secrets in client-accessible code

## Common Security Issues

### ❌ Issue 1: No Ownership Check
```typescript
// VULNERABLE
export const get = query({
  args: { id: v.id("data") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id); // Returns ANY user's data!
  }
});
```

### ✅ Fixed
```typescript
export const get = query({
  args: { id: v.id("data") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const data = await ctx.db.get(args.id);
    if (!data || data.userId !== identity.subject) {
      throw new Error("Forbidden");
    }
    return data;
  }
});
```

### ❌ Issue 2: Trusting Client userId
```typescript
// VULNERABLE in internal mutation
export const update = internalMutation({
  args: { userId: v.string(), data: v.string() },
  handler: async (ctx, { userId, data }) => {
    // Trusts userId from caller without verification!
    await ctx.db.insert("data", { userId, data });
  }
});
```

### ✅ Fixed
```typescript
export const update = internalMutation({
  args: {
    userId: v.string(),
    resourceId: v.id("resources"),
    data: v.string()
  },
  handler: async (ctx, { userId, resourceId, data }) => {
    // Verify ownership
    const resource = await ctx.db.get(resourceId);
    if (!resource || resource.userId !== userId) {
      throw new Error("forbidden");
    }
    await ctx.db.patch(resourceId, { data });
  }
});
```

## Alternative Pattern: Row Level Security

For apps with complex authorization rules, consider Row Level Security (RLS) to automatically enforce access control on every document read.

**Using convex-helpers RLS**:

```typescript
import { RowLevelSecurity } from "convex-helpers/server/rowLevelSecurity";
import { query } from "./_generated/server";
import { v } from "convex/values";
import type { DataModel } from "./_generated/dataModel";

// Define RLS rules
const rls = new RowLevelSecurity<DataModel>({
  resources: async (ctx, resource) => {
    const identity = await ctx.auth.getUserIdentity();
    return identity && resource.userId === identity.subject;
  },
  children: async (ctx, child) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    // Check parent ownership
    const parent = await ctx.db.get(child.parentId);
    return parent?.userId === identity.subject;
  },
});

// Queries automatically enforce RLS
export const getResource = query({
  args: { id: v.id("resources") },
  handler: rls.query(async (ctx, args) => {
    // No manual ownership check needed - RLS handles it
    return await ctx.db.get(args.id);
  })
});
```

**Benefits**:
- Centralized authorization logic (no repetition)
- Automatic enforcement (can't forget checks)
- Easier to audit and test

**Trade-offs**:
- Additional library dependency
- Slight performance overhead
- May need custom rules for complex cases

**Learn more**: [Row Level Security Guide](https://stack.convex.dev/row-level-security)

## Bundled Resources

Detailed patterns with complete examples:

- **[auth-patterns.md](references/auth-patterns.md)** - Authentication and authorization patterns
- **[cors-patterns.md](references/cors-patterns.md)** - CORS validation and edge cases
- **[internal-mutations.md](references/internal-mutations.md)** - Internal function security
- **[basic-examples.md](references/basic-examples.md)** - Core security patterns (queries, schema)
- **[advanced-examples.md](references/advanced-examples.md)** - Production patterns (CORS, rate limiting, webhooks)

## References

- [Convex Authentication](https://docs.convex.dev/auth)
- [Authorization Best Practices](https://stack.convex.dev/authorization)
- [Internal Functions](https://docs.convex.dev/functions/internal-functions)
- [HTTP Actions](https://docs.convex.dev/functions/http-actions)
- [Row Level Security](https://stack.convex.dev/row-level-security)
- [convex-helpers Package](https://www.npmjs.com/package/convex-helpers)
