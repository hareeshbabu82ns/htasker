"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import { getTrackers, TrackerWithEntriesCount } from "@/app/actions/trackers";
import { exportTrackerCSV } from "@/app/actions/entries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

// Map tracker types to display-friendly labels
const TYPE_LABELS: Record<string, string> = {
  TIMER: "Timer",
  COUNTER: "Counter",
  AMOUNT: "Amount",
  OCCURRENCE: "Occurrence",
  CUSTOM: "Custom",
};

export default function ExportSection() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState<Set<string>>(new Set());

  const { data, isLoading, isError } = useQuery({
    queryKey: ["trackers", "export-list"],
    queryFn: async () => {
      const res = await getTrackers({});
      if (!res.success) throw new Error(res.error);
      return res.data.trackers;
    },
  });

  const trackers: TrackerWithEntriesCount[] = data ?? [];

  function toggleTracker(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === trackers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(trackers.map((t) => t.id)));
    }
  }

  async function handleExport() {
    if (selected.size === 0) return;

    const ids = Array.from(selected);
    setExporting(new Set(ids));

    const results = await Promise.allSettled(
      ids.map(async (id) => {
        const res = await exportTrackerCSV(id);
        if (!res.success) throw new Error(res.error);
        const { csv, filename } = res.data;

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        return filename;
      })
    );

    setExporting(new Set());

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    if (succeeded > 0) {
      toast.success(
        succeeded === 1
          ? "Exported 1 tracker"
          : `Exported ${succeeded} trackers`
      );
    }
    if (failed > 0) {
      toast.error(
        failed === 1
          ? "1 export failed"
          : `${failed} exports failed`
      );
    }
  }

  const isExporting = exporting.size > 0;
  const allSelected = trackers.length > 0 && selected.size === trackers.length;
  const someSelected = selected.size > 0 && selected.size < trackers.length;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-destructive">
          Failed to load trackers. Please refresh and try again.
        </CardContent>
      </Card>
    );
  }

  if (trackers.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No trackers found. Create a tracker first to export data.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-medium">Select Trackers to Export</CardTitle>
        <Button
          onClick={handleExport}
          disabled={selected.size === 0 || isExporting}
          size="sm"
        >
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting…
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Export Selected ({selected.size})
            </>
          )}
        </Button>
      </CardHeader>

      <CardContent className="space-y-2">
        {/* Select all row */}
        <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2 bg-muted/40">
          <Checkbox
            id="select-all"
            checked={allSelected ? true : someSelected ? "indeterminate" : false}
            onCheckedChange={toggleAll}
            disabled={isExporting}
          />
          <label
            htmlFor="select-all"
            className="flex-1 cursor-pointer text-sm font-medium select-none"
          >
            Select all trackers
          </label>
          <span className="text-xs text-muted-foreground">
            {trackers.length} total
          </span>
        </div>

        {/* Tracker rows */}
        {trackers.map((tracker) => {
          const isTrackerExporting = exporting.has(tracker.id);
          return (
            <div
              key={tracker.id}
              className="flex items-center gap-3 rounded-md border border-border px-3 py-2 hover:bg-muted/30 transition-colors"
            >
              <Checkbox
                id={`tracker-${tracker.id}`}
                checked={selected.has(tracker.id)}
                onCheckedChange={() => toggleTracker(tracker.id)}
                disabled={isExporting}
              />
              <label
                htmlFor={`tracker-${tracker.id}`}
                className="flex flex-1 items-center gap-2 cursor-pointer select-none min-w-0"
              >
                <span className="truncate text-sm font-medium">
                  {tracker.name}
                </span>
                <Badge variant="secondary" className="shrink-0 text-xs">
                  {TYPE_LABELS[tracker.type] ?? tracker.type}
                </Badge>
              </label>
              <div className="flex items-center gap-2 shrink-0">
                {isTrackerExporting && (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                )}
                <span className="text-xs text-muted-foreground">
                  {tracker.entriesCount}{" "}
                  {tracker.entriesCount === 1 ? "entry" : "entries"}
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
