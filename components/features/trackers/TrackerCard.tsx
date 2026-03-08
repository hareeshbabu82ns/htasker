"use client";

import { TrackerWithEntriesCount, archiveTrackers, duplicateTracker, pinTracker, unpinTracker } from "@/app/actions/trackers";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { TrackerStatus, TrackerType } from "@/app/generated/prisma";
import { Button } from "@/components/ui/button";
import { addCounterEntry, getEntriesByTracker, startTimerEntry, stopTimerEntry } from "@/app/actions/entries";
import {
  BadgeDollarSign, CalendarRange, Clock3, Columns3Cog, Hash,
  PauseCircle, PlayCircle, Plus, Minus, Calendar, EyeIcon, Edit2Icon,
  MoreHorizontal, Copy, Archive, Pin, PinOff,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { TrackerEntry } from "@/types";
import { calculateContrastColor, formatDuration } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface TrackerCardProps {
  tracker: TrackerWithEntriesCount;
  showLabel?: boolean;
  showEdit?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}

// Tracker Card Component
export default function TrackerCard({ tracker, showLabel = false, showEdit = false, isSelected, onSelect }: TrackerCardProps) {
  const [ isLoading, setIsLoading ] = useState( false );
  const [ elapsedTime, setElapsedTime ] = useState( 0 );
  const [ startTime, setStartTime ] = useState<Date | null>( null );
  const [ activeEntryId, setActiveEntryId ] = useState<string | null>( null );
  const [ isRunning, setIsRunning ] = useState( false );
  const [ isDuplicating, setIsDuplicating ] = useState( false );
  const [ isPinning, setIsPinning ] = useState( false );
  const [ isArchiving, setIsArchiving ] = useState( false );
  const [ counterValue, setCounterValue ] = useState( tracker.statistics?.totalValue ?? 0 );
  const router = useRouter();

  // Sync counterValue when server data updates after router.refresh()
  useEffect( () => {
    setCounterValue( tracker.statistics?.totalValue ?? 0 );
  }, [ tracker.statistics?.totalValue, tracker.id ] );

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
    setCounterValue( ( prev ) => ( prev ?? 0 ) + 1 );
    try {
      const response = await addCounterEntry( tracker.id, 1 );
      if ( response.success ) {
        toast.success( "Counter updated" );
        router.refresh();
      } else {
        setCounterValue( ( prev ) => ( prev ?? 1 ) - 1 );
        toast.error( "Failed to update counter" );
      }
    } catch ( error ) {
      setCounterValue( ( prev ) => ( prev ?? 1 ) - 1 );
      console.error( "Failed to increment counter:", error );
      toast.error( "Failed to update counter" );
    } finally {
      setIsLoading( false );
    }
  };

  // Handle counter decrement
  const handleDecrement = async () => {
    setIsLoading( true );
    setCounterValue( ( prev ) => ( prev ?? 0 ) - 1 );
    try {
      const response = await addCounterEntry( tracker.id, -1 );
      if ( response.success ) {
        toast.success( "Counter updated" );
        router.refresh();
      } else {
        setCounterValue( ( prev ) => ( prev ?? 0 ) + 1 );
        toast.error( "Failed to update counter" );
      }
    } catch ( error ) {
      setCounterValue( ( prev ) => ( prev ?? 0 ) + 1 );
      console.error( "Failed to decrement counter:", error );
      toast.error( "Failed to update counter" );
    } finally {
      setIsLoading( false );
    }
  };

  // Handle duplicate tracker
  const handleDuplicate = async () => {
    setIsDuplicating( true );
    try {
      const response = await duplicateTracker( tracker.id );
      if ( response.success ) {
        toast.success( "Tracker duplicated" );
        router.refresh();
      } else {
        toast.error( response.error ?? "Failed to duplicate tracker" );
      }
    } catch {
      toast.error( "Failed to duplicate tracker" );
    } finally {
      setIsDuplicating( false );
    }
  };

  // Handle pin/unpin toggle
  const handlePinToggle = async () => {
    setIsPinning( true );
    try {
      const action = tracker.isPinned ? unpinTracker : pinTracker;
      const response = await action( tracker.id );
      if ( response.success ) {
        toast.success( tracker.isPinned ? "Tracker unpinned" : "Tracker pinned" );
        // Notify PinnedTrackers widget to refetch
        window.dispatchEvent( new CustomEvent( 'pinned-trackers-changed' ) );
        router.refresh();
      } else {
        toast.error( response.error ?? "Failed to update pin status" );
      }
    } catch {
      toast.error( "Failed to update pin status" );
    } finally {
      setIsPinning( false );
    }
  };

  // Handle archive via swipe gesture
  const handleArchive = useCallback( async () => {
    if ( isArchiving ) return;
    setIsArchiving( true );
    try {
      const response = await archiveTrackers( [ tracker.id ] );
      if ( response.success ) {
        toast.success( "Tracker archived" );
        router.refresh();
      } else {
        toast.error( response.error ?? "Failed to archive tracker" );
      }
    } catch {
      toast.error( "Failed to archive tracker" );
    } finally {
      setIsArchiving( false );
    }
  }, [ isArchiving, tracker.id, router ] );

  const isArchived = tracker.status === TrackerStatus.ARCHIVED;

  const { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel, swipeOffset, isSwiping } = useSwipeGesture( {
    threshold: 60,
    onSwipeLeft: isArchived ? undefined : handleArchive,
  } );
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
                className="h-11"
              >
                <PauseCircle className="mr-1 h-4 w-4" /> Stop
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={handleTimerStart}
                disabled={isLoading}
                className="h-11"
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
              size="icon"
              variant="outline"
              onClick={handleDecrement}
              disabled={isLoading}
              className="h-11 w-11"
              aria-label={`Decrement ${tracker.name}`}
            >
              <Minus className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={handleIncrement}
              disabled={isLoading}
              className="h-11 w-11"
              aria-label={`Increment ${tracker.name}`}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        );
      case TrackerType.OCCURRENCE:
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.location.href = `/trackers/${tracker.id}`}
            className="h-11"
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
            <div className="text-lg text-secondary" aria-live="off" aria-atomic="true">
              {formatDuration( tracker.statistics?.totalTime || 0 )}
              {isRunning && (
                <span className="text-xs font-medium ml-1 mt-1 text-primary" aria-live="polite" aria-atomic="true" aria-label={`Elapsed: ${formatDuration( elapsedTime )}`}>
                  {formatDuration( elapsedTime )}
                </span>
              )}
            </div>

          </div>
        );
      case TrackerType.COUNTER:
      case TrackerType.AMOUNT: {
        const prefix = tracker.type === TrackerType.AMOUNT ? '$' : '';
        const displayValue = tracker.type === TrackerType.COUNTER ? counterValue : ( tracker.statistics?.totalValue ?? 0 );
        return (
          <div
            className="text-lg text-secondary"
            aria-live="polite"
            aria-atomic="true"
            aria-label={`${tracker.name} total: ${prefix}${displayValue}`}
          >
            {prefix}{displayValue}
          </div>
        );
      }
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
    <div className="relative overflow-hidden rounded-lg">
      {/* Archive reveal overlay — shown when swiping left past 30px */}
      {swipeOffset < -30 && (
        <div className="absolute right-0 top-0 bottom-0 flex items-center justify-center bg-orange-500 rounded-r-lg px-4 transition-opacity">
          <Archive className="h-5 w-5 text-white" />
          <span className="text-white text-sm ml-1">Archive</span>
        </div>
      )}
      <div
        className={`bg-background border rounded-lg p-4 hover:border-primary hover:bg-accent/90 dark:hover:bg-accent/5 transition-colors ${isSelected ? "border-primary ring-2 ring-primary/20" : "border-border"}`}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 150ms ease',
        }}
        {...( !isArchived ? { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel } : {} )}
        onClick={onSelect}
        role={onSelect ? "button" : undefined}
        tabIndex={onSelect ? 0 : undefined}
        onKeyDown={onSelect ? ( e ) => { if ( e.key === "Enter" || e.key === " " ) onSelect(); } : undefined}
      >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          {isSelected !== undefined && (
            <div className="mt-1 flex-shrink-0" onClick={( e ) => e.stopPropagation()}>
              <Checkbox
                checked={isSelected}
                onCheckedChange={onSelect}
                aria-label={`Select ${tracker.name}`}
              />
            </div>
          )}
          <div className="text-primary p-2 bg-primary/10 rounded-full"
            style={{
              backgroundColor: tracker.color || undefined,
              color: calculateContrastColor( tracker.color || "#000" )
            }}
            aria-hidden="true"
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
        <div className="flex flex-col space-y-2" onClick={( e ) => e.stopPropagation()}>
          {getStatsDisplay()}
          <div className="flex space-x-2 items-center">
            {tracker.status !== TrackerStatus.ARCHIVED && getActionButtons()}
            <Link href={`/trackers/${tracker.id}`} passHref>
              <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={`View ${tracker.name}`}><EyeIcon aria-hidden="true" /></Button>
            </Link>
            {showEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="More actions">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/trackers/${tracker.id}/edit`} className="flex items-center gap-2">
                      <Edit2Icon className="h-4 w-4" />
                      Edit
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleDuplicate}
                    disabled={isDuplicating}
                    className="flex items-center gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    {isDuplicating ? "Duplicating…" : "Duplicate"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handlePinToggle}
                    disabled={isPinning}
                    className="flex items-center gap-2"
                  >
                    {tracker.isPinned ? (
                      <><PinOff className="h-4 w-4" />{isPinning ? "Unpinning…" : "Unpin"}</>
                    ) : (
                      <><Pin className="h-4 w-4" />{isPinning ? "Pinning…" : "Pin to dashboard"}</>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {tracker.status !== TrackerStatus.ARCHIVED && (
                    <DropdownMenuItem asChild>
                      <Link href={`/trackers/${tracker.id}/edit`} className="flex items-center gap-2 text-muted-foreground">
                        <Archive className="h-4 w-4" />
                        Archive
                      </Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}