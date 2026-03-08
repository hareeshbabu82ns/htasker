"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgeDollarSign, CalendarRange, Clock, Hash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getTrackers } from "@/app/actions/trackers";
import { formatDuration } from "@/lib/utils";
import { TrackerType } from "@/types";
import type { TrackerStatistics } from "@/app/actions/trackers";

interface TypeCardData {
  type: TrackerType;
  label: string;
  count: number;
  detail: string;
  icon: React.ReactNode;
}

interface TypeCardProps {
  data: TypeCardData;
}

function TypeCard({ data }: TypeCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{data.label}</CardTitle>
        <div className="text-muted-foreground">{data.icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{data.count}</div>
        <p className="text-muted-foreground mt-1 text-xs">{data.detail}</p>
      </CardContent>
    </Card>
  );
}

export default function StatsBreakdown() {
  const [cards, setCards] = useState<TypeCardData[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBreakdown = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getTrackers({ limit: 1000 });
      if (!response.success) return;

      const { trackers } = response.data;
      const active = trackers.filter((t) => t.status !== "ARCHIVED");

      const byType = (type: TrackerType) => active.filter((t) => t.type === type);

      const timerTrackers = byType(TrackerType.TIMER);
      const totalTimerSeconds = timerTrackers.reduce((sum, t) => {
        const s = t.statistics as TrackerStatistics | null;
        return sum + (s?.totalTime ?? 0);
      }, 0);

      const counterTrackers = byType(TrackerType.COUNTER);
      const totalCounterEntries = counterTrackers.reduce((sum, t) => {
        const s = t.statistics as TrackerStatistics | null;
        return sum + (s?.totalEntries ?? 0);
      }, 0);

      const amountTrackers = byType(TrackerType.AMOUNT);
      const occurrenceTrackers = byType(TrackerType.OCCURRENCE);

      setCards([
        {
          type: TrackerType.TIMER,
          label: "Timer",
          count: timerTrackers.length,
          detail: `Total tracked: ${formatDuration(totalTimerSeconds)}`,
          icon: <Clock className="h-4 w-4" />,
        },
        {
          type: TrackerType.COUNTER,
          label: "Counter",
          count: counterTrackers.length,
          detail: `Total entries: ${totalCounterEntries}`,
          icon: <Hash className="h-4 w-4" />,
        },
        {
          type: TrackerType.AMOUNT,
          label: "Amount",
          count: amountTrackers.length,
          detail: "Monetary / numeric tracking",
          icon: <BadgeDollarSign className="h-4 w-4" />,
        },
        {
          type: TrackerType.OCCURRENCE,
          label: "Occurrence",
          count: occurrenceTrackers.length,
          detail: "Date-based event tracking",
          icon: <CalendarRange className="h-4 w-4" />,
        },
      ]);
    } catch (error) {
      console.error("Failed to fetch stats breakdown:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBreakdown();
  }, [fetchBreakdown]);

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Tracker Types</h2>
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(cards ?? []).map((card) => (
            <TypeCard key={card.type} data={card} />
          ))}
        </div>
      )}
    </section>
  );
}
