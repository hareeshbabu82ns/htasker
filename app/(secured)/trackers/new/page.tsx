import TrackerForm from "@/components/features/trackers/TrackerForm";
import Link from "next/link";
import { TrackerType } from "@/types";

const VALID_TRACKER_TYPES = new Set<string>(Object.values(TrackerType));

export default async function NewTrackerPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const rawType =
    typeof resolvedParams.type === "string" ? resolvedParams.type.toUpperCase() : undefined;
  const preselectedType: TrackerType | undefined =
    rawType && VALID_TRACKER_TYPES.has(rawType) ? (rawType as TrackerType) : undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/trackers"
          className="text-foreground/70 hover:text-foreground flex items-center gap-1 text-sm"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-4 w-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
            />
          </svg>
          Back to trackers
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Create a New Tracker</h1>
      </div>

      {/* Tracker form */}
      <div className="bg-background border-border rounded-lg border p-6">
        <TrackerForm initialData={preselectedType ? { type: preselectedType } : undefined} />
      </div>
    </div>
  );
}
