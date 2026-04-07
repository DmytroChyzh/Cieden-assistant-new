# Convex account switch (safe sequence)

Run commands from project root:

```powershell
# 1) Stop running Convex dev if active (Ctrl+C in that terminal)

# 2) Logout from current Convex account
npx convex logout

# 3) Login with the new paid Convex account
npx convex login

# 4) Re-bind/select deployment for this project
npx convex dev
# choose/create the deployment under the new account

# 5) Verify project points to the new deployment
npx convex env list
```

Notes:
- If anything goes wrong, restore previous `.env.local` from `backups/convex-switch/`.
- After switching deployment, restart Next.js dev server.
