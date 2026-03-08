import SummaryStats from "@/components/features/dashboard/SummaryStats";
import StatsBreakdown from "@/components/features/stats/StatsBreakdown";
import TopTrackers from "@/components/features/stats/TopTrackers";

export default function StatsPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold">Statistics</h1>
        <p className="text-muted-foreground mt-1">Overview of your tracking activity</p>
      </div>

      {/* Summary stats (Total Trackers, Active Timers, Total Entries, Total Time) */}
      <SummaryStats />

      {/* Tracker type breakdown */}
      <StatsBreakdown />

      {/* Top trackers by entry count */}
      <TopTrackers />
    </div>
  );
}
