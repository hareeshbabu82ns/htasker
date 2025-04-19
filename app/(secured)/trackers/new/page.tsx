import TrackerForm from "@/components/features/trackers/TrackerForm";
import Link from "next/link";

export default function NewTrackerPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
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
        <h1 className="text-2xl font-semibold mt-1">Create a New Tracker</h1>
      </div>

      {/* Info box */}
      <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
        <div className="flex items-start">
          <div className="mr-3 text-primary">
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
                d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-primary">Choose the right tracker type</h3>
            <p className="text-sm text-foreground/80 mt-1">
              Each tracker type is designed for specific tracking needs. Once selected, the tracker type cannot be changed.
            </p>
          </div>
        </div>
      </div>

      {/* Tracker form */}
      <div className="bg-background border border-border p-6 rounded-lg">
        <TrackerForm />
      </div>
    </div>
  );
}