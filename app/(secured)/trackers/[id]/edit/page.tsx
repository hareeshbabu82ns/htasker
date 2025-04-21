import TrackerForm from "@/components/features/trackers/TrackerForm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTracker } from "@/app/actions/trackers";
import { Tracker, TrackerFormValues } from "@/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TriangleAlert } from "lucide-react";

export default async function EditTrackerPage( {
  params,
}: {
  params: Promise<{ id: string }>;
} ) {
  const resolvedParams = await params;

  // Fetch the tracker by ID
  const response = await getTracker( resolvedParams.id );

  // Handle not found
  if ( !response.success ) {
    return notFound();
  }

  const tracker = response.data as Tracker;

  // Prepare form values from the tracker data
  // Ensure initialData matches the expected type for the form, including status
  const initialData: TrackerFormValues = {
    name: tracker.name,
    description: tracker.description || undefined,
    type: tracker.type,
    status: tracker.status, // Add status here
    tags: tracker.tags || [],
    color: tracker.color || undefined,
    icon: tracker.icon || undefined,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/trackers/${resolvedParams.id}`}
          className="text-sm text-foreground/70 hover:text-foreground flex items-center gap-1"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24" strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
            />
          </svg>
          Back to tracker details
        </Link>
        <h1 className="text-2xl font-semibold mt-1">Edit Tracker</h1>
      </div>

      {/* Info box */}
      <Alert variant="warning">
        <TriangleAlert className="h-6 w-6" />
        <AlertTitle className="text-lg">Edit with caution</AlertTitle>
        <AlertDescription>
          Tracker type cannot be changed after creation. All other properties can be modified.
        </AlertDescription>
      </Alert>

      {/* Tracker form */}
      <div className="bg-background border border-border p-6 rounded-lg">
        <TrackerForm
          initialData={initialData}
          trackerId={resolvedParams.id}
        />
      </div>
    </div>
  );
}