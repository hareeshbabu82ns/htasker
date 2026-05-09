"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tracker, TrackerEntry, TrackerType } from "@/types";
import {
  useTrackerQuery,
  useEntriesQuery,
  useAddEntryMutation,
  usePeriodStats,
  resolvePeriod,
} from "@/hooks/useTrackerQuery";
import { trackerKeys } from "@/hooks/queries/trackerQueries";
import EntryPagination from "../EntryPagination";
import EditEntryModal from "../EditEntryModal";

interface AmountTrackerProps {
  tracker: Tracker;
  onUpdate?: () => void;
}

export default function AmountTracker({ tracker, onUpdate }: AmountTrackerProps) {
  const queryClient = useQueryClient();

  const [currentPage, setCurrentPage] = useState(1);
  const [currentLimit, setCurrentLimit] = useState(10);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [note, setNote] = useState("");

  const trackerQuery = useTrackerQuery(tracker.id);
  const entriesQuery = useEntriesQuery(tracker.id, currentPage, currentLimit);
  const addEntryMutation = useAddEntryMutation(tracker.id);
  const periodStatsQuery = usePeriodStats(tracker.id);
  const { key: periodKey, label: periodLabel } = resolvePeriod(
    tracker.goalEnabled ?? false,
    tracker.goalPeriod
  );

  const totalAmount =
    periodStatsQuery.data !== undefined
      ? (periodStatsQuery.data[periodKey] ?? 0)
      : (trackerQuery.data?.statistics?.totalValue ?? tracker.statistics?.totalValue ?? 0);

  const displayedEntries = (entriesQuery.data?.entries ?? []) as TrackerEntry[];
  const totalEntries = entriesQuery.data?.total ?? 0;
  const isLoadingEntries = entriesQuery.isLoading;
  const isCalculatingTotal = trackerQuery.isLoading;

  const handleEntryUpdated = () => {
    void queryClient.invalidateQueries({ queryKey: trackerKeys.detail(tracker.id) });
    void queryClient.invalidateQueries({ queryKey: ["entries", tracker.id] });
    void queryClient.invalidateQueries({ queryKey: trackerKeys.stats(tracker.id, "period") });
  };

  // Common currency options
  const currencies = [
    { code: "USD", symbol: "$" },
    { code: "EUR", symbol: "€" },
    { code: "GBP", symbol: "£" },
    { code: "JPY", symbol: "¥" },
    { code: "None", symbol: "" },
  ];

  const formatCurrency = (value: number) => {
    const currencyObj = currencies.find((c) => c.code === currency);
    if (!currencyObj || currencyObj.code === "None") return value.toFixed(2);
    return `${currencyObj.symbol}${value.toFixed(2)}`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(parseFloat(amount))) return;

    addEntryMutation.mutate(
      {
        trackerId: tracker.id,
        value: parseFloat(amount),
        date: new Date(),
        note: note.trim() || null,
        tags: [currency],
      },
      {
        onSuccess: () => {
          setAmount("");
          setNote("");
          if (onUpdate) onUpdate();
        },
      }
    );
  };

  return (
    <div className="bg-background border-border rounded-lg border p-6 shadow-sm">
      {/* Current total */}
      <div className="mb-6 text-center">
        <div className="mb-2 text-4xl font-semibold" style={{ color: tracker.color || "inherit" }}>
          {isCalculatingTotal ? (
            <span className="text-foreground/50 text-2xl">Calculating...</span>
          ) : (
            formatCurrency(totalAmount)
          )}
        </div>
        <div className="text-foreground/70 text-sm">{periodLabel}</div>
      </div>

      {/* Amount entry form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Amount input with currency selector */}
        <div className="grid grid-cols-4 gap-2">
          <div className="col-span-1">
            <select
              className="focus:ring-primary/50 focus:border-primary bg-background border-border w-full rounded-md border px-3 py-2 shadow-sm"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {currencies.map((curr) => (
                <option key={curr.code} value={curr.code}>
                  {curr.code}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-3">
            <input
              type="number"
              step="0.01"
              className="focus:ring-primary/50 focus:border-primary bg-background border-border w-full rounded-md border px-3 py-2 shadow-sm"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Note input */}
        <div>
          <input
            type="text"
            className="focus:ring-primary/50 focus:border-primary bg-background border-border w-full rounded-md border px-3 py-2 shadow-sm"
            placeholder="Add a note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {/* Submit button */}
        <div className="flex justify-center">
          <Button
            type="submit"
            disabled={addEntryMutation.isPending || !amount || isNaN(parseFloat(amount))}
            className="h-11 px-8"
            style={{ backgroundColor: tracker.color || undefined }}
          >
            {addEntryMutation.isPending ? "Adding..." : "Add Amount"}
          </Button>
        </div>
      </form>

      {/* History section */}
      <div className="mt-8">
        <h3 className="mb-3 text-sm font-medium">Recent Entries</h3>

        {isLoadingEntries ? (
          <div className="p-4 text-center">
            <p className="text-foreground/60">Loading entries...</p>
          </div>
        ) : displayedEntries.length > 0 ? (
          <>
            <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
              {displayedEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-background/50 border-border dark:border-border flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <div className="font-medium">{formatCurrency(entry.value || 0)}</div>
                    {entry.note && <div className="text-foreground/70 text-sm">{entry.note}</div>}
                    <div className="text-foreground/50 text-xs">{formatDate(entry.date)}</div>
                  </div>
                  <div>
                    {entry.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="bg-primary/10 text-primary inline-block rounded-full px-2 py-1 text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                    <EditEntryModal
                      entry={entry}
                      trackerType={TrackerType.AMOUNT}
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
