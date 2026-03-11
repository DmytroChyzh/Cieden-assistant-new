# Repository Guidelines

## Project Structure & Modules
- `app/`: Next.js App Router pages, layouts, API routes.
- `src/`: Shared code (`components/`, `features/`, `hooks/`, `lib/`, `providers/`, `utils/`, `types/`).
- `components/`: Global UI primitives and composites.
- `convex/`: Convex backend functions, schema, and auth integration.
- `public/`: Static assets.
- Config: `next.config.ts`, `tailwind.config.js`, `eslint.config.mjs`, `tsconfig.json`.

## Build, Test, and Dev
- `npm run dev`: Start Next.js dev server (Turbopack). Open `http://localhost:3000`.
- `npm run build`: Production build (TS/ESLint errors are ignored per PoC config).
- `npm start`: Run the built app.
- `npm run lint`: Lint with Next/ESLint config.
- Convex (if editing backend): `npx convex dev` in parallel with Next.

## Coding Style & Naming
- Language: TypeScript + React (Next.js, App Router).
- Linting: `eslint.config.mjs` extends `next/core-web-vitals` and `next/typescript`.
- Indentation: 2 spaces; avoid long lines; prefer early returns.
- Naming: PascalCase for React components, camelCase for vars/functions, SCREAMING_SNAKE_CASE for constants. Use kebab-case for non-component filenames (e.g., `app-sidebar.tsx`).
- Components: Keep pure/presentational where possible; colocate styles; prefer server components unless client features are required (`"use client"`).
- TailwindCSS: Use utility classes; dark mode is `class`-based.

## Testing Guidelines
- No formal unit/E2E test suite configured yet. Validate changes by:
  - Running `npm run dev` and exercising affected routes.
  - Running `npm run lint` and ensuring no new warnings.
- If adding tests, mirror file under `src/**` and keep names descriptive (e.g., `feature-name.spec.ts`).

## Commit & PR Guidelines
- Commit style: Mixed history; prefer Conventional Commits (e.g., `feat:`, `fix:`, `chore:`) with imperative mood and scope: `feat(chat): add typing indicator`.
- Small, focused commits; include rationale in body when non-trivial.
- PRs: Link issues, describe changes and impact, add screenshots for UI, list manual test steps, note any config/migration.
- Pre-PR checks: `npm run lint`, `npm run build`, and, if applicable, `npx convex dev` sanity.

## Security & Configuration
- Do not commit secrets. Use `.env.local` (see `.env.example`).
- Review `middleware.ts` and `convex/auth.*` for auth-sensitive changes.
- Follow `ARCHITECTURE.md` and `TECHNICAL_REFERENCE.md` for data flows and boundaries.
