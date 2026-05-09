"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tracker, TrackerType } from "@/types";
import {
  useTrackerQuery,
  useAddEntryMutation,
  usePeriodStats,
  resolvePeriod,
} from "@/hooks/useTrackerQuery";
import { useTrackerEntries } from "@/hooks/useTrackerEntries";
import TrackerEntryList from "../TrackerEntryList";
import EditEntryModal from "../EditEntryModal";

interface AmountTrackerProps {
  tracker: Tracker;
  onUpdate?: () => void;
}

export default function AmountTracker({ tracker, onUpdate }: AmountTrackerProps) {
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [note, setNote] = useState("");

  const trackerQuery = useTrackerQuery(tracker.id);
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

  const {
    entries,
    totalEntries,
    isLoadingEntries,
    currentPage,
    setCurrentPage,
    currentLimit,
    setCurrentLimit,
    handleEntryUpdated,
  } = useTrackerEntries(tracker.id);
  const isCalculatingTotal = trackerQuery.isLoading;

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
      <TrackerEntryList
        entries={entries}
        isLoading={isLoadingEntries}
        totalEntries={totalEntries}
        currentPage={currentPage}
        currentLimit={currentLimit}
        onPageChange={setCurrentPage}
        onLimitChange={setCurrentLimit}
        renderItem={(entry) => (
          <div
            key={entry.id}
            className="bg-background/50 border-border dark:border-border flex items-center justify-between rounded-md border p-3"
          >
            <div>
              <div className="font-medium">{formatCurrency(entry.value || 0)}</div>
              {entry.note && <div className="text-foreground/70 text-sm">{entry.note}</div>}
              <div className="text-foreground/50 text-xs">
                {new Date(entry.date).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
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
        )}
        emptyMessage="No recent entries to display"
      />
    </div>
  );
}
