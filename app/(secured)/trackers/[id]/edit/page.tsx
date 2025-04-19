import TrackerForm from "@/components/features/trackers/TrackerForm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTracker } from "@/app/actions/trackers";
import { Tracker, TrackerFormValues } from "@/types";

export default async function EditTrackerPage( {
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

  // Prepare form values from the tracker data
  const initialData: TrackerFormValues = {
    name: tracker.name,
    description: tracker.description || undefined,
    type: tracker.type,
    tags: tracker.tags || [],
    color: tracker.color || undefined,
    icon: tracker.icon || undefined,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/trackers/${params.id}`}
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
          Back to tracker details
        </Link>
        <h1 className="text-2xl font-semibold mt-1">Edit Tracker</h1>
      </div>

      {/* Info box */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 p-4 rounded-lg">
        <div className="flex items-start">
          <div className="mr-3 text-amber-600 dark:text-amber-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-amber-800 dark:text-amber-400">Edit with caution</h3>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Tracker type cannot be changed after creation. All other properties can be modified.
            </p>
          </div>
        </div>
      </div>

      {/* Tracker form */}
      <div className="bg-background border border-border p-6 rounded-lg">
        <TrackerForm
          initialData={initialData}
          trackerId={params.id}
        />
      </div>
    </div>
  );
}