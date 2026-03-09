"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Clock, ListChecks, RefreshCw, Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getTrackers } from "@/app/actions/trackers";
import { formatDuration } from "@/lib/utils";
import type { TrackerStatistics } from "@/app/actions/trackers";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}

function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

interface SummaryData {
  totalTrackers: number;
  activeTimers: number;
  totalEntries: number;
  totalTime: string;
}

export default function SummaryStats() {
  const [stats, setStats] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getTrackers({ limit: 1000 });
      if (!response.success) return;

      const { trackers } = response.data;
      const nonArchived = trackers.filter((t) => t.status !== "ARCHIVED");

      const totalTrackers = nonArchived.length;
      const activeTimers = nonArchived.filter(
        (t) => t.type === "TIMER" && t.status === "ACTIVE"
      ).length;
      const totalEntries = nonArchived.reduce((sum, t) => {
        const s = t.statistics as TrackerStatistics | null;
        return sum + (s?.totalEntries ?? 0);
      }, 0);
      const totalTimeSeconds = nonArchived
        .filter((t) => t.type === "TIMER")
        .reduce((sum, t) => {
          const s = t.statistics as TrackerStatistics | null;
          return sum + (s?.totalTime ?? 0);
        }, 0);

      setStats({
        totalTrackers,
        activeTimers,
        totalEntries,
        totalTime: formatDuration(totalTimeSeconds),
      });
    } catch (error) {
      console.error("Failed to fetch summary stats:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Overview</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchStats}
          disabled={isLoading}
          aria-label="Refresh summary stats"
          className="h-8 w-8"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Trackers"
            value={stats?.totalTrackers ?? 0}
            icon={<Activity className="h-4 w-4" />}
          />
          <StatCard
            title="Active Timers"
            value={stats?.activeTimers ?? 0}
            icon={<Timer className="h-4 w-4" />}
          />
          <StatCard
            title="Total Entries"
            value={stats?.totalEntries ?? 0}
            icon={<ListChecks className="h-4 w-4" />}
          />
          <StatCard
            title="Total Time"
            value={stats?.totalTime ?? "0s"}
            icon={<Clock className="h-4 w-4" />}
          />
        </div>
      )}
    </section>
  );
}
