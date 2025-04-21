"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tracker, TrackerEntry } from "@/types";
import { useTracker } from "@/hooks/useTracker";
import EntryPagination from "../EntryPagination";

interface TimerTrackerProps {
  tracker: Tracker;
  onUpdate?: () => void;
}

export default function TimerTracker( { tracker, onUpdate }: TimerTrackerProps ) {
  const { addEntry, fetchEntries, updateEntry, fetchTracker } = useTracker();
  const [ isRunning, setIsRunning ] = useState( false );
  const [ startTime, setStartTime ] = useState<Date | null>( null );
  const [ currentEntryId, setCurrentEntryId ] = useState<string | null>( null );
  const [ elapsedTime, setElapsedTime ] = useState( 0 ); // in milliseconds
  const [ elapsedAccumulatedTime, setElapsedAccumulatedTime ] = useState( 0 ); // in milliseconds for all entries
  const [ isLoading, setIsLoading ] = useState( false );
  const [ entries, setEntries ] = useState<TrackerEntry[]>( [] );
  const [ isLoadingEntries, setIsLoadingEntries ] = useState( false );
  // Pagination states for history
  const [ currentPage, setCurrentPage ] = useState( 1 );
  const [ currentLimit, setCurrentLimit ] = useState( 10 );
  const [ totalEntries, setTotalEntries ] = useState( 0 );

  // Calculate total duration from entries
  const calculateTotalDuration = async (): Promise<number> => {
    try {
      const response = await fetchTracker( tracker.id );
      if ( response.success ) {
        const trackerData = response.data as Tracker;
        return ( trackerData.statistics?.totalTime || 0 ) * 1000; // Convert seconds to milliseconds
      }
      return 0;
    } catch ( error ) {
      console.error( "Failed to calculate total duration:", error );
      return 0;
    }
  };

  // Fetch entries when the component mounts or when dependencies change
  useEffect( () => {
    const loadEntries = async () => {
      setIsLoadingEntries( true );
      try {
        // Fetch entries with pagination
        const { success, data, pagination } = await fetchEntries( {
          trackerId: tracker.id,
          limit: currentLimit,
          page: currentPage,
        } );

        if ( success ) {
          const entriesData = data as TrackerEntry[];
          setTotalEntries( pagination?.total || 0 );

          // Filter out entries where startTime equals endTime (in-progress entries)
          const completedEntries = entriesData.filter( entry =>
            entry.startTime && entry.endTime && new Date( entry.startTime ).getTime() !== new Date( entry.endTime ).getTime()
          );
          setEntries( completedEntries );

          // Check if there's an in-progress entry
          const inProgressEntry = entriesData.find( entry => !entry.endTime ||
            ( entry.startTime && entry.endTime && new Date( entry.startTime ).getTime() === new Date( entry.endTime ).getTime() )
          );

          if ( inProgressEntry ) {
            setIsRunning( true );
            setStartTime( new Date( inProgressEntry.startTime! ) );
            setCurrentEntryId( inProgressEntry.id );
          }

          // Calculate and set the elapsed time from entries
          const totalDuration = await calculateTotalDuration();
          setElapsedAccumulatedTime( totalDuration );
          setElapsedTime( totalDuration );
        }
      } catch ( error ) {
        console.error( "Failed to load timer entries:", error );
      } finally {
        setIsLoadingEntries( false );
      }
    };

    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ tracker.id, currentLimit, currentPage ] );

  // Update the timer every second when running
  useEffect( () => {
    let interval: NodeJS.Timeout | null = null;

    if ( isRunning && startTime ) {
      interval = setInterval( () => {
        const now = new Date();
        const elapsed = now.getTime() - startTime.getTime();
        setElapsedTime( elapsedAccumulatedTime + elapsed );
      }, 1000 );
    }

    return () => {
      if ( interval ) clearInterval( interval );
    };
  }, [ isRunning, startTime, elapsedAccumulatedTime ] );

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
  const handleStart = async () => {
    setIsLoading( true );
    try {
      const now = new Date();
      setStartTime( now );
      setIsRunning( true );

      // Create entry with the same start and end time to indicate "in progress"
      const formData = new FormData();
      formData.append( "trackerId", tracker.id );
      formData.append( "startTime", now.toISOString() );
      formData.append( "endTime", now.toISOString() ); // Same as start time to indicate in progress
      formData.append( "date", now.toISOString() );

      // Submit the entry
      const response = await addEntry( formData );
      if ( response.success && response.data ) {
        setCurrentEntryId( ( response.data as TrackerEntry ).id );
      }
    } catch ( error ) {
      console.error( "Failed to start timer:", error );
      setIsRunning( false );
      setStartTime( null );
    } finally {
      setIsLoading( false );
    }
  };

  // Handle stopping the timer
  const handleStop = async () => {
    setIsLoading( true );
    setIsRunning( false );

    try {
      if ( !startTime || !currentEntryId ) return;

      const now = new Date();
      const duration = now.getTime() - startTime.getTime();

      // Only update entry if the timer ran for at least 1 second
      if ( duration >= 1000 ) {
        const formData = new FormData();
        formData.append( "id", currentEntryId );
        formData.append( "trackerId", tracker.id );
        formData.append( "startTime", startTime.toISOString() );
        formData.append( "endTime", now.toISOString() );
        formData.append( "date", startTime.toISOString() );

        // Update the entry
        await updateEntry( formData );

        // Refresh entries
        const response = await fetchEntries( {
          trackerId: tracker.id,
          limit: 10
        } );

        if ( response.success ) {
          const entriesData = response.data as TrackerEntry[];
          // Filter out entries where startTime equals endTime (in-progress entries)
          const completedEntries = entriesData.filter( entry =>
            entry.startTime && entry.endTime && new Date( entry.startTime ).getTime() !== new Date( entry.endTime ).getTime()
          );
          setEntries( completedEntries );

          // Update the total accumulated time after adding a new entry
          const totalDuration = await calculateTotalDuration();
          setElapsedAccumulatedTime( totalDuration );
          setElapsedTime( totalDuration );
        }

        // Call the onUpdate callback if provided
        if ( onUpdate ) onUpdate();
      } else {
        // For very short timer sessions (less than 1 second), delete the entry
        // This would require an additional deleteEntry function in useTracker
      }

      // Reset timer state
      setStartTime( null );
      setCurrentEntryId( null );
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
          <>
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
              No recent sessions to display
            </p>
          </div>
        )}
      </div>
    </div>
  );
}