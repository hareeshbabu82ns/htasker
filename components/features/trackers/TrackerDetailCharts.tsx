"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Tracker } from "@/types";

const TrackerStatsChart = dynamic(
  () => import("@/components/features/trackers/TrackerStatsChart"),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full rounded-lg" />,
  }
);

const TrendChart = dynamic(
  () => import("@/components/features/trackers/TrendChart"),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full rounded-lg" />,
  }
);

const CalendarHeatmap = dynamic(
  () => import("@/components/features/trackers/CalendarHeatmap"),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full rounded-lg" />,
  }
);

interface TrackerDetailChartsProps {
  trackerId: string;
  trackerType: string;
  tracker: Tracker;
}

export default function TrackerDetailCharts({
  trackerId,
  trackerType,
  tracker,
}: TrackerDetailChartsProps) {
  return (
    <>
      <TrackerStatsChart trackerId={trackerId} trackerType={trackerType} />
      <TrendChart trackerId={trackerId} trackerType={trackerType} />
      <CalendarHeatmap tracker={tracker} />
    </>
  );
}
