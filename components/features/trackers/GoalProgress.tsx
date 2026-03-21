"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Tracker } from "@/types";
import { getTrackerTrend } from "@/app/actions/entries";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function getPeriodDates(period: string): { start: Date; end: Date; label: string } {
  const today = new Date();

  switch (period) {
    case "daily": {
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const end = new Date(start);
      return { start, end, label: "Today" };
    }
    case "weekly": {
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      return { start, end, label: "This week" };
    }
    case "monthly":
    default: {
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const start = new Date(end);
      start.setDate(end.getDate() - 29);
      return { start, end, label: "This month" };
    }
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface GoalProgressProps {
  tracker: Tracker;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function GoalProgress({ tracker }: GoalProgressProps) {
  // Guard — caller should check this, but be defensive
  if (!tracker.goalEnabled || !tracker.goalValue) return null;

  const goalValue = tracker.goalValue;
  const period = tracker.goalPeriod ?? "daily";
  const goalUnit = tracker.goalUnit ?? "";

  const { start, end, label } = useMemo(() => getPeriodDates(period), [period]);

  const {
    data: trendData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["trackerTrend", tracker.id, toLocalDateStr(start), toLocalDateStr(end)],
    queryFn: async () => {
      const timezoneOffset = new Date().getTimezoneOffset();
      const res = await getTrackerTrend(
        tracker.id,
        toLocalDateStr(start),
        toLocalDateStr(end),
        timezoneOffset
      );
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
  });

  // Sum all values for the period
  const currentValue = useMemo(() => {
    if (!trendData) return 0;
    return trendData.reduce((acc, point) => acc + point.value, 0);
  }, [trendData]);

  const percentage = Math.min(100, Math.round((currentValue / goalValue) * 100));
  const isGoalMet = currentValue >= goalValue;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="size-4" />
          Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ) : isError ? (
          <p className="text-muted-foreground text-sm">Failed to load progress data.</p>
        ) : (
          <>
            {/* Period label + status badge */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">{label}</span>
              {isGoalMet ? (
                <Badge className="gap-1 bg-green-500 text-white">
                  <CheckCircle2 className="size-3" />
                  Goal reached! 🎉
                </Badge>
              ) : (
                <Badge variant="secondary">{percentage}%</Badge>
              )}
            </div>

            {/* Progress bar */}
            <Progress
              value={percentage}
              className={isGoalMet ? "[&_[data-slot=progress-indicator]]:bg-green-500" : ""}
            />

            {/* Value text */}
            <p className="text-sm font-medium">
              {Number.isInteger(currentValue) ? currentValue : currentValue.toFixed(2)} /{" "}
              {Number.isInteger(goalValue) ? goalValue : goalValue.toFixed(2)} {goalUnit}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
