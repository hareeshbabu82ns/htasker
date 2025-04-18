# Copilot Instructions for HTracker - Tracking Anything Application

## Project Overview

HTracker is a full-stack responsive web application built on NextJS that allows users to track various metrics including time, counters, amounts, prices, and custom events.

basic next app created using command

```sh
npx create-next-app@latest . --typescript --tailwind --eslint --app --use-npm
```

## Technical Stack

### Core Technologies

- **Frontend Framework**: NextJS 14+ with App Router architecture
- **Language**: TypeScript 5.0+ (strict mode enabled)
- **Styling**: Tailwind CSS 3.3+ with custom configuration
- **Database ORM**: Prisma with MongoDB
- **Form Management**: react-hook-form v7+ with zod validation
- **Theme Management**: next-themes for dark/light mode support
- **UI Component Library**: HeroUI for React components
- **State Management**: React Context API and React Query v5+

## Architecture

### Folder Structure

```
htracker/
├── app/                    # App Router routes
│   ├── api/                # API routes
│   ├── (auth)/             # Authentication routes (grouped)
│   ├── dashboard/          # Dashboard routes
│   └── ...
├── components/             # React components
│   ├── ui/                 # Reusable UI components
│   └── features/           # Feature-specific components
├── lib/                    # Utility functions and shared code
├── types/                  # TypeScript type definitions
├── hooks/                  # Custom React hooks
├── config/                 # App configuration
└── public/                 # Static assets
```

### Development Requirements

- ESLint with typescript-eslint plugin
- Prettier for code formatting
- Husky for git hooks
- Jest and React Testing Library for tests

## TypeScript Best Practices

### Type Safety

- Use `strict: true` in tsconfig.json
- Avoid `any` type - use `unknown` when type is uncertain
- Leverage TypeScript utility types: `Partial<T>`, `Pick<T>`, `Omit<T>`, `Record<K,T>`
- Create type guards for runtime type checking:
  ```typescript
  function isTrackerType(value: unknown): value is TrackerType {
    return Object.values(TrackerType).includes(value as TrackerType);
  }
  ```
- Use discriminated unions for state management:
  ```typescript
  type TrackerState =
    | { status: "loading" }
    | { status: "error"; error: Error }
    | { status: "success"; data: Tracker };
  ```

### React Component Typing

- Define proper prop types for all components:

  ```typescript
  type ButtonProps = {
    variant: "primary" | "secondary" | "ghost";
    size?: "sm" | "md" | "lg";
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  };

  function Button({
    variant,
    size = "md",
    children,
    onClick,
    disabled,
  }: ButtonProps) {
    // Component implementation
  }
  ```

- Use React.FC sparingly (prefer explicit return types)
- Type event handlers correctly:
  ```typescript
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  };
  ```

### NextJS-Specific Types

- Use built-in Next.js types:
  ```typescript
  import { GetServerSideProps, NextPage } from "next";
  import { AppProps } from "next/app";
  ```
- Type API routes correctly with proper request/response handling:

  ```typescript
  import type { NextApiRequest, NextApiResponse } from "next";

  export default function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data | ErrorResponse>
  ) {
    // Implementation
  }
  ```

- For App Router, use proper types for Server Components vs Client Components:

  ```typescript
  // For server components (RSC)
  export default async function DashboardPage({
    params,
  }: {
    params: { id: string };
  }) {
    // Server component logic
  }

  // For client components
  ("use client");

  export default function TrackerForm({
    initialData,
  }: {
    initialData?: Tracker;
  }) {
    // Client component logic
  }
  ```

### Common TypeScript Pitfalls

- Avoid type assertions (`as`) when possible; prefer type guards
- Beware of falsy values in optional chaining: use `data?.value !== undefined ? data.value : defaultValue`
- Handle null and undefined distinctly:

  ```typescript
  // Incorrect
  function process(value: string | null | undefined) {
    if (!value) {
      /* Handles '', null, undefined */
    }
  }

  // Correct
  function process(value: string | null | undefined) {
    if (value === null || value === undefined) {
      /* Only null and undefined */
    }
    // Then handle empty string separately if needed
  }
  ```

- Take care with generics in async functions:
  ```typescript
  // Specify the return type explicitly
  async function fetchTracker<T = Tracker>(id: string): Promise<T> {
    // Implementation
  }
  ```

## Data Models

### Tracker Model

```typescript
enum TrackerType {
  TIMER, // Start/stop with duration tracking
  COUNTER, // Increment/decrement tracking
  AMOUNT, // Numerical value tracking (e.g. money)
  OCCURRENCE, // Date-based event tracking
  CUSTOM, // User-defined tracking
}

enum TrackerStatus {
  ACTIVE, // Currently running (for timers)
  INACTIVE, // Not running but available
  ARCHIVED, // No longer in use
}

interface Tracker {
  id: string;
  name: string;
  description?: string;
  type: TrackerType;
  status: TrackerStatus;
  tags: string[];
  color?: string; // Hex color code
  icon?: string; // Icon identifier
  createdAt: Date;
  updatedAt: Date;
  userId: string; // Owner of the tracker
}
```

### Entry Model

```typescript
interface TrackerEntry {
  id: string;
  trackerId: string;
  startTime?: Date; // For timer type
  endTime?: Date; // For timer type
  value?: number; // For counter/amount type
  date: Date; // Timestamp of entry
  note?: string; // Optional user note
  tags: string[]; // Entry-specific tags
  createdAt: Date;
}
```

## Feature Specifications

### Authentication System

- Email/password authentication
- OAuth providers (Google, GitHub)
- JWT token-based session management
- Protected routes with middleware
- User profile management

### Theme Implementation

- Dark/light mode toggle using next-themes
- Dark mode: Tailwind slate color palette (slate-800 to slate-950 backgrounds)
- Light mode: Indigo accents (indigo-500 to indigo-700)
- Theme persistence in localStorage
- System preference detection
- CSS variables for theme colors

### Dashboard Requirements

- **Layout**:

  - Responsive grid layout with 1, 2, or 3 columns based on viewport
  - Sidebar navigation (collapsible on mobile)
  - Header with user profile and theme toggle

- **Tracker Management**:

  - Create new tracker with type selection
  - Edit existing tracker properties
  - Archive/unarchive trackers
  - Duplicate tracker functionality
  - Batch operations support

- **Display Features**:
  - Grouping by status (Active, Recent, Archived)
  - Search by name, description, and tags with debouncing
  - Sort options: Recently used, Most tracked, Alphabetical
  - Filter by type, status, creation date, and tags
  - Pagination with configurable items per page (10/25/50)

### Tracker Interaction

- **Timer Type**:

  - Start/Stop buttons with visual indicators
  - Current session duration display
  - History of previous sessions
  - Daily/weekly/monthly totals

- **Counter Type**:

  - Increment/Decrement buttons with animation
  - Current value display
  - History of changes with timestamps
  - Reset functionality

- **Amount Type**:

  - Input field with currency/unit selection
  - Running total calculation
  - Transaction history view
  - Support for negative values

- **Occurrence Type**:
  - Date/time selector with calendar
  - Frequency visualization (daily, weekly, monthly)
  - Streak tracking
  - Next occurrence prediction

### Statistics and Analytics

- Daily/weekly/monthly usage charts
- Tracker comparison views
- Exportable reports (CSV, PDF)
- Custom date range selection
- Goal setting and progress tracking

## Technical Implementation Details

### Server Actions

- Use NextJS server actions instead of API routes for all Prisma operations
- Implement proper error handling and type safety
- Example pattern:

  ```typescript
  "use server";

  import { z } from "zod";

  // Define a response type for better type safety
  type CreateTrackerResponse =
    | { success: true; tracker: Tracker }
    | { success: false; error: string };

  const CreateTrackerSchema = z.object({
    name: z.string().min(1).max(50),
    type: z.enum(["TIMER", "COUNTER", "AMOUNT", "OCCURRENCE", "CUSTOM"]),
    // other fields...
  });

  export async function createTracker(
    formData: FormData
  ): Promise<CreateTrackerResponse> {
    try {
      const validatedFields = CreateTrackerSchema.parse({
        name: formData.get("name"),
        type: formData.get("type"),
        // other fields...
      });

      // Prisma create operation
      const tracker = await db.tracker.create({ data: validatedFields });
      return { success: true, tracker };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error:
            "Validation failed: " +
            error.errors.map((e) => e.message).join(", "),
        };
      }
      return { success: false, error: "Failed to create tracker" };
    }
  }
  ```

### Form Implementation

- Use `react-hook-form` with zod validation
- Controlled inputs with immediate feedback
- Form state persistence during navigation
- Auto-save functionality where appropriate
- Example pattern:

  ```typescript
  interface TrackerFormValues {
    name: string;
    description?: string;
    type: TrackerType;
    tags: string[];
    // other fields...
  }

  const trackerFormSchema = z.object({
    name: z.string().min(1, "Name is required").max(50),
    description: z.string().max(200).optional(),
    type: z.nativeEnum(TrackerType),
    tags: z.array(z.string()).optional(),
    // other validations...
  });

  function TrackerForm() {
    const form = useForm<TrackerFormValues>({
      resolver: zodResolver(trackerFormSchema),
      defaultValues: {
        name: "",
        type: TrackerType.TIMER,
        tags: [],
      },
    });

    // Form implementation...
  }
  ```

### React/NextJS Performance Optimization

- Avoid unnecessary re-renders:

  ```typescript
  // Use memo for expensive calculations
  const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b]);

  // Use useCallback for functions passed as props
  const memoizedCallback = useCallback(() => {
    doSomething(count);
  }, [count]);

  // Use memo for components that render often
  const MemoizedComponent = memo(MyComponent);
  ```

- Implement proper key strategies for lists:

  ```typescript
  // Good: Using unique IDs
  {
    items.map((item) => <ListItem key={item.id} {...item} />);
  }

  // Bad: Using index as key when list order changes
  {
    items.map((item, index) => <ListItem key={index} {...item} />);
  }
  ```

- Implement debouncing for search inputs and frequent events:

  ```typescript
  function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);

    return debouncedValue;
  }
  ```

### Responsive Design Specifications

- Mobile-first approach using Tailwind breakpoints
- Layouts:
  - Mobile (< 640px): Single column, collapsible sections
  - Tablet (640px - 1024px): Two columns, sidebar navigation
  - Desktop (> 1024px): Three columns, full dashboard view
- Touch targets minimum 44×44 pixels on mobile
- Swipe gestures for common actions on mobile

### Error Handling

- Form validation errors with field-level feedback
- API error responses with typed error objects:

  ```typescript
  // Define error types
  type ApiError =
    | { code: "UNAUTHORIZED"; message: string }
    | {
        code: "VALIDATION_ERROR";
        message: string;
        fields: Record<string, string>;
      }
    | { code: "SERVER_ERROR"; message: string };

  // Type-safe error handling
  try {
    const data = await apiCall();
    // Handle success
  } catch (error) {
    if (isApiError(error)) {
      switch (error.code) {
        case "UNAUTHORIZED":
          // Handle unauthorized
          break;
        case "VALIDATION_ERROR":
          // Handle validation errors with field specificity
          break;
        case "SERVER_ERROR":
          // Handle server error
          break;
      }
    }
  }
  ```

- Global error boundary components
- Fallback UI components for each major feature
- Offline detection and data synchronization

### Accessibility Requirements

- WCAG 2.1 AA compliance target
- Semantic HTML structure throughout
- ARIA attributes for all interactive elements
- Focus management for modals and dialogs
- Keyboard navigation support (tab order, shortcuts)
- Minimum contrast ratio of 4.5:1 for all text
- Screen reader compatible components

## Performance Optimization

- Component code splitting with dynamic imports
- Image optimization with Next/Image
- Incremental Static Regeneration where applicable
- Memoization of expensive calculations
- Virtualized lists for large datasets
- Optimistic UI updates for immediate feedback
- Minimum contrast ratio of 4.5:1 for text
