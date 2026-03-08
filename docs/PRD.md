# HTracker — Product Requirements Document (PRD)

> **Version**: 1.0  
> **Last Updated**: 2026-03-07  
> **Status**: Draft  

---

## 1. Product Overview

### 1.1 Vision

HTracker is a **mobile-first, installable** web application that lets users effortlessly track anything — time, counts, amounts, occurrences, and custom metrics — from any device. It is designed as a Progressive Web App (PWA) so it can be installed on phones, tablets, and desktops, working seamlessly online and offline.

### 1.2 Problem Statement

People need a single, unified tool to track diverse daily metrics — work hours, habits, expenses, gym visits, medications, water intake, etc. Existing solutions are fragmented across multiple apps, lack offline support, or are too complex for casual tracking.

### 1.3 Target Users

- **Individuals** tracking personal habits, health, finances, or productivity.
- **Freelancers** logging billable hours and project expenses.
- **Anyone** wanting a simple, fast, always-available tracking tool.

### 1.4 Core Design Principles

| Principle | Description |
|-----------|-------------|
| **Mobile-First** | Touch-optimized UI, 44×44px minimum tap targets, swipe gestures, single-column mobile layouts. |
| **Installable** | Full PWA with manifest, service worker, offline caching, and "Add to Home Screen" prompt. |
| **Fast & Lightweight** | Instant interactions, optimistic updates, skeleton loading, minimal bundle size. |
| **Universal Tracking** | Five built-in tracker types plus a flexible custom type to cover any use case. |
| **Privacy-First** | Each user sees only their own data. No shared accounts or public data. |

### 1.5 UI Stack Constraints

- **Tailwind CSS** for all styling — preserve existing styles, extend via utility classes only.
- **shadcn/ui** (new-york variant) as the component library — all new UI must use shadcn/ui components.
- **TanStack React Query** for all server state management — all data fetching and mutations must go through React Query hooks.
- **Lucide React** for icons.
- Do **not** introduce alternative component libraries (e.g., HeroUI, Material UI, Chakra).

---

## 2. Technical Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, Server Actions, Turbopack) |
| Language | TypeScript 5.9 (strict mode) |
| Styling | Tailwind CSS 4.2 (do not change existing styles) |
| UI Components | shadcn/ui (new-york style) + Radix UI primitives + Lucide icons |
| Database | MongoDB via Prisma 6.6 ORM |
| State Management | TanStack React Query 5, Zustand 5 |
| Forms | react-hook-form 7 + Zod 4 validation |
| Charts | Recharts 2.15 |
| Theming | next-themes (dark / light / system) |
| Auth | NextAuth.js (planned) — Email/password + OAuth (Google, GitHub) |
| PWA | next-pwa / custom service worker + Web App Manifest |
| Deployment | Standalone output, Docker-ready |

---

## 3. Information Architecture

```
/                           → Landing page (public)
/login                      → Sign in (public)
/register                   → Sign up (public)
/dashboard                  → Home dashboard (secured)
/trackers                   → All trackers list (secured)
/trackers/new               → Create tracker (secured)
/trackers/:id               → View tracker + entries (secured)
/trackers/:id/edit          → Edit tracker (secured)
/settings                   → User settings & profile (secured) [planned]
/settings/profile           → Profile management [planned]
/settings/export            → Data export [planned]
```

---

## 4. Data Models

### 4.1 User

| Field | Type | Description |
|-------|------|-------------|
| id | ObjectId | Primary key |
| name | String? | Display name |
| email | String | Unique, required |
| emailVerified | DateTime? | Email verification timestamp |
| image | String? | Avatar URL |
| password | String? | Hashed password (null for OAuth) |
| createdAt | DateTime | Account creation |
| updatedAt | DateTime | Last modification |

### 4.2 Tracker

| Field | Type | Description |
|-------|------|-------------|
| id | ObjectId | Primary key |
| name | String | 1–50 characters |
| description | String? | Optional, up to 200 chars |
| type | TrackerType | TIMER, COUNTER, AMOUNT, OCCURRENCE, CUSTOM |
| status | TrackerStatus | ACTIVE, INACTIVE, ARCHIVED |
| tags | String[] | User-defined labels |
| color | String? | Hex color code |
| icon | String? | Icon identifier |
| statistics | TrackerStatistics | Embedded aggregation cache |
| userId | ObjectId | Owner reference |
| createdAt | DateTime | — |
| updatedAt | DateTime | — |

### 4.3 TrackerEntry

| Field | Type | Description |
|-------|------|-------------|
| id | ObjectId | Primary key |
| trackerId | ObjectId | Parent tracker |
| startTime | DateTime? | Timer start |
| endTime | DateTime? | Timer end |
| value | Float? | Numeric value for counter/amount |
| date | DateTime | Entry timestamp |
| note | String? | Optional note |
| tags | String[] | Entry-specific tags |
| createdAt | DateTime | — |

### 4.4 TrackerStatistics (Embedded)

| Field | Type | Description |
|-------|------|-------------|
| totalEntries | Int | Count of all entries |
| totalTime | Float? | Accumulated seconds (TIMER) |
| totalValue | Float? | Accumulated value (COUNTER/AMOUNT) |
| totalCustom | String? | Serialized custom data |

---

## 5. Tracker Types

### 5.1 Timer (TIMER)

**Purpose**: Track time spent on activities.

- **Interaction**: Start / Stop buttons.
- **Live display**: Elapsed time updates every second while running.
- **Data**: Each entry stores `startTime`, `endTime`, and computed `value` (duration in seconds).
- **Stats**: Total accumulated time, per-day / per-week / per-month breakdowns.
- **Constraint**: Only one active timer per tracker at a time.

### 5.2 Counter (COUNTER)

**Purpose**: Track incrementing/decrementing counts.

- **Interaction**: +/− buttons with configurable step amount.
- **Data**: Each entry stores a `value` (positive or negative).
- **Stats**: Running total, entry count.
- **Features**: Quick-increment from tracker card, reset functionality.

### 5.3 Amount (AMOUNT)

**Purpose**: Track numerical values (money, measurements, etc.).

- **Interaction**: Numeric input with optional currency/unit tag.
- **Data**: Each entry stores a `value` and optional `note`.
- **Stats**: Running total, entry count.
- **Features**: Supports negative values, transaction-style history.

### 5.4 Occurrence (OCCURRENCE)

**Purpose**: Track when events happen (habits, milestones).

- **Interaction**: Date/time picker + optional note.
- **Data**: Each entry stores a `date`.
- **Stats**: Total occurrences, "days since last", frequency (daily/weekly/monthly).
- **Features**: Streak tracking (planned), calendar heatmap (planned).

### 5.5 Custom (CUSTOM)

**Purpose**: Flexible tracking for anything not covered above.

- **Interaction**: Free-form value input + notes + per-entry tags.
- **Data**: Each entry stores a `value`, `note`, and `tags[]`.
- **Stats**: Entry count, custom summary.

---

## 6. Feature Requirements

### 6.1 Authentication & Authorization

| Requirement | Priority | Description |
|-------------|----------|-------------|
| Email/password sign-up | P0 | Registration with email + hashed password |
| Email/password sign-in | P0 | Login with session/JWT management |
| Route protection middleware | P0 | Redirect unauthenticated users to /login |
| User isolation in server actions | P0 | All queries scoped to authenticated userId |
| OAuth — Google | P1 | Social login via Google |
| OAuth — GitHub | P1 | Social login via GitHub |
| Email verification | P2 | Verify email after registration |
| Password reset flow | P2 | Forgot password → email link → reset |
| User profile management | P2 | Edit name, avatar, password |

### 6.2 Dashboard

| Requirement | Priority | Description |
|-------------|----------|-------------|
| Welcome section | P0 | Greeting + quick-action CTAs |
| Recent trackers widget | P0 | Show recently used trackers sorted by activity |
| Quick-action cards | P0 | One-tap actions — start timer, increment counter, log amount, record occurrence |
| Summary stats | P1 | Aggregate stats across all trackers (today's activity count, active timers, etc.) |
| Pinned trackers | P2 | Users can pin favorite trackers to dashboard |

### 6.3 Tracker Management

| Requirement | Priority | Description |
|-------------|----------|-------------|
| Create tracker | P0 | Form with name, type, description, tags, color, icon |
| Edit tracker | P0 | Update all fields except type |
| Delete tracker | P0 | Soft-delete via archive or hard-delete with confirmation |
| Archive / unarchive | P0 | Move trackers to archived state and back |
| List with search | P0 | Search by name, description, tags (debounced) |
| Filter by type & status | P0 | Dropdown filters on tracker list |
| Sort options | P0 | Recently used, alphabetical, newest first |
| Pagination | P0 | Configurable items per page (5/10/25/50) |
| Duplicate tracker | P2 | Clone an existing tracker |
| Batch operations | P2 | Multi-select → archive/delete/tag |

### 6.4 Entry Management

| Requirement | Priority | Description |
|-------------|----------|-------------|
| Create entry (type-specific UI) | P0 | Timer start/stop, counter +/−, amount input, date pick, custom input |
| View entry history | P0 | Paginated list per tracker |
| Delete entry | P0 | With stats recalculation |
| Edit entry | P1 | Inline or modal editing with stats recalculation |
| Entry notes | P0 | Optional text notes on any entry |
| Entry tags | P1 | Per-entry tags for sub-categorization |

### 6.5 Statistics & Charts

| Requirement | Priority | Description |
|-------------|----------|-------------|
| Per-tracker stats (today/week/month) | P0 | Bar chart with Recharts |
| Type-aware formatting | P0 | Duration for timers, currency for amounts, count for others |
| Cached statistics | P1 | Use embedded TrackerStatistics to avoid expensive re-aggregation |
| Date range selector | P1 | Custom start/end for chart views |
| Trend line charts | P2 | Line/area charts showing trends over time |
| Cross-tracker comparison | P2 | Compare two or more trackers side-by-side |
| Data export (CSV) | P2 | Export entries/stats to CSV |
| Data export (PDF) | P3 | Formatted PDF reports |

### 6.6 PWA & Installability

| Requirement | Priority | Description |
|-------------|----------|-------------|
| Web App Manifest | P0 | `manifest.json` with name, icons, theme color, display: standalone |
| Service worker | P0 | Cache app shell, static assets, and API responses |
| Offline support | P1 | Read cached data offline; queue writes for sync |
| Install prompt | P0 | "Add to Home Screen" banner / button |
| App icons | P0 | Multiple sizes (192×192, 512×512, maskable) |
| Splash screen | P1 | Themed launch screen on mobile |
| Push notifications | P3 | Reminders for habits, timer alerts |

### 6.7 Mobile-First UX

| Requirement | Priority | Description |
|-------------|----------|-------------|
| Responsive layouts | P0 | 1-col mobile, 2-col tablet, 3-col desktop |
| Touch-optimized controls | P0 | Min 44×44px tap targets |
| Collapsible sidebar | P0 | Overlay on mobile, persistent on desktop |
| Bottom navigation (mobile) | P1 | Quick access to Dashboard, Trackers, + New |
| Swipe gestures | P2 | Swipe-to-archive, swipe-to-delete on tracker cards |
| Pull-to-refresh | P2 | Native-feel refresh on mobile |
| Haptic feedback | P3 | Vibration on counter increment (where supported) |

### 6.8 Theming & Accessibility

| Requirement | Priority | Description |
|-------------|----------|-------------|
| Dark / Light / System themes | P0 | Using next-themes with CSS variables |
| WCAG 2.1 AA compliance | P1 | Contrast ratios, semantic HTML, ARIA attributes |
| Keyboard navigation | P1 | Full tab-order support, focus management |
| Screen reader support | P1 | Proper ARIA labels on interactive elements |
| Reduced motion support | P2 | Respect `prefers-reduced-motion` |

### 6.9 Performance

| Requirement | Priority | Description |
|-------------|----------|-------------|
| Skeleton loading screens | P1 | Replace "Loading..." with skeleton placeholders |
| Optimistic UI updates | P1 | Instant feedback for mutations (counter clicks, timer start) |
| React Query caching | P1 | Replace local state hooks with proper query caching |
| Code splitting | P1 | Dynamic imports for heavy components (charts) |
| Bundle analysis | P2 | Monitor and optimize bundle size |

### 6.10 Developer Experience

| Requirement | Priority | Description |
|-------------|----------|-------------|
| ESLint + Prettier | P0 | Consistent code formatting |
| Unit tests (Jest/Vitest) | P1 | Core logic and server actions |
| Component tests (Testing Library) | P2 | Key UI component interactions |
| E2E tests (Playwright) | P2 | Critical user flows |
| CI/CD pipeline | P2 | Automated build, lint, test on push |
| Husky pre-commit hooks | P2 | Lint + format before commit |

---

## 7. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **UI Consistency** | All components must use shadcn/ui primitives; no mixing of component libraries |
| **Performance** | First Contentful Paint < 1.5s; Time to Interactive < 3s on 4G |
| **Availability** | Offline-capable for reads; queued writes sync when online |
| **Security** | Hashed passwords (bcrypt), CSRF protection, input sanitization, user-scoped data |
| **Scalability** | Efficient MongoDB queries with indexes on userId + trackerId fields |
| **Browser Support** | Latest 2 versions of Chrome, Firefox, Safari, Edge; iOS Safari 15+ |
| **Accessibility** | WCAG 2.1 AA compliance |

---

## 8. Out of Scope (v1)

- Multi-user collaboration / shared trackers
- Native mobile apps (iOS/Android) — PWA covers this
- Real-time collaboration / WebSocket updates
- AI-powered insights or suggestions
- Third-party integrations (Fitbit, Google Fit, etc.)
- Multi-language / internationalization (i18n)

---

## 9. Success Metrics

| Metric | Target |
|--------|--------|
| Lighthouse PWA score | ≥ 90 |
| Lighthouse Performance score | ≥ 85 |
| Time to create first tracker | < 30 seconds |
| Time to log an entry | < 3 seconds (1 tap for counter) |
| Offline read availability | 100% of cached data |

---

## 10. Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2026-03-07 | 1.0 | Initial PRD based on schema analysis and current implementation audit |
