import TrackerComparison from "@/components/features/trackers/TrackerComparison";

export default function TrackerComparePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Compare Trackers</h1>
        <p className="text-foreground/70 mt-1">
          Select trackers to compare their activity side by side
        </p>
      </div>
      <TrackerComparison />
    </div>
  );
}
