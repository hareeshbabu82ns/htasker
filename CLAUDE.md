# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**HTracker** — A mobile-first PWA for tracking time, counters, amounts, occurrences, and custom metrics. Built with Next.js 16 (App Router), MongoDB via Prisma 6, NextAuth v5, and shadcn/ui (new-york). Single-user via NextAuth JWT sessions.

## Key Commands

```bash
npm run dev         # Start dev server (Turbopack)
npm run build       # Production build (standalone output)
npm start           # Start production server
npm run lint        # ESLint
npm run seed        # Seed database (prisma/seed.ts)
npm run test        # Run Vitest unit tests
npm run test:watch    # Vitest watch mode
npm run test:coverage # Vitest with coverage
npm run test:e2e      # Playwright E2E tests
npm run format      # Prettier format all
npx prisma migrate  # Run database migrations
docker compose up   # Full stack (app + MongoDB replica set)
```

## Architecture

### Routing & Layouts

- `app/page.tsx` — Public landing page
- `app/layout.tsx` — Root layout (ThemeProvider from next-themes, Geist fonts)
- `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx` — Auth pages
- `app/(secured)/layout.tsx` — Authenticated layout with sidebar nav + QueryClientProvider
- `app/(secured)/dashboard/page.tsx` — Dashboard: summary stats + pinned trackers + recent trackers + quick-action cards
- `app/(secured)/trackers/page.tsx` — Paginated tracker list with filters
- `app/(secured)/trackers/[id]/page.tsx` — Tracker detail view + entries + charts
- `app/(secured)/trackers/[id]/edit/page.tsx` — Tracker edit form
- `app/(secured)/trackers/new/page.tsx` — New tracker creation form
- `app/(secured)/trackers/compare/page.tsx` — Cross-tracker comparison
- `app/(secured)/boards/page.tsx`, `app/(secured)/boards/[boardId]/page.tsx` — Kanban boards list + board view
- `app/(secured)/boards/[boardId]/tasks/[taskId]/page.tsx` — Individual task detail
- `app/(secured)/stats/page.tsx` — Aggregate stats across all trackers
- `app/(secured)/timer/page.tsx`, `app/(secured)/counter/page.tsx`, `app/(secured)/amount/page.tsx`, `app/(secured)/occurrence/page.tsx` — Quick-add entry pages by type
- `app/(secured)/settings/profile/page.tsx`, `app/(secured)/settings/export/page.tsx`, `app/(secured)/settings/api-tokens/page.tsx` — Settings pages
- `app/api/v1/trackers/` — REST API v1 endpoints (legacy/alternative to server actions)

### Auth

- `auth.ts` — NextAuth v5 config with Prisma adapter, Credentials + Google + GitHub providers, JWT session strategy
- `auth.config.ts` — Route protection config: protected routes (`/dashboard`, `/trackers`, `/settings`), auth routes (`/login`, `/register`), `authorized` callback for unauthenticated redirects
- `middleware.ts` — NextAuth `auth` middleware with matcher excluding API/static assets
- `lib/api/auth.ts` — Auth helper utilities for API routes

### Server Actions (primary business logic)

- `app/actions/auth.ts` — signIn, signOut, signUp
- `app/actions/trackers.ts` — Tracker CRUD + paginated list with filters (status, type, search, sort). Returns `TrackerPagingResponse`.
- `app/actions/entries.ts` — Entry CRUD + timer start/stop, counter add/sub, stats aggregation. All mutations use Prisma transactions.
- `app/actions/boards.ts` — Board CRUD + list
- `app/actions/board-tasks.ts` — BoardTask CRUD + reordering
- `app/actions/api-tokens.ts` — API token CRUD
- `app/actions/users.ts` — User profile management

### Data Layer

- **Prisma schema**: `prisma/schema.prisma` — MongoDB (provider: mongodb)
  - Models: `User` → (1:N) `Tracker` → (1:N) `TrackerEntry`; `Board` → (1:N) `BoardColumn` → (1:N) `BoardTask`; `ApiToken`; `Account`; `VerificationToken`
  - Enums: `TrackerType` (TIMER, COUNTER, AMOUNT, OCCURRENCE, CUSTOM), `TrackerStatus` (ACTIVE, INACTIVE, ARCHIVED)
  - Embedded `TrackerStatistics` (type)
- `lib/db/prisma.ts` — Singleton PrismaClient with dev log config
- `types/index.ts` — TypeScript interfaces mirroring Prisma models + discriminated unions + type guards + form value types

### Client-Side Data Fetching

- `hooks/useTracker.ts` — React hook wrapping server actions (addTracker, fetchTrackers, fetchTracker, changeStatus, removeTracker, addEntry, updateEntry, deleteEntry, fetchEntries)
- `hooks/queries/trackerQueries.ts`, `hooks/queries/boardQueries.ts` — TanStack Query hook definitions
- `hooks/useBoardQuery.ts`, `hooks/useTrackerQuery.ts` — Shared query hook wrappers
- `hooks/use-mobile.ts`, `hooks/useDebounce.ts`, `hooks/useOfflineStatus.ts`, `hooks/usePullToRefresh.ts`, `hooks/useSwipeGesture.ts` — Utility hooks (PWA/UX)
- `lib/utils.ts` — `cn()` (clsx + twMerge), `formatDuration()`, `calculateContrastColor()`
- `lib/offlineQueue.ts` — Offline write queue for PWA sync

### Component Structure

- `components/ui/` — ~56 shadcn/ui primitive components (button, card, dialog, sheet, tabs, etc.) + `theme/ThemeToggle.tsx`
- `components/features/trackers/` — Tracker features: `TrackerCard`, `TrackerFilters`, `TrackerView`, `TrackerForm`, `TrackerStatsChart`, `TrackerDetailCharts`, `TrackerComparison`, `EntryPagination`, `GoalForm`, `GoalProgress`, `CalendarHeatmap`, `TrendChart`, `EditEntryModal`, `DeleteTrackerButton`
- `components/features/trackers/types/` — Per-tracker-type components: `TimerTracker`, `CounterTracker`, `AmountTracker`, `OccurrenceTracker`, `CustomTracker`
- `components/features/boards/` — Kanban: `KanbanBoard`, `KanbanColumn`, `TaskCard`, `TaskDetailSheet`, `TaskDialog`, `TaskDescription`, `TaskDetailContent`, `CreateBoardDialog`, `AddColumnDialog`, `BoardList`, `UserAssignment`
- `components/features/dashboard/` — `PinnedTrackers`, `RecentTrackers`, `SummaryStats`
- `components/features/stats/` — `StatsBreakdown`, `TopTrackers`
- `components/features/settings/` — `ProfileForm`, `ExportSection`, `ApiTokensSection`
- `components/features/navigation/` — `BottomNav`, `UserMenu`
- `components/features/pwa/` — `InstallPrompt`, `OfflineIndicator`, `ServiceWorkerRegistration`
- `components/features/error/ErrorFallback.tsx`
- `components/providers/AuthProvider.tsx` — Auth context provider

### Config

- `config/theme.ts` — Theme config (default: system, light/dark color tokens)
- `next.config.ts` — Next.js config (standalone output for Docker)
- `tsconfig.json` — Path alias `@/*` → `./*`, ES2017 target, strict mode
- `components.json` — shadcn/ui configuration
- `playwright.config.ts` — E2E test configuration
- `vitest.config.ts` — Unit test configuration

### PWA

- Service worker, Web App Manifest, offline caching, install prompt, pull-to-refresh, swipe gestures
- `lib/offlineQueue.ts` — Queues writes when offline, syncs when reconnected

### Containerization

- `Dockerfile` — Multi-stage build (Next.js standalone output)
- `docker-compose.yml` — App + MongoDB 7 (replica set for Prisma transactions) + mongo-init-rs
- `docker/mongo-init.js` — Initial MongoDB data seeding

## Key Patterns

1. **Server actions + TanStack Query**: All data mutations go through `"use server"` functions in `app/actions/`. Client components use `useTracker` hook + TanStack Query v5 (`useMutation`/`useQuery`) for caching and invalidation.
2. **Zod validation**: All server action inputs validated with Zod v4 schemas before Prisma operations. Client forms mirror zod schemas via `zodResolver`.
3. **NextAuth v5 JWT auth**: JWT session strategy, `authorized` callback guards protected routes. Unauthenticated users redirected to `/login`.
4. **Kanban boards**: `Board` → `BoardColumn` → `BoardTask` with drag-and-drop via `@dnd-kit`.
5. **Tracker type dispatch**: Each `TrackerType` has its own UI component in `components/features/trackers/types/` and distinct statistics update logic in entries server actions.
6. **Pagination**: Tracked via URL search params (`page`, `limit`, `status`, `type`, `q`, `sort`). Shared `Pagination` and `LimitSelector` components.
7. **Offline-first PWA**: Reads from cache when offline, writes queued via `offlineQueue.ts` and synced on reconnect.
8. **Mobile-first UX**: Touch-optimized (44x44px tap targets), collapsible sidebar, bottom nav on mobile, swipe gestures, pull-to-refresh.

## Coding Conventions

- **No `any`** — use `unknown` + type guards instead
- **Prefer type guards** over type assertions (`as`)
- **Component props**: explicit interface/type, no `React.FC`, destructure in function signature
- **Handle `null` and `undefined` distinctly** — don't rely on falsy checks
- **Discriminated unions** for state and action responses
- **Forms**: always `react-hook-form` with `zodResolver`, mirror server action zod schemas
- **UI**: only shadcn/ui (new-york) + Radix UI primitives + Lucide icons — no alternative libraries
- **Mobile-first responsive** with Tailwind breakpoints; WCAG 2.1 AA (semantic HTML, ARIA, 4.5:1 contrast, keyboard nav)
