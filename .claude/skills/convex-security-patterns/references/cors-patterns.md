# CORS Patterns for Widget Security

## Overview

Embeddable widgets and cross-origin applications require **environment-based origin validation** to prevent unauthorized embedding. This document covers CORS implementation patterns for Convex HTTP actions.

## Pattern 1: CORS Validation Helpers

**Reusable helpers** (example from `convex/lib/cors.ts`):

```typescript
/**
 * Parse allowed origins from environment variable
 * Format: Comma or space-separated list
 * Example: "https://app.example.com,https://widget.example.com"
 */
function getAllowedOrigins(): string[] {
  const env = process.env.WIDGET_ALLOWED_ORIGINS;
  if (!env) return [];
  return env
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Extract origin from referer or origin header
 * Returns: "https://example.com" (protocol + host)
 */
function originFromHeader(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

/**
 * Generate CORS headers based on environment
 * Dev: Allow all origins (*)
 * Prod: Validate against allowlist
 */
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
    "Vary": "Origin", // Cache CORS responses correctly
  };
}
```

## Pattern 2: HTTP Action with CORS

**Complete example** for Convex HTTP endpoint:

```typescript
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/widget/assistant",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Step 1: Extract origin from headers
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    const requestOrigin = originFromHeader(origin) || originFromHeader(referer);

    // Step 2: Validate origin
    const allowed = getAllowedOrigins();
    const isDev = process.env.NODE_ENV !== "production";
    const isAllowed = isDev || (requestOrigin ? allowed.includes(requestOrigin) : false);

    if (!isAllowed) {
      return new Response(
        JSON.stringify({ error: "Origin not allowed" }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders(requestOrigin),
          },
        }
      );
    }

    // Step 3: Parse request body
    const body = await request.json();
    const { visitorId, conversationId, content } = body;

    // Step 4: Call internal mutation
    await ctx.runMutation(internal.visitorInternal.appendAssistantMessage, {
      visitorId,
      conversationId,
      content,
      source: "text",
    });

    // Step 5: Return success with CORS headers
    return new Response(
      JSON.stringify({ ok: true }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders(requestOrigin),
        },
      }
    );
  }),
});

// Handle preflight OPTIONS requests
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

## Pattern 3: Next.js Page with Origin Validation

**Server-side origin check** in Next.js page:

```typescript
// app/embed/widget/page.tsx
import { headers } from "next/headers";

function parseAllowedOrigins(envValue: string | undefined): string[] {
  if (!envValue) return [];
  return envValue
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function originFromHeader(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`;
  } catch (_) {
    return null;
  }
}

export default function WidgetPage() {
  const hdrs = headers();
  const referer = hdrs.get("referer");
  const origin = hdrs.get("origin");
  const requestOrigin = originFromHeader(origin) || originFromHeader(referer);

  const allowed = parseAllowedOrigins(process.env.WIDGET_ALLOWED_ORIGINS);
  const isDev = process.env.NODE_ENV !== "production";
  const isAllowed = isDev || (requestOrigin ? allowed.includes(requestOrigin) : false);

  if (!isAllowed) {
    return (
      <div style={{ padding: 16 }}>
        <h1>Embedding blocked</h1>
        <p>This origin is not allowed to embed this widget.</p>
      </div>
    );
  }

  return <WidgetApp />;
}
```

## Pattern 4: Environment Configuration

**`.env.local`** (development):
```bash
# Development - allow localhost
WIDGET_ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001"
NODE_ENV="development"
```

**Production environment variables**:
```bash
# Production - strict allowlist
WIDGET_ALLOWED_ORIGINS="https://app.example.com,https://widget.example.com,https://demo.example.com"
NODE_ENV="production"
```

**Multiple origins format**:
- Comma-separated: `"https://a.com,https://b.com"`
- Space-separated: `"https://a.com https://b.com"`
- Mixed: `"https://a.com, https://b.com https://c.com"`

## Pattern 5: Client-Side CORS Request

**Widget JavaScript** making CORS request:

```javascript
// public/finpilot-widget.js
async function sendMessage(visitorId, conversationId, content) {
  try {
    const response = await fetch('https://api.example.com/widget/assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'omit', // Don't send cookies
      body: JSON.stringify({
        visitorId,
        conversationId,
        content,
      }),
    });

    if (!response.ok) {
      console.error('Request failed:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('CORS error or network issue:', error);
    return null;
  }
}
```

## Common CORS Issues

### ❌ Issue 1: Wildcard in Production
```typescript
// VULNERABLE - Allows any website to embed widget!
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*", // BAD in production!
  };
}
```

### ✅ Fixed
```typescript
function corsHeaders(origin: string | null) {
  const allowed = getAllowedOrigins();
  const isDev = process.env.NODE_ENV !== "production";

  const allowOrigin = isDev
    ? "*"
    : (origin && allowed.includes(origin) ? origin : "");

  return {
    "Access-Control-Allow-Origin": allowOrigin || "",
  };
}
```

### ❌ Issue 2: Missing Preflight Handler
```typescript
// INCOMPLETE - OPTIONS requests will fail!
http.route({
  path: "/api/endpoint",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // ... only handles POST
  }),
});
```

### ✅ Fixed
```typescript
// Add OPTIONS handler for preflight
http.route({
  path: "/api/endpoint",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("origin");
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }),
});

http.route({
  path: "/api/endpoint",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // ... actual handler
  }),
});
```

### ❌ Issue 3: Forgetting Vary Header
```typescript
// PROBLEMATIC - Breaks CDN caching
function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin || "",
    // Missing Vary header!
  };
}
```

### ✅ Fixed
```typescript
function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin || "",
    "Vary": "Origin", // Tell CDN to cache separately per origin
  };
}
```

### ❌ Issue 4: Not Handling Missing Origin
```typescript
// PROBLEMATIC - Crashes on null origin
function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : "",
    // TypeError if origin is null!
  };
}
```

### ✅ Fixed
```typescript
function corsHeaders(origin: string | null) {
  const allowOrigin = origin && allowed.includes(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowOrigin || "",
  };
}
```

## Edge Cases

### Case 1: Localhost with Port
```typescript
// Allowed origins must include port for localhost
WIDGET_ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001"

// These will NOT match:
// - http://localhost (no port)
// - http://localhost:5173 (different port)
```

### Case 2: Subdomain Wildcards Not Supported
```typescript
// This will NOT work (Convex doesn't support regex):
WIDGET_ALLOWED_ORIGINS="https://*.example.com"

// You must list each subdomain explicitly:
WIDGET_ALLOWED_ORIGINS="https://app.example.com,https://demo.example.com"
```

### Case 3: iframe Without Origin Header
```typescript
// Some browsers don't send Origin header for iframe requests
// Use referer as fallback:
const origin = request.headers.get("origin");
const referer = request.headers.get("referer");
const requestOrigin = originFromHeader(origin) || originFromHeader(referer);
```

### Case 4: Direct API Calls (Not from Browser)
```typescript
// cURL, Postman, etc. don't send Origin header
// Allow in dev, block in prod (unless explicitly added to allowlist)
const isDev = process.env.NODE_ENV !== "production";
const isAllowed = isDev || (requestOrigin ? allowed.includes(requestOrigin) : false);
```

## Testing CORS

### Test 1: Valid Origin (Should Succeed)
```bash
curl -X POST https://api.example.com/widget/assistant \
  -H "Origin: https://app.example.com" \
  -H "Content-Type: application/json" \
  -d '{"visitorId":"test","conversationId":"test","content":"hello"}'

# Expected: 200 OK with Access-Control-Allow-Origin: https://app.example.com
```

### Test 2: Invalid Origin (Should Fail)
```bash
curl -X POST https://api.example.com/widget/assistant \
  -H "Origin: https://evil.com" \
  -H "Content-Type: application/json" \
  -d '{"visitorId":"test","conversationId":"test","content":"hello"}'

# Expected: 403 Forbidden with Access-Control-Allow-Origin: ""
```

### Test 3: Preflight Request
```bash
curl -X OPTIONS https://api.example.com/widget/assistant \
  -H "Origin: https://app.example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"

# Expected: 204 No Content with CORS headers
```

### Test 4: Development Mode
```bash
# Set NODE_ENV=development
curl -X POST http://localhost:3000/api/widget/assistant \
  -H "Origin: https://random-site.com" \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected: 200 OK (dev mode allows all origins)
```

## Security Checklist

- [ ] WIDGET_ALLOWED_ORIGINS environment variable configured
- [ ] Wildcard (`*`) ONLY used in development
- [ ] Production uses explicit origin allowlist
- [ ] Both POST and OPTIONS handlers implemented
- [ ] Vary: Origin header included
- [ ] Referer fallback for iframe requests
- [ ] 403 status for unauthorized origins
- [ ] CORS headers on all responses (including errors)

## References

- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Convex HTTP Actions](https://docs.convex.dev/functions/http-actions)
- Related patterns: `convex/http.ts`, `convex/lib/*` for CORS helpers
