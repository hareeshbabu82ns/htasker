"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tracker } from "@/types";
import { useTracker } from "@/hooks/useTracker";

interface OccurrenceTrackerProps {
  tracker: Tracker;
  onUpdate?: () => void;
}

export default function OccurrenceTracker( { tracker, onUpdate }: OccurrenceTrackerProps ) {
  const { addEntry } = useTracker();
  const [ isLoading, setIsLoading ] = useState( false );
  const [ note, setNote ] = useState( "" );

  const today = new Date();
  const formattedToday = today.toISOString().split( 'T' )[ 0 ];
  const [ selectedDate, setSelectedDate ] = useState( formattedToday );

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

      // Call the onUpdate callback if provided
      if ( onUpdate ) onUpdate();
    } catch ( error ) {
      console.error( "Failed to log occurrence:", error );
    } finally {
      setIsLoading( false );
    }
  };

  // Calculate days since last occurrence (placeholder)
  const daysSinceLastOccurrence = 3; // This would come from actual data

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
        <div className="text-center p-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-md">
          <p className="text-foreground/60 text-sm">
            No recent occurrences to display
          </p>
        </div>
      </div>
    </div>
  );
}