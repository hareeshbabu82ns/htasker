# HTracker — Copilot Instructions

## Project Overview

HTracker is a full-stack tracking app (time, counters, amounts, occurrences, custom metrics) built with Next.js App Router.

## Tech Stack

- **Framework**: Next.js 15+ (App Router, Server Actions, Turbopack)
- **Language**: TypeScript 5+ (strict mode)
- **Styling**: Tailwind CSS
- **Database**: Prisma with MongoDB
- **Forms**: react-hook-form + zod validation
- **UI**: shadcn/ui (new-york style) + Radix UI + Lucide React icons
- **State**: TanStack React Query v5+ and Zustand 5
- **Theme**: next-themes — dark (slate-800–950) / light (indigo-500–700)

## Key References

- **Data models & types**: `types/index.ts`
- **DB schema**: `prisma/schema.prisma`
- **Feature requirements**: `docs/PRD.md`
- **Server actions**: `app/actions/`
- **Prisma client**: `lib/db/prisma.ts`

## Architecture

```
app/              # App Router routes
  (auth)/         # Auth routes (login, register)
  (secured)/      # Authenticated routes (dashboard, trackers)
  actions/        # Server Actions (all DB operations here)
components/
  ui/             # shadcn/ui components
  features/       # Feature-specific components
hooks/            # Custom React hooks
lib/              # Utilities and shared code
types/            # TypeScript type definitions
config/           # App configuration
```

## Coding Conventions

### TypeScript

- Never use `any` — use `unknown` + type guards instead
- Prefer type guards over type assertions (`as`)
- All component props must have an explicit interface/type (not inline)
- Handle `null` and `undefined` distinctly (don't rely on falsy checks)
- Use discriminated unions for state and action responses

### Server Actions Pattern

All DB operations use Next.js server actions in `app/actions/` — never API routes. Every action must:

1. Start with `"use server"`
2. Validate input with zod
3. Return discriminated union: `{ status: "success"; data: T } | { status: "error"; error: string }`
4. Catch zod errors separately from general errors

Client-side calls use TanStack Query `useMutation`, checking `data.status` in `onSuccess` to handle both success and validation errors.

### Forms

- Always use `react-hook-form` with `zodResolver`
- Mirror the zod schema from the corresponding server action

### Components

- Do not use `React.FC` — define props interface and destructure in function signature
- Use shadcn/ui components; do not introduce alternative UI libraries
- Mobile-first responsive design with Tailwind breakpoints
- WCAG 2.1 AA: semantic HTML, ARIA attributes, 4.5:1 contrast, keyboard navigation
