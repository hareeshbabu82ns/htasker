# Technical Debt Plan — HTracker

## Context

HTracker is a Next.js 16 PWA with MongoDB/Prisma, NextAuth v5, shadcn/ui. The codebase has accumulated debt across multiple areas: dead code, silent error failures, duplicated logic, missing validation, unsafe type casts, large monolith files, hardcoded colors, and accessibility gaps. This plan prioritizes fixes by **impact vs. effort** — quick wins first, then larger refactors.

**Phase 1 findings**: `formatDuration`, `hapticFeedback`, `calculateContrastColor` in `lib/utils.ts` are actively imported by 5+ components — NOT dead code. `input-group.tsx` is used by `combobox.tsx` — NOT dead. Adjusted scope accordingly.

---

## Phase 1: Dead Code Cleanup (Low Risk, High Impact) ✅ DONE

### 1.1 Delete `hooks/useTracker.ts` (367 lines) ✅

- **File**: `hooks/useTracker.ts` — deprecated, zero imports
- **Action**: Deleted the file

### 1.2 Remove unused exports from `types/index.ts` ✅

- **Remove**: `TrackerState`, `TrackerEntryFormValues`, `ApiResponse`, `ApiError`, `BoardFormValues`, `BoardTaskFormValues`
- **Action**: Removed 6 unused types

### 1.3 Remove unused functions from `lib/utils.ts` ⏭ SKIPPED

- **Finding**: `formatDuration`, `hapticFeedback`, `calculateContrastColor` are all actively imported by 5+ components
- **Decision**: Keep — not dead code

### 1.4 Remove `withErrorHandling` from `lib/api/auth.ts` ✅

- **Action**: Removed unused function

---

## Phase 2: Error Handling & Safety (Critical) ✅ DONE

### 2.1 Centralize `requireUserId()` across all action files ✅

- **Files**: `app/actions/boards.ts`, `app/actions/entries.ts`, `app/actions/board-tasks.ts`, `app/actions/trackers.ts`, `app/actions/api-tokens.ts`
- **Current state**: 5 identical copies of `requireUserId()` (10 lines each = 50 lines of duplicate code)
- **Action**: Create `lib/auth/server.ts` with shared implementation
- **Action**: Replace all 5 copies with `import { requireUserId } from "@/lib/auth/server"`
- **Verify**: `npm run build` succeeds, type check passes

### 2.2 Add error logging to all bare `catch { }` blocks

- **Files**: All 5 action files + all API route files
- **Action**: Replace every `catch { return { success: false, error: "..." } }` with:
  ```ts
  catch (error) {
    console.error("[ServerAction] Failed to X:", error);
    return { success: false, error: "..." };
  }
  ```
- **Scope**: ~20 bare catch blocks across `boards.ts`, `entries.ts`, `board-tasks.ts`, `api-tokens.ts`, `trackers.ts`, and all `app/api/v1/` routes
- **Verify**: No regression in error responses

### 2.3 Fix `as unknown as` double casts in boards/board-tasks

- **Files**: `app/actions/boards.ts` (lines 87, 118), `app/actions/board-tasks.ts` (lines 90, 131)
- **Action**: Replace `as unknown as Board[]` with proper typing via Prisma's `Select` or `Include` types
- **Verify**: TypeScript compiles without `as` on these lines

### 2.4 Fix unsafe `as Tracker` casts in page components

- **Files**: `app/(secured)/trackers/[id]/page.tsx` (line 23), `app/(secured)/trackers/[id]/edit/page.tsx` (line 20)
- **Action**: Check `result.success` before accessing `result.data`, since `data` could be a string (error message) when `success: false`
- **Verify**: Page renders correctly, error states handled

---

## Phase 3: Missing Validation (Medium) ✅ DONE

### 3.1 Add Zod validation to entry action functions ✅

- **File**: `app/actions/entries.ts`
- **Current state**: 10+ functions accept raw parameters without validation
- **Action**: Add `z.string().min(1)` validation for all `id`/`trackerId` params
- **Verify**: Invalid inputs return proper error responses

### 3.2 Add Zod validation to board action functions

- **File**: `app/actions/boards.ts`
- **Action**: Add validation for `boardId`, `columnId` params
- **Verify**: Same as above

### 3.3 Add Zod validation to board-tasks and users

- **Files**: `app/actions/board-tasks.ts`, `app/actions/users.ts`
- **Action**: Add validation for `taskId`, `boardId`, `columnId`, `query` params
- **Verify**: Same as above

---

## Phase 4: Code Organization (Medium-Hard) ✅ DONE

### 4.1 Split `entries.ts` (1223 lines) into focused modules

- Split into: create.ts, update.ts, delete.ts, queries.ts, timer.ts, index.ts
- **Verify**: All imports updated, `npm run build` succeeds

### 4.2 Split `trackers.ts` (596 lines)

- Split into: crud.ts, list.ts, index.ts
- **Verify**: Same as above

---

## Phase 5: Accessibility (Low-Medium) ✅ DONE

### 5.1 Add missing ARIA attributes ✅

- **Files**: `TrackerFilters.tsx`, `OfflineIndicator.tsx`, `table.tsx`, `TaskCard.tsx`
- **Actions**: Add `<label>` with `htmlFor`, `alt` on images, `scope="col"` on `<th>`, `aria-label` on draggable elements
- **Verify**: No a11y regressions

---

## Phase 6: Hardcoded Colors (Tedious, Low Risk) ✅ DONE

### 6.1 Replace hardcoded colors with Tailwind theme tokens ✅

- **Files**: ~15 files with hardcoded `border-gray-300` / `dark:border-gray-700` patterns
- **Action**: Replace with `border-border`, `bg-muted`, `text-muted-foreground`
- **Note**: Chart colors (TrackerStatsChart, TrendChart) are intentionally semantic — keep as-is
- **Verify**: Visual regression in light/dark modes

---

## Phase 7: Component Consolidation (Long-term)

### 7.1 Consolidate tracker type components

- **Files**: 5 tracker type components in `types/` sharing identical patterns
- **Action**: Extract shared logic into `useTrackerEntries` hook + `<TrackerEntryList>` component
- **Verify**: Each tracker type still renders correctly

### 7.2 Extract inline SVG icons from layout

- **File**: `app/(secured)/layout.tsx` (lines 288-363)
- **Action**: Extract icon SVGs to `components/icons/`
- **Verify**: Sidebar renders correctly

---

## Status Tracking

| Phase                                | Status      | Priority      | Effort   | Notes                                                                     |
| ------------------------------------ | ----------- | ------------- | -------- | ------------------------------------------------------------------------- |
| **Phase 1: Dead Code**               | ✅ Done     | P0            | ~15 min  | Deleted useTracker.ts, 6 dead types, 5 unused UI files, withErrorHandling |
| **Phase 2: Error Handling**          | ✅ Done     | P0 (critical) | ~45 min  | Centralized requireUserId, added logging, fixed casts                     |
| **Phase 3: Missing Validation**      | ✅ Done     | P1            | ~30 min  | Added Zod schemas to entry/board actions                                  |
| **Phase 4: Code Organization**       | ✅ Done     | P1 (hard)     | ~2 hours | Split entries.ts and trackers.ts                                          |
| **Phase 5: Accessibility**           | ✅ Done     | P2            | ~30 min  | ARIA labels, alt text, scope attrs                                        |
| **Phase 6: Hardcoded Colors**        | ✅ Done     | P2            | ~1 hour  | Replaced all gray theme tokens                                            |
| **Phase 7: Component Consolidation** | Not started | P3            | ~2 hours | Extract shared tracker entry logic                                        |

---

## Verification Checklist

- [x] `npm run build` succeeds after each phase
- [x] `npx tsc --noEmit` passes (zero non-test errors) after each phase
- [ ] `npm run test` passes after each phase
- [ ] `npm run test:e2e` passes after phases touching user flows (Phases 2, 4, 7)
- [ ] Manual visual check in light/dark modes after Phase 6
- [x] No new TypeScript errors introduced
