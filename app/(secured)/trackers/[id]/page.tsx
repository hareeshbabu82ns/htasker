import { Button } from "@/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";
import TrackerView from "@/components/features/trackers/TrackerView";
import { getTracker } from "@/app/actions/trackers";
import { Tracker } from "@/types";
import DeleteTrackerButton from "@/components/features/trackers/DeleteTrackerButton";
import GoalForm from "@/components/features/trackers/GoalForm";
import GoalProgress from "@/components/features/trackers/GoalProgress";
import TrackerDetailCharts from "@/components/features/trackers/TrackerDetailCharts";

export default async function TrackerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;

  // Fetch the tracker by ID
  const response = await getTracker(resolvedParams.id);

  // Handle not found
  if (!response.success) {
    return notFound();
  }

  const tracker = response.data as Tracker;

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
          <h1 className="mt-1 text-2xl font-semibold">Tracker Details</h1>
        </div>

        <div className="flex gap-2">
          <Link href={`/trackers/${resolvedParams.id}/edit`}>
            <Button variant="outline">Edit</Button>
          </Link>
          <DeleteTrackerButton trackerId={resolvedParams.id} />
        </div>
      </div>

      {/* Tracker status indicator */}
      <div className="bg-background border-border rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                tracker.status === "ACTIVE"
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
                  : "Archived"}
            </span>
          </div>

          <div className="text-foreground/70 flex items-center text-sm">
            <span>Last updated: {new Date(tracker.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Tracker stats chart, trend chart, and calendar heatmap */}
      <TrackerDetailCharts
        trackerId={resolvedParams.id}
        trackerType={tracker.type}
        tracker={tracker}
      />

      {/* Goal setting and progress */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <GoalForm tracker={tracker} />
        {tracker.goalEnabled && <GoalProgress tracker={tracker} />}
      </div>

      {/* Tracker view component */}
      <TrackerView tracker={tracker} />
    </div>
  );
}
