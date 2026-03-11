# Fixing Common Issues

## Sign in failed: internalServerError

**Why:** Convex Auth uses `CONVEX_SITE_URL` from the **Convex deployment** (not from `.env.local`). If this variable is missing in Convex, sign-in can return "internalServerError".

**What to do:**

1. Open [Convex Dashboard](https://dashboard.convex.dev) → your project → **Settings** → **Environment Variables**.
2. Add a variable:
   - **Name:** `CONVEX_SITE_URL`
   - **Value (local dev):** `http://localhost:3000`  
   - **Value (production):** your app URL, e.g. `https://your-app.vercel.app`
3. Save. Convex will redeploy. If you use `npx convex dev`, restart it so it picks up the change.
4. Try signing in again (use a **new** browser tab or clear the site data for localhost if needed).

If it still fails, check **Convex Dashboard → Logs** when you click "Sign in" and look for the real error message.

---

## Chatbot won't start / EPERM (.next\trace) / white screen

**Why:** The error `EPERM: operation not permitted, open '.next\trace'` appears when **two or more dev servers are running at the same time**. For example, `npm run dev` is already running in one terminal (on port 3000), and you start `npm run dev` again in another. Both try to write to the same `.next\trace` file — Windows blocks the second process.

**What to do (simplest — Windows):**

1. Run **only one** dev server with this command (stops all Node processes and starts a single server):
   ```bash
   npm run dev:single
   ```
   Open **http://localhost:3000** in your browser.

2. If you don't use `dev:single`: **close all terminals** where `npm run dev` was running, then in **one** new terminal:
   ```bash
   npm run dev:fresh
   ```

3. If EPERM persists: stop Node manually (PowerShell):
   ```powershell
   Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
   ```
   Then run again: `npm run dev:fresh` or `npm run dev:single`.

**Important:** Run `npm run dev` in **one** terminal only. If you see "Port 3000 is in use by process XXXXX" — that's already a second process; the first one holds `.next` and you'll get EPERM.

---

## Site doesn't load, "Starting..." for a long time, white screen

**Cause:** The server may have started on a **different port** (e.g. 3001) if 3000 was already in use.

**What to do:**
1. Check the terminal for a line like `Local: http://localhost:3001` (or 3002).
2. Open **that URL** in the browser (e.g. http://localhost:3001), not localhost:3000.

If you always want to use port 3000:
- Stop all Node processes: close other terminals with `npm run dev` or run  
  `Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force`
- Then run again: `npm run dev:safe` (runs on 3001) or after clearing `.next` — `npm run dev`.

---

## EPERM: operation not permitted, open '.next\trace'

**Cause:** The `.next` folder is locked by another process (e.g. a second `npm run dev` instance on port 3000).

**What to do:**

1. Stop **all** Next.js/Node processes:
   - Close other terminals where `npm run dev` is running
   - Or in PowerShell: `Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force`
2. Remove the build cache:
   ```powershell
   Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
   ```
3. Start again:
   ```bash
   npm run dev
   ```

**If the error persists:** run the dev server without Turbopack (often avoids the trace issue on Windows):

```bash
npm run dev:safe
```
