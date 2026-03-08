"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getTrackers } from "@/app/actions/trackers";
import type { TrackerWithEntriesCount } from "@/app/actions/trackers";

const TYPE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  TIMER: "default",
  COUNTER: "secondary",
  AMOUNT: "outline",
  OCCURRENCE: "outline",
};

export default function TopTrackers() {
  const [trackers, setTrackers] = useState<TrackerWithEntriesCount[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTopTrackers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getTrackers({ limit: 1000 });
      if (!response.success) return;

      const active = response.data.trackers.filter((t) => t.status !== "ARCHIVED");
      const sorted = [...active].sort((a, b) => b.entriesCount - a.entriesCount);
      setTrackers(sorted.slice(0, 5));
    } catch (error) {
      console.error("Failed to fetch top trackers:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTopTrackers();
  }, [fetchTopTrackers]);

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Top Trackers</h2>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            By number of entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          ) : !trackers || trackers.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">No trackers found.</p>
          ) : (
            <ol className="divide-border divide-y">
              {trackers.map((tracker, index) => (
                <li key={tracker.id}>
                  <Link
                    href={`/trackers/${tracker.id}`}
                    className="hover:bg-muted/50 -mx-2 flex items-center justify-between rounded-md px-2 py-3 transition-colors"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="text-muted-foreground w-5 shrink-0 text-sm font-medium">
                        {index + 1}.
                      </span>
                      <span className="truncate text-sm font-medium">{tracker.name}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <Badge variant={TYPE_VARIANT[tracker.type] ?? "outline"}>
                        {tracker.type}
                      </Badge>
                      <span className="text-muted-foreground w-16 text-right text-sm">
                        {tracker.entriesCount} entries
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
