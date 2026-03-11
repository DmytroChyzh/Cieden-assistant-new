And check what can be the potential issues.# Convex Security Patterns Skill

## Quick Reference

This skill provides critical security patterns for Convex backend development in FinPilot.

**When to use**: Any time you're working with Convex queries, mutations, HTTP endpoints, or MCP integrations that involve user data or authentication.

## Contents

### Main Skill File
- **[skill.md](skill.md)** - Overview with quick security checklist and common issues

### Reference Documentation
- **[auth-patterns.md](references/auth-patterns.md)** - Authentication patterns for users and visitors
- **[cors-patterns.md](references/cors-patterns.md)** - CORS validation for widget embedding
- **[internal-mutations.md](references/internal-mutations.md)** - When and how to use internal mutations
- **[code-examples.md](references/code-examples.md)** - Complete working examples

## Key Security Principles

1. **Always verify ownership** before returning user data
2. **Use environment-based CORS** (NO wildcards in production)
3. **Internal mutations still need ownership checks** (use visitorId for anonymous users)
4. **Rate limit public endpoints** to prevent abuse
5. **Validate all inputs** with explicit schemas (avoid `v.any()`)

## Quick Start

```typescript
// ✅ Authenticated user query
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Not authenticated");

const data = await ctx.db.get(resourceId);
if (!data || data.userId !== identity.subject) {
  throw new Error("Forbidden");
}

// ✅ Visitor internal mutation
const convId = ctx.db.normalizeId("conversations", conversationId);
const conv = await ctx.db.get(convId);
if (!conv || conv.userId !== visitorId) {
  throw new Error("forbidden");
}

// ✅ CORS validation
const allowed = getAllowedOrigins();
const isAllowed = isDev || (origin && allowed.includes(origin));
if (!isAllowed) {
  return new Response("Forbidden", { status: 403 });
}
```

## Common Mistakes to Avoid

- ❌ Returning data without ownership verification
- ❌ Using CORS wildcard (`*`) in production
- ❌ Trusting client-provided user IDs in internal mutations
- ❌ Using `ctx.auth` in internal mutations (always undefined)
- ❌ Silently returning empty arrays on auth failures
- ❌ Missing preflight OPTIONS handlers for CORS endpoints

## Usage

Invoke this skill when:
- Adding new Convex queries/mutations
- Creating HTTP endpoints for widget
- Implementing MCP tool integrations
- Reviewing code for security issues
- Fixing P0 security vulnerabilities

## Version

Created: January 2025
Based on: FinPilot widget security audit findings
