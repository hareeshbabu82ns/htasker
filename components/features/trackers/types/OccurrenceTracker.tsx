"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tracker, TrackerEntry } from "@/types";
import { useTracker } from "@/hooks/useTracker";

interface OccurrenceTrackerProps {
  tracker: Tracker;
  onUpdate?: () => void;
}

export default function OccurrenceTracker( { tracker, onUpdate }: OccurrenceTrackerProps ) {
  const { addEntry, fetchEntries } = useTracker();
  const [ isLoading, setIsLoading ] = useState( false );
  const [ note, setNote ] = useState( "" );
  const [ entries, setEntries ] = useState<TrackerEntry[]>( [] );
  const [ isLoadingEntries, setIsLoadingEntries ] = useState( false );

  const today = new Date();
  const formattedToday = today.toISOString().split( 'T' )[ 0 ];
  const [ selectedDate, setSelectedDate ] = useState( formattedToday );

  // Fetch entries when component mounts or after updates
  useEffect( () => {
    const loadEntries = async () => {
      setIsLoadingEntries( true );
      try {
        const response = await fetchEntries( {
          trackerId: tracker.id,
          limit: 10
        } );

        if ( response.success && response.data ) {
          setEntries( response.data as TrackerEntry[] );

          // Calculate days since last occurrence
          if ( response.data.length > 0 ) {
            const lastEntry = response.data[ 0 ] as TrackerEntry;
            const lastDate = new Date( lastEntry.date );
            const diffTime = Math.abs( today.getTime() - lastDate.getTime() );
            const diffDays = Math.floor( diffTime / ( 1000 * 60 * 60 * 24 ) );
            setDaysSinceLastOccurrence( diffDays );
          }
        }
      } catch ( error ) {
        console.error( "Failed to fetch occurrence entries:", error );
      } finally {
        setIsLoadingEntries( false );
      }
    };

    loadEntries();
  }, [ tracker.id ] );

  // Calculate days since last occurrence
  const [ daysSinceLastOccurrence, setDaysSinceLastOccurrence ] = useState( 0 );

  // Format date for display
  const formatDate = ( date: Date ) => {
    return new Intl.DateTimeFormat( "en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    } ).format( new Date( date ) );
  };

  // Handle recording an occurrence
  const handleLogOccurrence = async () => {
    setIsLoading( true );

    try {
      const formData = new FormData();
      formData.append( "trackerId", tracker.id );
      formData.append( "date", new Date( selectedDate ).toISOString() );

      if ( note.trim() ) {
        formData.append( "note", note.trim() );
      }

      // Submit the entry
      await addEntry( formData );

      // Reset form
      setNote( "" );
      setSelectedDate( formattedToday );

      // Refresh entries list
      const response = await fetchEntries( {
        trackerId: tracker.id,
        limit: 10
      } );

      if ( response.success ) {
        setEntries( response.data as TrackerEntry[] );

        // Update days since last occurrence
        if ( response.data.length > 0 ) {
          const lastEntry = response.data[ 0 ] as TrackerEntry;
          const lastDate = new Date( lastEntry.date );
          const diffTime = Math.abs( today.getTime() - lastDate.getTime() );
          const diffDays = Math.floor( diffTime / ( 1000 * 60 * 60 * 24 ) );
          setDaysSinceLastOccurrence( diffDays );
        }
      }

      // Call the onUpdate callback if provided
      if ( onUpdate ) onUpdate();
    } catch ( error ) {
      console.error( "Failed to log occurrence:", error );
    } finally {
      setIsLoading( false );
    }
  };

  return (
    <div className="bg-background border border-border p-6 rounded-lg shadow-sm">
      {/* Status display */}
      <div className="text-center mb-6">
        <div className="text-2xl font-semibold mb-2" style={{ color: tracker.color || "inherit" }}>
          {daysSinceLastOccurrence === 0 ? (
            "Logged today"
          ) : (
            `${daysSinceLastOccurrence} days since last occurrence`
          )}
        </div>
      </div>

      {/* Occurrence form */}
      <div className="space-y-4">
        {/* Date selector */}
        <div className="space-y-2">
          <label htmlFor="occurrence-date" className="block text-sm font-medium">
            Date
          </label>
          <input
            type="date"
            id="occurrence-date"
            value={selectedDate}
            onChange={( e ) => setSelectedDate( e.target.value )}
            max={formattedToday}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-primary/50 focus:border-primary bg-background"
          />
        </div>

        {/* Note field */}
        <div className="space-y-2">
          <label htmlFor="occurrence-note" className="block text-sm font-medium">
            Note (optional)
          </label>
          <textarea
            id="occurrence-note"
            rows={2}
            value={note}
            onChange={( e ) => setNote( e.target.value )}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-primary/50 focus:border-primary bg-background"
            placeholder="Add a note about this occurrence..."
          />
        </div>

        {/* Submit button */}
        <div className="flex justify-center mt-4">
          <Button
            onClick={handleLogOccurrence}
            disabled={isLoading}
            className="px-8"
            style={{ backgroundColor: tracker.color || undefined }}
          >
            {isLoading ? "Logging..." : "Log Occurrence"}
          </Button>
        </div>
      </div>

      {/* Simple calendar visualization (placeholder) */}
      <div className="mt-8">
        <h3 className="font-medium text-sm mb-3">Occurrence Calendar</h3>
        <div className="text-center p-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-md">
          <p className="text-foreground/60 text-sm">
            Calendar visualization coming soon
          </p>
        </div>
      </div>

      {/* History section */}
      <div className="mt-8">
        <h3 className="font-medium text-sm mb-3">Recent Occurrences</h3>
        {isLoadingEntries ? (
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : entries.length > 0 ? (
          <div className="space-y-3">
            {entries.map( ( entry ) => (
              <div key={entry.id} className="border border-border rounded-md p-3 text-sm">
                <div className="flex justify-between items-center">
                  <div className="font-medium">
                    {formatDate( entry.date )}
                  </div>
                </div>
                {entry.note && (
                  <div className="text-sm text-foreground/70 mt-1 italic">
                    {entry.note}
                  </div>
                )}
              </div>
            ) )}
          </div>
        ) : (
          <div className="text-center p-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-md">
            <p className="text-foreground/60 text-sm">
              No recent occurrences to display
            </p>
          </div>
        )}
      </div>
    </div>
  );
}