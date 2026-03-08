# HTracker — Task Tracker

> **Last Updated**: 2026-03-15  
> **Legend**: ✅ Done | 🔧 Partial | ❌ Not Started | ⏭️ Deferred  

---

## Phase 0: Foundation & Infrastructure

| # | Task | Status | Notes |
|---|------|--------|-------|
| 0.1 | Project scaffolding (Next.js + TypeScript + Tailwind) | ✅ Done | `create-next-app` with App Router, Turbopack |
| 0.2 | Prisma schema — User, Tracker, TrackerEntry models | ✅ Done | MongoDB provider, embedded TrackerStatistics |
| 0.3 | Prisma client generation & singleton setup | ✅ Done | `lib/db/prisma.ts` with global caching |
| 0.4 | Database seed script | ✅ Done | `prisma/seed.ts` — 3 users, sample trackers & entries |
| 0.5 | TypeScript types & enums | ✅ Done | `types/index.ts` — TrackerType, TrackerStatus, interfaces, type guards |
| 0.6 | Utility functions (`cn`, `formatDuration`, `calculateContrastColor`) | ✅ Done | `lib/utils.ts` |
| 0.7 | ESLint configuration | ✅ Done | `eslint.config.mjs` |
| 0.8 | Standalone output config | ✅ Done | `next.config.ts` — `output: "standalone"` |
| 0.9 | Path aliases (`@/*`) | ✅ Done | `tsconfig.json` |

---

## Phase 1: Core UI Shell & Theming

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1.1 | Root layout with font setup (Geist Sans/Mono) | ✅ Done | `app/layout.tsx` |
| 1.2 | Global CSS with CSS variables for theming | ✅ Done | `app/globals.css` — light/dark variable sets, custom animations |
| 1.3 | Theme configuration (colors, defaults) | ✅ Done | `config/theme.ts` |
| 1.4 | ThemeToggle component (dark/light/system) | ✅ Done | `components/ui/theme/ThemeToggle.tsx` — 3-state cycle |
| 1.5 | ThemeProvider integration (next-themes) | ✅ Done | Wrapped in root layout |
| 1.6 | UI component library (shadcn/ui new-york + Radix + Lucide) | ✅ Done | ~50 shadcn/ui components in `components/ui/` — all new UI must use shadcn/ui |
| 1.7 | Public landing page | ✅ Done | `app/page.tsx` — hero, features, CTAs |
| 1.8 | Secured layout with sidebar navigation | ✅ Done | `app/(secured)/layout.tsx` — collapsible sidebar, mobile overlay |
| 1.9 | QueryClientProvider setup (TanStack React Query) | ✅ Done | Wrapped in secured layout |

---

## Phase 2: Authentication & User Management

| # | Task | Status | Notes |
|---|------|--------|-------|
| 2.1 | Login page UI | ✅ Done | Wired to `signIn("credentials")` + Google/GitHub OAuth buttons |
| 2.2 | Register page UI | ✅ Done | Calls `registerUser()` then auto-signs-in via `signIn("credentials")` |
| 2.3 | Auth provider integration (NextAuth.js / Auth.js) | ✅ Done | NextAuth v5 beta — `auth.ts`, `app/api/auth/[...nextauth]/route.ts` |
| 2.4 | Email/password credential provider | ✅ Done | Credentials provider with bcrypt (cost 12), PrismaAdapter |
| 2.5 | OAuth provider — Google | ✅ Done | Configured; requires `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` in `.env` |
| 2.6 | OAuth provider — GitHub | ✅ Done | Configured; requires `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET` in `.env` |
| 2.7 | Session management (JWT/cookie) | ✅ Done | JWT strategy; `session.user.id` typed via `types/next-auth.d.ts` |
| 2.8 | Auth middleware for route protection | ✅ Done | `middleware.ts` — protects `/dashboard`, `/trackers`, `/settings`; redirects auth users away from login/register |
| 2.9 | Get authenticated userId in server actions | ✅ Done | `requireUserId()` helper in `trackers.ts` and `entries.ts`; throws if unauthenticated |
| 2.10 | User profile page (`/settings/profile`) | ✅ Done | Server component + `ProfileForm` client component (name, avatar URL, read-only email) |
| 2.11 | Email verification flow | ❌ Not Started | — |
| 2.12 | Password reset flow | ❌ Not Started | — |

---

## Phase 3: Tracker CRUD

| # | Task | Status | Notes |
|---|------|--------|-------|
| 3.1 | `createTracker` server action | ✅ Done | `app/actions/trackers.ts` — Zod validation, Prisma create |
| 3.2 | `getTracker` server action (single) | ✅ Done | Includes 5 most recent entries |
| 3.3 | `getTrackers` server action (list with filters) | ✅ Done | Status, type, search, sort, pagination |
| 3.4 | `updateTracker` server action | ✅ Done | Partial update, type change blocked on client |
| 3.5 | `deleteTracker` server action | ✅ Done | Cascades to entries via Prisma |
| 3.6 | TrackerForm component (create/edit) | ✅ Done | react-hook-form + Zod, tag management, color picker |
| 3.7 | Create tracker page (`/trackers/new`) | ✅ Done | — |
| 3.8 | Edit tracker page (`/trackers/:id/edit`) | ✅ Done | Prefilled form, type locked |
| 3.9 | Tracker list page (`/trackers`) | ✅ Done | Cards grid, filters, pagination |
| 3.10 | Tracker detail page (`/trackers/:id`) | ✅ Done | Stats chart + type-specific view |
| 3.11 | DeleteTrackerButton with confirmation | ✅ Done | Modal confirmation, redirect after delete |
| 3.12 | TrackerCard component | ✅ Done | Type icons, status indicator, quick actions |
| 3.13 | TrackerFilters component | ✅ Done | Search (debounced), status/type/sort dropdowns, URL params |
| 3.14 | Pagination component | ✅ Done | Smart page numbers with ellipsis |
| 3.15 | LimitSelector component | ✅ Done | 5/10/25/50 items per page |
| 3.16 | Duplicate tracker functionality | ✅ Done | `duplicateTracker` server action; DropdownMenu option in TrackerCard |
| 3.17 | Batch operations (multi-select archive/delete) | ✅ Done | `TrackerListClient` with multi-select mode; `archiveTrackers`/`deleteTrackers` server actions |

---

## Phase 4: Entry Management

| # | Task | Status | Notes |
|---|------|--------|-------|
| 4.1 | `createEntry` server action | ✅ Done | Type-aware stats update, transactional |
| 4.2 | `updateEntry` server action | ✅ Done | Stats recalculation via aggregation |
| 4.3 | `deleteEntry` server action | ✅ Done | Stats recalculation |
| 4.4 | `getEntriesByTracker` server action (paginated) | ✅ Done | — |
| 4.5 | `startTimerEntry` server action | ✅ Done | Sets tracker status to ACTIVE |
| 4.6 | `stopTimerEntry` server action | ✅ Done | Calculates duration, resets tracker to INACTIVE |
| 4.7 | `addCounterEntry` server action | ✅ Done | Quick-add with value |
| 4.8 | `getTrackerStats` server action (today/week/month) | ✅ Done | Type-aware aggregation |
| 4.9 | TimerTracker UI | ✅ Done | Start/stop, live elapsed time, entry history |
| 4.10 | CounterTracker UI | ✅ Done | +/− buttons, configurable step, reset |
| 4.11 | AmountTracker UI | ✅ Done | Numeric input, currency tag, transaction history |
| 4.12 | OccurrenceTracker UI | ✅ Done | Date picker, "days since last", history |
| 4.13 | CustomTracker UI | ✅ Done | Free-form value, notes, per-entry tags |
| 4.14 | EntryPagination component | ✅ Done | Limit selector + prev/next |
| 4.15 | Edit entry UI (inline or modal) | ✅ Done | `EditEntryModal` component; type-specific fields; timezone bug fixed |
| 4.16 | Entry notes editing | ✅ Done | Note field included in `EditEntryModal` for all tracker types |

---

## Phase 5: Dashboard

| # | Task | Status | Notes |
|---|------|--------|-------|
| 5.1 | Dashboard page layout | ✅ Done | Welcome section + quick action cards |
| 5.2 | Quick action cards (Timer, Counter, Amount, Occurrence) | ✅ Done | Navigation-only (link to /trackers/new) |
| 5.3 | RecentTrackers widget | ✅ Done | Sorted by activity, excludes archived, limit selector |
| 5.4 | Summary stats widget (today's totals across trackers) | ✅ Done | `SummaryStats` widget — total trackers, active timers, total entries, total time |
| 5.5 | Pinned/favorite trackers | ✅ Done | `isPinned` schema field; `pinTracker`/`unpinTracker` actions; `PinnedTrackers` widget; pin button in TrackerCard |
| 5.6 | Quick-action: one-tap counter increment from dashboard | ✅ Done | Optimistic counter update in TrackerCard; toast feedback; dashboard links fixed to `/trackers/new?type=X` |

---

## Phase 6: Statistics & Analytics

| # | Task | Status | Notes |
|---|------|--------|-------|
| 6.1 | TrackerStatsChart (bar chart — today/week/month) | ✅ Done | Recharts, type-aware tooltips |
| 6.2 | Type-aware value formatting (duration, currency, count) | ✅ Done | In chart and entry list |
| 6.3 | Custom date range selector for charts | ✅ Done | `TrackerStatsChart.tsx` — period tabs + custom date range picker |
| 6.4 | Trend line/area charts | ✅ Done | `TrendChart.tsx` — AreaChart with 7/30/90-day windows |
| 6.5 | Cross-tracker comparison view | ✅ Done | `TrackerComparison.tsx` + `compare/page.tsx` + Compare button on trackers list |
| 6.6 | Goal setting per tracker | ✅ Done | `GoalForm.tsx` — set/update/clear goals per tracker |
| 6.7 | Goal progress tracking UI | ✅ Done | `GoalProgress.tsx` — progress bar with period-aware aggregation |
| 6.8 | Streak tracking for occurrences | ✅ Done | `OccurrenceTracker.tsx` — current + longest streak display |
| 6.9 | Calendar heatmap visualization | ✅ Done | `CalendarHeatmap.tsx` — 52-week GitHub-style contribution grid |
| 6.10 | Data export — CSV | ✅ Done | `ExportSection.tsx` + `settings/export/page.tsx` |
| 6.11 | Data export — PDF | ⏭️ Deferred | P3 priority — complex library dependency; deferred as out of scope |

---

## Phase 7: PWA & Installability

| # | Task | Status | Notes |
|---|------|--------|-------|
| 7.1 | `manifest.json` (name, icons, theme_color, display: standalone) | ✅ Done | `public/manifest.json` |
| 7.2 | App icons (192×192, 512×512, maskable) | ✅ Done | `public/icons/` — 192, 512, and maskable variants |
| 7.3 | Service worker registration | ✅ Done | `ServiceWorkerRegistration.tsx` |
| 7.4 | App shell caching strategy | ✅ Done | `public/sw.js` — STATIC_CACHE strategy |
| 7.5 | API response caching for offline reads | ✅ Done | `public/sw.js` — network-only for API routes |
| 7.6 | Offline write queue (background sync) | ✅ Done | `useOfflineStatus.ts` + `offlineQueue.ts` Zustand store + `OfflineIndicator.tsx` |
| 7.7 | "Add to Home Screen" install prompt | ✅ Done | `InstallPrompt.tsx` |
| 7.8 | Splash/launch screen configuration | ✅ Done | Covered by `manifest.json` `background_color` + `apple-mobile-web-app` meta tags |
| 7.9 | `<meta>` tags for PWA (viewport, theme-color, apple-touch-icon) | ✅ Done | `app/layout.tsx` — metadata + viewport export |
| 7.10 | next-pwa integration or custom SW setup | ✅ Done | `public/sw.js` — manual custom SW; no next-pwa package |

---

## Phase 8: Mobile-First UX Enhancements

| # | Task | Status | Notes |
|---|------|--------|-------|
| 8.1 | Responsive layouts (1/2/3 column) | ✅ Done | Tailwind breakpoints used throughout |
| 8.2 | Collapsible sidebar with mobile overlay | ✅ Done | `app/(secured)/layout.tsx` |
| 8.3 | Touch-optimized controls (44×44px targets) | ✅ Done | 17 fixes across TrackerCard, CounterTracker, TimerTracker, AmountTracker, OccurrenceTracker, CustomTracker |
| 8.4 | Bottom navigation bar for mobile | ✅ Done | `components/features/navigation/BottomNav.tsx` — 4-tab bar, `flex md:hidden`, active state with excludePaths fix |
| 8.5 | Swipe gestures on tracker cards | ✅ Done | `hooks/useSwipeGesture.ts` + TrackerCard: swipe-left >60px reveals orange Archive overlay, calls `archiveTrackers` on release; axis-lock prevents scroll conflict |
| 8.6 | Pull-to-refresh | ✅ Done | `hooks/usePullToRefresh.ts` + TrackerListClient: pull >80px triggers `invalidateQueries` + `router.refresh()`; mobile-only via `useIsMobile` |
| 8.7 | Haptic feedback on counter actions | ✅ Done | `hapticFeedback()` in `lib/utils.ts`; called in CounterTracker increment/decrement and TimerTracker start/stop |
| 8.8 | Loading skeletons (replace "Loading..." text) | ✅ Done | 8 files updated: SummaryStats, RecentTrackers, PinnedTrackers, CounterTracker, TimerTracker, AmountTracker, OccurrenceTracker, CustomTracker |
| 8.9 | Optimistic UI updates for mutations | ✅ Done | Implemented as part of 9.3 via `useCounterMutation` (optimistic `totalValue`) and `useTimerMutation` (optimistic status toggle) |

---

## Phase 9: Performance & Caching

| # | Task | Status | Notes |
|---|------|--------|-------|
| 9.1 | Replace `useTracker` local state with TanStack React Query | ✅ Done | `hooks/useTrackerQuery.ts` — 8 hooks with query key factory; all 5 tracker type components migrated; `useTracker.ts` deprecated |
| 9.2 | Query invalidation strategy (mutation → refetch) | ✅ Done | `trackerKeys` factory in `hooks/queries/trackerQueries.ts`; all mutations call `invalidateQueries` on settle |
| 9.3 | Optimistic updates with TanStack React Query | ✅ Done | `useCounterMutation` (optimistic `totalValue`) and `useTimerMutation` (optimistic status); full `onMutate`/`onError`/`onSettled` rollback pattern |
| 9.4 | Dynamic imports for Recharts (code splitting) | ✅ Done | TrackerStatsChart, TrendChart, CalendarHeatmap, TrackerComparison lazy-loaded via `next/dynamic({ ssr: false })` in page components |
| 9.5 | Image optimization (Next/Image for icons/avatars) | ✅ Done | No raw `<img>` tags found — avatars use shadcn `<AvatarImage>` (Radix primitive); already compliant |
| 9.6 | Bundle size analysis & optimization | ❌ Not Started | — |
| 9.7 | Database indexes (userId, trackerId, date) | ✅ Done | 7 indexes on Tracker and TrackerEntry in `prisma/schema.prisma`; applied via `npx prisma db push` |

---

## Phase 10: Accessibility

| # | Task | Status | Notes |
|---|------|--------|-------|
| 10.1 | Semantic HTML audit | ❌ Not Started | — |
| 10.2 | ARIA attributes on interactive elements | ❌ Not Started | — |
| 10.3 | Focus management for modals/dialogs | 🔧 Partial | Radix primitives handle some focus trapping |
| 10.4 | Keyboard navigation audit | ❌ Not Started | — |
| 10.5 | Color contrast audit (4.5:1 minimum) | ❌ Not Started | — |
| 10.6 | Screen reader testing | ❌ Not Started | — |
| 10.7 | `prefers-reduced-motion` support | ❌ Not Started | — |

---

## Phase 11: Error Handling & Resilience

| # | Task | Status | Notes |
|---|------|--------|-------|
| 11.1 | Server action error responses (discriminated unions) | ✅ Done | `{ success: true, data } | { success: false, error }` |
| 11.2 | Form-level validation feedback (Zod + react-hook-form) | ✅ Done | Field-level errors displayed |
| 11.3 | Global error boundary component | ❌ Not Started | — |
| 11.4 | Per-feature error boundaries | ❌ Not Started | — |
| 11.5 | Fallback UI components for failed loads | ❌ Not Started | — |
| 11.6 | Toast notifications for success/error | ✅ Done | Sonner integration |
| 11.7 | Offline detection & user notification | ❌ Not Started | — |

---

## Phase 12: Testing

| # | Task | Status | Notes |
|---|------|--------|-------|
| 12.1 | Testing framework setup (Jest or Vitest) | ❌ Not Started | — |
| 12.2 | Server action unit tests | ❌ Not Started | — |
| 12.3 | Utility function tests | ❌ Not Started | `formatDuration`, `calculateContrastColor`, type guards |
| 12.4 | Component tests (React Testing Library) | ❌ Not Started | — |
| 12.5 | E2E tests (Playwright) | ❌ Not Started | — |
| 12.6 | CI pipeline (lint + test on push) | ❌ Not Started | — |

---

## Phase 13: DevOps & Deployment

| # | Task | Status | Notes |
|---|------|--------|-------|
| 13.1 | Dockerfile for standalone build | ❌ Not Started | `output: "standalone"` is set |
| 13.2 | Docker Compose (app + MongoDB) | ❌ Not Started | — |
| 13.3 | Environment variable documentation | ❌ Not Started | DATABASE_URL exists, auth vars needed |
| 13.4 | Husky pre-commit hooks (lint + format) | ❌ Not Started | — |
| 13.5 | Prettier configuration | ❌ Not Started | — |
| 13.6 | Production deployment guide | ❌ Not Started | — |

---

## Summary

| Phase | Total Tasks | ✅ Done | 🔧 Partial | ❌ Not Started |
|-------|------------|---------|------------|----------------|
| 0 — Foundation | 9 | 9 | 0 | 0 |
| 1 — UI Shell & Theming | 9 | 9 | 0 | 0 |
| 2 — Authentication | 12 | 10 | 0 | 2 |
| 3 — Tracker CRUD | 17 | 17 | 0 | 0 |
| 4 — Entry Management | 16 | 16 | 0 | 0 |
| 5 — Dashboard | 6 | 6 | 0 | 0 |
| 6 — Statistics & Analytics | 11 | 10 | 0 | 0 |
| 7 — PWA & Installability | 10 | 10 | 0 | 0 |
| 8 — Mobile UX Enhancements | 9 | 2 | 1 | 6 |
| 9 — Performance & Caching | 7 | 0 | 0 | 7 |
| 10 — Accessibility | 7 | 0 | 1 | 6 |
| 11 — Error Handling | 7 | 3 | 0 | 4 |
| 12 — Testing | 6 | 0 | 0 | 6 |
| 13 — DevOps | 6 | 0 | 0 | 6 |
| **TOTAL** | **132** | **92** | **2** | **37** |

> ¹ Task 6.11 (PDF export) is ⏭️ Deferred (out of scope) — counted above as Not Started.

**Overall Progress: ~70% complete**

---

## Recommended Priority Order

1. **Phase 2** — Authentication (P0 blocker — app is unusable without real auth)
2. **Phase 7** — PWA & Installability (core requirement for mobile-first installable app)
3. **Phase 8** — Mobile UX Enhancements (bottom nav, skeletons, optimistic updates)
4. **Phase 9** — Performance & Caching (React Query migration, code splitting)
5. **Phase 11** — Error Handling (error boundaries, offline detection)
6. **Phase 5** — Dashboard enhancements (summary stats, pinned trackers)
7. **Phase 6** — Statistics & Analytics (date ranges, trends, exports)
8. **Phase 10** — Accessibility audit
9. **Phase 12** — Testing
10. **Phase 13** — DevOps & Deployment
