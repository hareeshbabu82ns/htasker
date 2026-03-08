"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, CheckSquare, RefreshCw, Trash2, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import TrackerCard from "@/components/features/trackers/TrackerCard";
import { TrackerWithEntriesCount, archiveTrackers, deleteTrackers } from "@/app/actions/trackers";
import { trackerKeys } from "@/hooks/queries/trackerQueries";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface TrackerListClientProps {
  trackers: TrackerWithEntriesCount[];
}

export default function TrackerListClient({ trackers }: TrackerListClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: trackerKeys.lists() });
    router.refresh();
  }, [queryClient, router]);

  const { containerProps, pullDistance, isRefreshing } = usePullToRefresh({
    onRefresh: handleRefresh,
    enabled: isMobile,
  });

  const toggleSelectMode = useCallback(() => {
    setIsSelectMode((prev) => !prev);
    setSelectedIds(new Set());
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleArchive = async () => {
    if (selectedIds.size === 0) return;
    setIsArchiving(true);
    try {
      const response = await archiveTrackers(Array.from(selectedIds));
      if (response.success) {
        toast.success(
          `${response.data.count} tracker${response.data.count !== 1 ? "s" : ""} archived`
        );
        setIsSelectMode(false);
        setSelectedIds(new Set());
        router.refresh();
      } else {
        toast.error(response.error ?? "Failed to archive trackers");
      }
    } catch {
      toast.error("Failed to archive trackers");
    } finally {
      setIsArchiving(false);
    }
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
      const response = await deleteTrackers(Array.from(selectedIds));
      if (response.success) {
        toast.success(
          `${response.data.count} tracker${response.data.count !== 1 ? "s" : ""} deleted`
        );
        setIsSelectMode(false);
        setSelectedIds(new Set());
        router.refresh();
      } else {
        toast.error(response.error ?? "Failed to delete trackers");
      }
    } catch {
      toast.error("Failed to delete trackers");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4" {...containerProps}>
      {/* Pull-to-refresh indicator */}
      {pullDistance > 20 && (
        <div
          className="flex justify-center py-2 transition-all"
          style={{ height: `${Math.min(pullDistance * 0.5, 40)}px` }}
        >
          <RefreshCw
            className={cn(
              "h-5 w-5 text-muted-foreground",
              isRefreshing && "animate-spin",
            )}
            style={{ transform: `rotate(${pullDistance * 2}deg)` }}
          />
        </div>
      )}
      {/* Select mode toggle */}
      <div className="flex justify-end">
        <Button
          variant={isSelectMode ? "secondary" : "outline"}
          size="sm"
          onClick={toggleSelectMode}
        >
          <CheckSquare className="mr-2 h-4 w-4" />
          {isSelectMode ? "Cancel Selection" : "Select"}
        </Button>
      </div>

      {/* Batch action bar */}
      {isSelectMode && (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg border border-border">
          <span className="text-sm font-medium flex-1">
            {selectedIds.size} selected
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleArchive}
            disabled={selectedIds.size === 0 || isArchiving || isDeleting}
          >
            <Archive className="mr-2 h-4 w-4" />
            {isArchiving ? "Archiving…" : "Archive Selected"}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="destructive"
                disabled={selectedIds.size === 0 || isArchiving || isDeleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Delete {selectedIds.size} tracker{selectedIds.size !== 1 ? "s" : ""}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. All entries associated with the
                  selected trackers will also be permanently deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? "Deleting…" : "Delete Forever"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button size="sm" variant="ghost" onClick={toggleSelectMode}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Tracker cards */}
      {trackers.map((tracker) => (
        <TrackerCard
          key={tracker.id}
          tracker={tracker}
          showEdit
          isSelected={isSelectMode ? selectedIds.has(tracker.id) : undefined}
          onSelect={isSelectMode ? () => toggleSelect(tracker.id) : undefined}
        />
      ))}
    </div>
  );
}
