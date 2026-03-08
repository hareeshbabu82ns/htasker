"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tracker, TrackerEntry, TrackerType } from "@/types";
import {
  useTrackerQuery,
  useEntriesQuery,
  useAddEntryMutation,
} from "@/hooks/useTrackerQuery";
import { trackerKeys } from "@/hooks/queries/trackerQueries";
import EntryPagination from "../EntryPagination";
import EditEntryModal from "../EditEntryModal";

interface AmountTrackerProps {
  tracker: Tracker;
  onUpdate?: () => void;
}

export default function AmountTracker( { tracker, onUpdate }: AmountTrackerProps ) {
  const queryClient = useQueryClient();

  const [ currentPage, setCurrentPage ] = useState( 1 );
  const [ currentLimit, setCurrentLimit ] = useState( 10 );
  const [ amount, setAmount ] = useState( "" );
  const [ currency, setCurrency ] = useState( "USD" );
  const [ note, setNote ] = useState( "" );

  const trackerQuery = useTrackerQuery( tracker.id );
  const entriesQuery = useEntriesQuery( tracker.id, currentPage, currentLimit );
  const addEntryMutation = useAddEntryMutation( tracker.id );

  const totalAmount =
    trackerQuery.data?.statistics?.totalValue ??
    tracker.statistics?.totalValue ??
    0;

  const displayedEntries = ( entriesQuery.data?.entries ?? [] ) as TrackerEntry[];
  const totalEntries = entriesQuery.data?.total ?? 0;
  const isLoadingEntries = entriesQuery.isLoading;
  const isCalculatingTotal = trackerQuery.isLoading;

  const handleEntryUpdated = () => {
    void queryClient.invalidateQueries( { queryKey: trackerKeys.detail( tracker.id ) } );
    void queryClient.invalidateQueries( { queryKey: [ "entries", tracker.id ] } );
  };

  // Common currency options
  const currencies = [
    { code: "USD", symbol: "$" },
    { code: "EUR", symbol: "€" },
    { code: "GBP", symbol: "£" },
    { code: "JPY", symbol: "¥" },
    { code: "None", symbol: "" },
  ];

  const formatCurrency = ( value: number ) => {
    const currencyObj = currencies.find( ( c ) => c.code === currency );
    if ( !currencyObj || currencyObj.code === "None" ) return value.toFixed( 2 );
    return `${currencyObj.symbol}${value.toFixed( 2 )}`;
  };

  const formatDate = ( date: Date ) => {
    return new Date( date ).toLocaleDateString( undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    } );
  };

  const handleSubmit = ( e: React.FormEvent ) => {
    e.preventDefault();
    if ( !amount || isNaN( parseFloat( amount ) ) ) return;

    addEntryMutation.mutate(
      {
        trackerId: tracker.id,
        value: parseFloat( amount ),
        date: new Date(),
        note: note.trim() || null,
        tags: [ currency ],
      },
      {
        onSuccess: () => {
          setAmount( "" );
          setNote( "" );
          if ( onUpdate ) onUpdate();
        },
      }
    );
  };

  return (
    <div className="bg-background border border-border p-6 rounded-lg shadow-sm">
      {/* Current total */}
      <div className="text-center mb-6">
        <div className="text-4xl font-semibold mb-2" style={{ color: tracker.color || "inherit" }}>
          {isCalculatingTotal ? (
            <span className="text-2xl text-foreground/50">Calculating...</span>
          ) : (
            formatCurrency( totalAmount )
          )}
        </div>
        <div className="text-sm text-foreground/70">Total amount</div>
      </div>

      {/* Amount entry form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Amount input with currency selector */}
        <div className="grid grid-cols-4 gap-2">
          <div className="col-span-1">
            <select
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-primary/50 focus:border-primary bg-background"
              value={currency}
              onChange={( e ) => setCurrency( e.target.value )}
            >
              {currencies.map( ( curr ) => (
                <option key={curr.code} value={curr.code}>
                  {curr.code}
                </option>
              ) )}
            </select>
          </div>

          <div className="col-span-3">
            <input
              type="number"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-primary/50 focus:border-primary bg-background"
              placeholder="Enter amount"
              value={amount}
              onChange={( e ) => setAmount( e.target.value )}
              required
            />
          </div>
        </div>

        {/* Note input */}
        <div>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-primary/50 focus:border-primary bg-background"
            placeholder="Add a note (optional)"
            value={note}
            onChange={( e ) => setNote( e.target.value )}
          />
        </div>

        {/* Submit button */}
        <div className="flex justify-center">
          <Button
            type="submit"
            disabled={addEntryMutation.isPending || !amount || isNaN( parseFloat( amount ) )}
            className="px-8 h-11"
            style={{ backgroundColor: tracker.color || undefined }}
          >
            {addEntryMutation.isPending ? "Adding..." : "Add Amount"}
          </Button>
        </div>
      </form>

      {/* History section */}
      <div className="mt-8">
        <h3 className="font-medium text-sm mb-3">Recent Entries</h3>

        {isLoadingEntries ? (
          <div className="text-center p-4">
            <p className="text-foreground/60">Loading entries...</p>
          </div>
        ) : displayedEntries.length > 0 ? (
          <>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {displayedEntries.map( ( entry ) => (
                <div
                  key={entry.id}
                  className="flex justify-between items-center p-3 border border-gray-200 dark:border-gray-800 rounded-md bg-background/50"
                >
                  <div>
                    <div className="font-medium">
                      {formatCurrency( entry.value || 0 )}
                    </div>
                    {entry.note && (
                      <div className="text-sm text-foreground/70">{entry.note}</div>
                    )}
                    <div className="text-xs text-foreground/50">
                      {formatDate( entry.date )}
                    </div>
                  </div>
                  <div>
                    {entry.tags?.map( ( tag ) => (
                      <span
                        key={tag}
                        className="inline-block text-xs px-2 py-1 rounded-full bg-primary/10 text-primary"
                      >
                        {tag}
                      </span>
                    ) )}
                    <EditEntryModal
                      entry={entry}
                      trackerType={TrackerType.AMOUNT}
                      onSuccess={handleEntryUpdated}
                    />
                  </div>
                </div>
              ) )}
            </div>
            <EntryPagination
              currentPage={currentPage}
              currentLimit={currentLimit}
              totalEntries={totalEntries}
              onPageChange={setCurrentPage}
              onLimitChange={( limit ) => { setCurrentLimit( limit ); setCurrentPage( 1 ); }}
            />
          </>
        ) : (
          <div className="text-center p-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-md">
            <p className="text-foreground/60 text-sm">
              No recent entries to display
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
