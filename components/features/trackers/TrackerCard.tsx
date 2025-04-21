"use client";

import { TrackerWithEntriesCount } from "@/app/actions/trackers";
import { TrackerStatus, TrackerType } from "@/app/generated/prisma";
import { Button } from "@/components/ui/button";
import { addCounterEntry, getEntriesByTracker, startTimerEntry, stopTimerEntry } from "@/app/actions/entries";
import { BadgeDollarSign, CalendarRange, Clock3, Columns3Cog, Hash, PauseCircle, PlayCircle, Plus, Minus, Calendar, EyeIcon, Edit2Icon } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { TrackerEntry } from "@/types";
import { calculateContrastColor, formatDuration } from "@/lib/utils";

// Tracker Card Component
export default function TrackerCard( { tracker, showLabel = false, showEdit = false }: { tracker: TrackerWithEntriesCount, showLabel?: boolean, showEdit?: boolean } ) {
  const [ isLoading, setIsLoading ] = useState( false );
  const [ elapsedTime, setElapsedTime ] = useState( 0 );
  const [ startTime, setStartTime ] = useState<Date | null>( null );
  const [ activeEntryId, setActiveEntryId ] = useState<string | null>( null );
  const [ isRunning, setIsRunning ] = useState( false );

  // Check for active timer on component mount
  useEffect( () => {
    if ( tracker.type === TrackerType.TIMER && tracker.status !== TrackerStatus.ARCHIVED ) {
      fetchActiveTimer();
    }
  }, [ tracker.id, tracker.type, tracker.status ] );

  // Update timer display every second when running
  useEffect( () => {
    if ( !isRunning || !startTime ) return;

    const interval = setInterval( () => {
      const now = new Date();
      const diff = Math.floor( ( now.getTime() - new Date( startTime ).getTime() ) / 1000 );
      setElapsedTime( diff );
    }, 1000 );

    return () => clearInterval( interval );
  }, [ isRunning, startTime ] );

  // Fetch active timer entry if one exists
  const fetchActiveTimer = async () => {
    try {
      const response = await getEntriesByTracker( tracker.id, 5 );
      if ( response.success && Array.isArray( response.data ) ) {
        const entries = response.data as TrackerEntry[];
        // Find entry with startTime but no endTime (or where they are the same - in progress)
        const activeEntry = entries.find( entry =>
          entry.startTime &&
          ( !entry.endTime ||
            new Date( entry.startTime ).getTime() === new Date( entry.endTime ).getTime() )
        );

        if ( activeEntry ) {
          setActiveEntryId( activeEntry.id );
          setStartTime( new Date( activeEntry.startTime! ) );
          setIsRunning( true );

          // Calculate elapsed time
          const now = new Date();
          const diff = Math.floor( ( now.getTime() - new Date( activeEntry.startTime! ).getTime() ) / 1000 );
          setElapsedTime( diff );
        }
      }
    } catch ( error ) {
      console.error( "Failed to fetch active timer:", error );
    }
  };

  const getTypeIcon = ( type: string ) => {
    switch ( type ) {
      case TrackerType.TIMER:
        return <Clock3 />;
      case TrackerType.COUNTER:
        return <Hash />;
      case TrackerType.AMOUNT:
        return <BadgeDollarSign />;
      case TrackerType.OCCURRENCE:
        return <CalendarRange />;
      default:
        return <Columns3Cog />;
    }
  };

  // Helper function to get the icon for tracker type
  const getTypeLabel = ( type: TrackerType ) => {
    switch ( type ) {
      case TrackerType.TIMER:
        return "Timer";
      case TrackerType.COUNTER:
        return "Counter";
      case TrackerType.AMOUNT:
        return "Amount";
      case TrackerType.OCCURRENCE:
        return "Occurrence";
      case TrackerType.CUSTOM:
        return "Custom";
      default:
        return "Unknown";
    }
  };

  const formatDate = ( date: Date ) => {
    return new Intl.DateTimeFormat( 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    } ).format( date );
  };

  // Handle timer start
  const handleTimerStart = async () => {
    setIsLoading( true );
    try {
      const response = await startTimerEntry( tracker.id );
      if ( response.success && response.data ) {
        setActiveEntryId( response.data.id );
        setStartTime( new Date() );
        setIsRunning( true );
        setElapsedTime( 0 );
      }
    } catch ( error ) {
      console.error( "Failed to start timer:", error );
    } finally {
      setIsLoading( false );
    }
  };

  // Handle timer stop
  const handleTimerStop = async () => {
    if ( !activeEntryId ) return;

    setIsLoading( true );
    try {
      await stopTimerEntry( activeEntryId );
      setIsRunning( false );
      setActiveEntryId( null );
      setStartTime( null );
      // After stopping, we should update the total time stat, but we'll let the server handle that
    } catch ( error ) {
      console.error( "Failed to stop timer:", error );
    } finally {
      setIsLoading( false );
    }
  };

  // Handle counter increment
  const handleIncrement = async () => {
    setIsLoading( true );
    try {
      await addCounterEntry( tracker.id, 1 );
      // In a real app, you might want to refresh the data or use React Query
      window.location.reload();
    } catch ( error ) {
      console.error( "Failed to increment counter:", error );
    } finally {
      setIsLoading( false );
    }
  };

  // Handle counter decrement
  const handleDecrement = async () => {
    setIsLoading( true );
    try {
      await addCounterEntry( tracker.id, -1 );
      // In a real app, you might want to refresh the data or use React Query
      window.location.reload();
    } catch ( error ) {
      console.error( "Failed to decrement counter:", error );
    } finally {
      setIsLoading( false );
    }
  };

  // Get action buttons based on tracker type
  const getActionButtons = () => {
    switch ( tracker.type ) {
      case TrackerType.TIMER:
        return (
          <div className="flex space-x-2">
            {isRunning ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleTimerStop}
                disabled={isLoading || !activeEntryId}
              >
                <PauseCircle className="mr-1 h-4 w-4" /> Stop
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={handleTimerStart}
                disabled={isLoading}
              >
                <PlayCircle className="mr-1 h-4 w-4" /> Start
              </Button>
            )}
          </div>
        );
      case TrackerType.COUNTER:
        return (
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDecrement}
              disabled={isLoading}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleIncrement}
              disabled={isLoading}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        );
      case TrackerType.OCCURRENCE:
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.location.href = `/trackers/${tracker.id}`}
          >
            <Calendar className="mr-1 h-4 w-4" /> Log
          </Button>
        );
      default:
        return null;
    }
  };

  // Get stats display based on tracker type
  const getStatsDisplay = () => {
    switch ( tracker.type ) {
      case TrackerType.TIMER:
        return (
          <div>
            <div className="text-lg text-secondary">
              {formatDuration( tracker.statistics?.totalTime || 0 )}
              {isRunning && (
                <span className="text-xs font-medium ml-1 mt-1 text-primary">
                  {formatDuration( elapsedTime )}
                </span>
              )}
            </div>

          </div>
        );
      case TrackerType.COUNTER:
      case TrackerType.AMOUNT:
        const prefix = tracker.type === TrackerType.AMOUNT ? '$' : '';
        return (
          <div className="text-lg text-secondary">
            {prefix}{tracker.statistics?.totalValue || 0}
          </div>
        );
      case TrackerType.OCCURRENCE:
        const lastOccurrence = tracker.updatedAt;
        const today = new Date();
        const diffTime = Math.abs( today.getTime() - new Date( lastOccurrence ).getTime() );
        const diffDays = Math.floor( diffTime / ( 1000 * 60 * 60 * 24 ) );

        return (
          <div className="text-lg text-secondary">
            {diffDays === 0 ? "Logged today" : `${diffDays} days since last occurrence`}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-background border border-border rounded-lg p-4 hover:border-primary hover:bg-accent/90 dark:hover:bg-accent/5 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="text-primary p-2 bg-primary/10 rounded-full"
            style={{
              backgroundColor: tracker.color || undefined,
              color: calculateContrastColor( tracker.color || "#000" )
            }}
          >
            {getTypeIcon( tracker.type )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{tracker.name}</h3>
              {tracker.tags &&
                tracker.tags.map( ( tag: string ) => (
                  <span
                    key={tag}
                    className="bg-primary/5 text-primary/90 px-2 py-0.5 rounded-full text-xs"
                  >
                    {tag}
                  </span>
                ) )}
              {tracker.status === TrackerStatus.ARCHIVED && (
                <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full text-xs">
                  Archived
                </span>
              )}
              {showLabel && (
                <span className="bg-primary/5 text-primary/90 px-2 py-0.5 rounded-full text-xs">
                  {getTypeLabel( tracker.type )}
                </span>
              )}
            </div>
            <p className="text-sm text-foreground/70 mt-1">{tracker.description}</p>
            <div className="flex items-center mt-2 text-xs text-foreground/60">
              <span suppressHydrationWarning>Last used: {formatDate( tracker.updatedAt )}</span>
              <span className="mx-2">•</span>
              <span>{tracker.entriesCount ?? 0} entries</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col space-y-2">
          {getStatsDisplay()}
          <div className="flex space-x-2">
            {tracker.status !== TrackerStatus.ARCHIVED && getActionButtons()}
            <Link href={`/trackers/${tracker.id}`} passHref>
              <Button variant="ghost" size="sm"><EyeIcon /></Button>
            </Link>
            {showEdit && <Link href={`/trackers/${tracker.id}/edit`} passHref>
              <Button variant="ghost" size="sm"><Edit2Icon /></Button>
            </Link>}
          </div>
        </div>
      </div>
    </div>
  );
}