# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm dev          # Start Next.js dev server

# Build & lint
pnpm build        # Build for production (TypeScript errors are intentionally ignored — see next.config.mjs)
pnpm lint         # Run ESLint
```

> Note: there are no automated tests in this project.

## Environment Variables

Copy `.env.local` (not committed). Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `NEXT_PUBLIC_SITE_URL` — Full URL used for auth redirects (e.g. `http://localhost:3000`)

The app degrades gracefully if Supabase env vars are absent (middleware passes through without auth).

## Architecture Overview

**Coros** is an AI-powered sentiment analysis and social media monitoring platform built with Next.js 16, Supabase (auth + database), and the Vercel AI SDK.

### Route Structure

```
app/
  page.tsx                          → redirects to /login or /projects
  (auth)/login, sign-up, …         → public auth pages
  (app)/projects/page.tsx           → project list (client component, direct Supabase queries)
  (app)/projects/[projectId]/[view]/page.tsx  → main dashboard (server component)
  api/chat/route.ts                 → streaming AI chat endpoint
  join/[token]/page.tsx             → share-link join handler
```

Views are one of `general | redes-sociales | diarios`. The dashboard page validates the `[view]` param and redirects unknown values to `general`.

### Data Layer (`lib/`)

- **`lib/supabase/server.ts`** — creates a cookie-based Supabase server client. **Always create a new instance per function** — do not cache in module scope (Fluid compute requirement).
- **`lib/supabase/client.ts`** — browser Supabase client for client components.
- **`lib/data.ts`** — read-only query functions (`getUserProjects`, `getSentimentCounts`, `getSentimentByTopic`, `getRecentPosts`). All take `projectId` and return typed data.
- **`lib/actions/`** — Next.js Server Actions grouped by domain:
  - `auth.ts` — `loginWithEmail`, `logout`, `getUserRole`, `getCurrentUser`
  - `projects.ts` — CRUD for projects, members, invites
  - `settings.ts` — profile updates, project settings, share-link management (`enableShareLink`, `disableShareLink`, `joinProjectByToken`), data sources (RSS feeds / keywords)

### Database Schema (Supabase)

Tables: `profiles`, `projects`, `project_members`, `project_invites`, `project_settings`, `posts`.

Key relationships:
- A user's project access is determined entirely by `project_members` rows — **never query `projects` directly with a user filter**; instead query `project_members` first to avoid RLS recursive self-join issues.
- `profiles` has `role` (`admin` | `creator` | `viewer`) and `can_create_projects`.
- `project_members.role` is `owner` | `editor` | `viewer`.
- `projects` has share-link columns: `share_token` (UUID), `share_enabled` (bool), `share_role` (`viewer` | `editor`).
- `posts` holds imported social/news content with fields: `texto`, `red_social`, `fuente`, `sentimiento` (`positivo` | `neutral` | `negativo`), `tema`, `justificacion`, `fecha`, `likes`, `tipo`.

RLS uses two SECURITY DEFINER helper functions to avoid policy recursion: `get_my_role()` (reads `profiles`) and `get_my_project_role(project_id)` (reads `project_members`).

Migration file: `supabase/migrations/20260523_settings_and_share.sql` — apply via the Supabase SQL editor.

### Auth & Middleware

`middleware.ts` → `lib/supabase/middleware.ts`: refreshes sessions on every request, redirects unauthenticated users to `/login`, and redirects authenticated users away from auth pages to `/projects`. API routes and static assets are exempt.

Auth flow: email/password login → `loginWithEmail` server action → role-based redirect (`admin` → `/admin`, everyone else → `/projects`).

### AI Chat (`app/api/chat/route.ts`)

Uses `streamText` from the Vercel AI SDK with model `openai/gpt-4o`. The endpoint:
1. Verifies auth and project membership before any processing.
2. Exposes five tools to the model: `getSentimentSummary`, `getRecentComments`, `getSentimentByTopic`, `getSentimentBySocialNetwork`, `searchComments` — all scoped to the `projectId` from the request body.
3. The system prompt is in Spanish; the model is instructed to only cite data returned by tools, never invent information.

The client side uses `useChat` from `@ai-sdk/react` with `DefaultChatTransport`, injecting `projectId` into every request body via `prepareSendMessagesRequest`.

### UI Components

- `components/ui/` — shadcn/ui primitives (Radix UI + Tailwind).
- `components/coros/` — domain components: `CorosSidebar`, `SentimentStats`, `TopicSentiment`, `CommentList`, `AIPanel`.
- `components/settings/` — settings popover and its sub-dialogs: `ProfileDialog`, `ProjectDialog`, `DataSourcesSheet`, `AppearanceView`, `MembersList`.
- `components/share/` — `ShareButton` + `ShareDialog` for generating/managing share links.

The app is in Spanish (UI strings, locale `es-AR` for dates).

### Theming

`next-themes` with `attribute="class"`, system default. Tailwind CSS v4. Analytics (`@vercel/analytics`) loads only in production.
