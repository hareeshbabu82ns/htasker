"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tracker, TrackerEntry } from "@/types";
import { useTracker } from "@/hooks/useTracker";

interface TimerTrackerProps {
  tracker: Tracker;
  onUpdate?: () => void;
}

export default function TimerTracker( { tracker, onUpdate }: TimerTrackerProps ) {
  const { addEntry, fetchEntries } = useTracker();
  const [ isRunning, setIsRunning ] = useState( false );
  const [ startTime, setStartTime ] = useState<Date | null>( null );
  const [ elapsedTime, setElapsedTime ] = useState( 0 ); // in milliseconds
  const [ isLoading, setIsLoading ] = useState( false );
  const [ entries, setEntries ] = useState<TrackerEntry[]>( [] );
  const [ isLoadingEntries, setIsLoadingEntries ] = useState( false );

  // Fetch entries when the component mounts or when a new entry is added
  useEffect( () => {
    const loadEntries = async () => {
      setIsLoadingEntries( true );
      try {
        const response = await fetchEntries( {
          trackerId: tracker.id,
          limit: 5
        } );

        if ( response.success ) {
          setEntries( response.data as TrackerEntry[] );
        }
      } catch ( error ) {
        console.error( "Failed to load timer entries:", error );
      } finally {
        setIsLoadingEntries( false );
      }
    };

    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ tracker.id ] );

  // Update the timer every second when running
  useEffect( () => {
    let interval: NodeJS.Timeout | null = null;

    if ( isRunning && startTime ) {
      interval = setInterval( () => {
        const now = new Date();
        const elapsed = now.getTime() - startTime.getTime();
        setElapsedTime( elapsed );
      }, 1000 );
    }

    return () => {
      if ( interval ) clearInterval( interval );
    };
  }, [ isRunning, startTime ] );

  // Format time as HH:MM:SS
  const formatTime = ( milliseconds: number ) => {
    const totalSeconds = Math.floor( milliseconds / 1000 );
    const hours = Math.floor( totalSeconds / 3600 );
    const minutes = Math.floor( ( totalSeconds % 3600 ) / 60 );
    const seconds = totalSeconds % 60;

    const pad = ( num: number ) => num.toString().padStart( 2, '0' );

    return `${pad( hours )}:${pad( minutes )}:${pad( seconds )}`;
  };

  // Format date for display
  const formatDate = ( dateString: string | Date ) => {
    return new Date( dateString ).toLocaleDateString( 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    } );
  };

  // Calculate duration between two dates in milliseconds
  const calculateDuration = ( startTime: Date, endTime: Date ) => {
    return new Date( endTime ).getTime() - new Date( startTime ).getTime();
  };

  // Handle starting the timer
  const handleStart = () => {
    const now = new Date();
    setStartTime( now );
    setIsRunning( true );
  };

  // Handle stopping the timer
  const handleStop = async () => {
    setIsLoading( true );
    setIsRunning( false );

    try {
      if ( !startTime ) return;

      const now = new Date();
      const duration = now.getTime() - startTime.getTime();

      // Only create entry if the timer ran for at least 1 second
      if ( duration >= 1000 ) {
        const formData = new FormData();
        formData.append( "trackerId", tracker.id );
        formData.append( "startTime", startTime.toISOString() );
        formData.append( "endTime", now.toISOString() );
        formData.append( "date", now.toISOString() );

        // Submit the entry
        await addEntry( formData );

        // Refresh entries
        const response = await fetchEntries( {
          trackerId: tracker.id,
          limit: 5
        } );

        if ( response.success ) {
          setEntries( response.data as TrackerEntry[] );
        }

        // Call the onUpdate callback if provided
        if ( onUpdate ) onUpdate();
      }

      // Reset timer state
      setElapsedTime( 0 );
      setStartTime( null );
    } catch ( error ) {
      console.error( "Failed to save timer session:", error );
    } finally {
      setIsLoading( false );
    }
  };

  // Get a CSS color class based on tracker color
  const getButtonColorClass = () => {
    return tracker.color ? `bg-[${tracker.color}] hover:bg-[${tracker.color}]/90` : 'bg-primary hover:bg-primary/90';
  };

  return (
    <div className="bg-background border border-border p-6 rounded-lg shadow-sm">
      {/* Timer display */}
      <div className="text-center mb-6">
        <div
          className="text-5xl font-semibold mb-2"
          style={{ color: tracker.color || "inherit" }}
        >
          {formatTime( elapsedTime )}
        </div>
        <div className="text-sm text-foreground/70">
          {isRunning ? "Timer running" : "Timer stopped"}
        </div>
      </div>

      {/* Timer controls */}
      <div className="flex justify-center space-x-3">
        {!isRunning ? (
          <Button
            onClick={handleStart}
            disabled={isLoading}
            className={`px-8 py-2 ${getButtonColorClass()}`}
          >
            Start Timer
          </Button>
        ) : (
          <Button
            onClick={handleStop}
            disabled={isLoading}
            variant="outline"
            className="px-8 py-2 border-2"
          >
            Stop Timer
          </Button>
        )}
      </div>

      {/* History section */}
      <div className="mt-8">
        <h3 className="font-medium text-sm mb-3">Recent Sessions</h3>
        {isLoadingEntries ? (
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : entries.length > 0 ? (
          <div className="space-y-3">
            {entries.map( ( entry ) => (
              entry.startTime && entry.endTime ? (
                <div key={entry.id} className="border border-border rounded-md p-3 text-sm">
                  <div className="flex justify-between items-center">
                    <div className="font-medium">
                      {formatDate( entry.date )}
                    </div>
                    <div className="text-foreground/70">
                      {formatTime( calculateDuration( entry.startTime, entry.endTime ) )}
                    </div>
                  </div>
                  <div className="text-xs text-foreground/60 mt-1 flex justify-between">
                    <div>
                      {new Date( entry.startTime ).toLocaleTimeString()} - {new Date( entry.endTime ).toLocaleTimeString()}
                    </div>
                    {entry.note && (
                      <div className="italic">{entry.note}</div>
                    )}
                  </div>
                </div>
              ) : null
            ) )}
          </div>
        ) : (
          <div className="text-center p-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-md">
            <p className="text-foreground/60 text-sm">
              No recent sessions to display
            </p>
          </div>
        )}
      </div>
    </div>
  );
}