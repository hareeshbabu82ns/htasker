"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tracker, TrackerEntry, TrackerType } from "@/types";
import {
  useEntriesQuery,
  useAddEntryMutation,
  usePeriodStats,
  resolvePeriod,
} from "@/hooks/useTrackerQuery";
import { trackerKeys } from "@/hooks/queries/trackerQueries";
import EntryPagination from "../EntryPagination";
import EditEntryModal from "../EditEntryModal";

interface CustomTrackerProps {
  tracker: Tracker;
  onUpdate?: () => void;
}

export default function CustomTracker({ tracker, onUpdate }: CustomTrackerProps) {
  const queryClient = useQueryClient();

  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [currentLimit, setCurrentLimit] = useState(10);

  const entriesQuery = useEntriesQuery(tracker.id, currentPage, currentLimit);
  const addEntryMutation = useAddEntryMutation(tracker.id);
  const periodStatsQuery = usePeriodStats(tracker.id);
  const { key: periodKey, label: periodLabel } = resolvePeriod(
    tracker.goalEnabled ?? false,
    tracker.goalPeriod
  );

  const entries = (entriesQuery.data?.entries ?? []) as TrackerEntry[];
  const totalEntries = entriesQuery.data?.total ?? 0;
  const isLoadingEntries = entriesQuery.isLoading;

  const handleEntryUpdated = () => {
    void queryClient.invalidateQueries({ queryKey: trackerKeys.detail(tracker.id) });
    void queryClient.invalidateQueries({ queryKey: ["entries", tracker.id] });
    void queryClient.invalidateQueries({ queryKey: trackerKeys.stats(tracker.id, "period") });
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !customTags.includes(tagInput.trim())) {
      setCustomTags([...customTags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleTagKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setCustomTags(customTags.filter((tag) => tag !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedValue = value.trim() ? parseFloat(value.trim()) : undefined;

    addEntryMutation.mutate(
      {
        trackerId: tracker.id,
        date: new Date(),
        value: parsedValue !== undefined && !isNaN(parsedValue) ? parsedValue : null,
        note: note.trim() || null,
        tags: customTags,
      },
      {
        onSuccess: () => {
          setValue("");
          setNote("");
          setCustomTags([]);
          if (onUpdate) onUpdate();
        },
      }
    );
  };

  return (
    <div className="bg-background border-border rounded-lg border p-6 shadow-sm">
      {/* Period stats */}
      {periodStatsQuery.data !== undefined && (
        <div className="mb-6 text-center">
          <div
            className="mb-1 text-4xl font-semibold"
            style={{ color: tracker.color || "inherit" }}
          >
            {periodStatsQuery.data[periodKey] ?? 0}
          </div>
          <div className="text-foreground/70 text-sm">
            {(periodStatsQuery.data[periodKey] ?? 0) === 1 ? "entry" : "entries"} — {periodLabel}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Value field */}
        <div className="space-y-2">
          <label htmlFor="custom-value" className="block text-sm font-medium">
            Value (optional)
          </label>
          <input
            type="text"
            id="custom-value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="focus:ring-primary/50 focus:border-primary bg-background border-border w-full rounded-md border px-3 py-2 shadow-sm"
            placeholder="Enter a value for this entry..."
          />
        </div>

        {/* Note field */}
        <div className="space-y-2">
          <label htmlFor="custom-note" className="block text-sm font-medium">
            Note
          </label>
          <textarea
            id="custom-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="focus:ring-primary/50 focus:border-primary bg-background border-border w-full rounded-md border px-3 py-2 shadow-sm"
            placeholder="Add a note to describe this entry..."
          />
        </div>

        {/* Custom tags */}
        <div className="space-y-2">
          <label htmlFor="custom-tags" className="block text-sm font-medium">
            Tags
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              id="custom-tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={handleTagKeyPress}
              className="focus:ring-primary/50 focus:border-primary bg-background border-border flex-grow rounded-md border px-3 py-2 shadow-sm"
              placeholder="Add tags (press Enter)"
            />
            <Button
              type="button"
              onClick={handleAddTag}
              variant="secondary"
              size="sm"
              className="h-11"
            >
              Add
            </Button>
          </div>

          {customTags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {customTags.map((tag) => (
                <div
                  key={tag}
                  className="bg-primary/10 text-primary flex items-center rounded-full px-2 py-1 text-sm"
                >
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-primary hover:text-primary/70 ml-2 flex min-h-[44px] min-w-[44px] items-center justify-center"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit button */}
        <div className="mt-6 flex justify-center">
          <Button
            type="submit"
            disabled={
              addEntryMutation.isPending ||
              (!value.trim() && !note.trim() && customTags.length === 0)
            }
            className="h-11 px-8"
            style={{ backgroundColor: tracker.color || undefined }}
          >
            {addEntryMutation.isPending ? "Saving..." : "Save Entry"}
          </Button>
        </div>
      </form>

      {/* History section */}
      <div className="mt-8">
        <h3 className="mb-3 text-sm font-medium">Recent Entries</h3>
        {isLoadingEntries ? (
          <div className="flex justify-center p-4">
            <div className="border-primary h-6 w-6 animate-spin rounded-full border-t-2 border-b-2"></div>
          </div>
        ) : entries.length > 0 ? (
          <>
            <div className="space-y-3">
              {entries.map((entry) => (
                <div key={entry.id} className="border-border rounded-md border p-3 text-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-grow">
                      {entry.value !== null && entry.value !== undefined && (
                        <div className="font-medium">Value: {entry.value}</div>
                      )}
                      {entry.note && (
                        <div className="text-foreground/70 mt-1 text-sm">{entry.note}</div>
                      )}
                      <div className="text-foreground/50 mt-1 text-xs">
                        {formatDate(entry.date)}
                      </div>
                    </div>

                    {entry.tags && entry.tags.length > 0 && (
                      <div className="ml-2 flex flex-wrap gap-1">
                        {entry.tags.map((tag) => (
                          <span
                            key={tag}
                            className="bg-primary/10 text-primary inline-block rounded-full px-2 py-0.5 text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <EditEntryModal
                      entry={entry}
                      trackerType={TrackerType.CUSTOM}
                      onSuccess={handleEntryUpdated}
                    />
                  </div>
                </div>
              ))}
            </div>
            <EntryPagination
              currentPage={currentPage}
              currentLimit={currentLimit}
              totalEntries={totalEntries}
              onPageChange={setCurrentPage}
              onLimitChange={(limit) => {
                setCurrentLimit(limit);
                setCurrentPage(1);
              }}
            />
          </>
        ) : (
          <div className="border-border rounded-md border border-dashed p-4 text-center">
            <p className="text-foreground/60 text-sm">No recent entries to display</p>
          </div>
        )}
      </div>
    </div>
  );
}
