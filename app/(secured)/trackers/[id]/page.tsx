import { Button } from "@/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";
import TrackerView from "@/components/features/trackers/TrackerView";
import { getTracker } from "@/app/actions/trackers";
import { Tracker } from "@/types";
import DeleteTrackerButton from "@/components/features/trackers/DeleteTrackerButton";

export default async function TrackerDetailPage( {
  params,
}: {
  params: { id: string };
} ) {
  // Fetch the tracker by ID
  const response = await getTracker( params.id );

  // Handle not found
  if ( !response.success ) {
    return notFound();
  }

  const tracker = response.data as Tracker;

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <Link
            href="/trackers"
            className="text-sm text-foreground/70 hover:text-foreground flex items-center gap-1"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
              />
            </svg>
            Back to trackers
          </Link>
          <h1 className="text-2xl font-semibold mt-1">Tracker Details</h1>
        </div>

        <div className="flex gap-2">
          <Link href={`/trackers/${params.id}/edit`} passHref>
            <Button variant="outline">Edit</Button>
          </Link>
          <DeleteTrackerButton trackerId={params.id} />
        </div>
      </div>

      {/* Tracker status indicator */}
      <div className="bg-background border border-border p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${tracker.status === "ACTIVE"
                ? "bg-green-500"
                : tracker.status === "INACTIVE"
                  ? "bg-yellow-500"
                  : "bg-gray-500"
                }`}
            ></div>
            <span className="text-sm font-medium">
              {tracker.status === "ACTIVE"
                ? "Active"
                : tracker.status === "INACTIVE"
                  ? "Inactive"
                  : "Archived"
              }
            </span>
          </div>

          <div className="flex items-center text-sm text-foreground/70">
            <span>
              Last updated: {new Date( tracker.updatedAt ).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Tracker view component */}
      <TrackerView tracker={tracker} />
    </div>
  );
}