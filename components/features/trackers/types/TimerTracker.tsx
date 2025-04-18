"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Tracker, TrackerStatus } from "@/types";
import { useTracker } from "@/hooks/useTracker";
import { formatDuration } from "@/lib/utils";

interface TimerTrackerProps {
  tracker: Tracker;
  onUpdate?: () => void;
}

export default function TimerTracker( { tracker, onUpdate }: TimerTrackerProps ) {
  const { addEntry, changeStatus } = useTracker();
  const [ isRunning, setIsRunning ] = useState( tracker.status === TrackerStatus.ACTIVE );
  const [ elapsedTime, setElapsedTime ] = useState( 0 );
  const [ startTime, setStartTime ] = useState<Date | null>( null );
  const [ isSubmitting, setIsSubmitting ] = useState( false );
  const timerIdRef = useRef<NodeJS.Timeout | null>( null );
  const startTimeRef = useRef<Date | null>( null );

  // Effect to manage timer ticks
  useEffect( () => {
    if ( isRunning ) {
      const now = new Date();
      startTimeRef.current = startTimeRef.current || now;

      timerIdRef.current = setInterval( () => {
        if ( startTimeRef.current ) {
          setElapsedTime( Math.floor( ( new Date().getTime() - startTimeRef.current.getTime() ) / 1000 ) );
        }
      }, 1000 );
    } else if ( timerIdRef.current ) {
      clearInterval( timerIdRef.current );
      timerIdRef.current = null;
    }

    return () => {
      if ( timerIdRef.current ) {
        clearInterval( timerIdRef.current );
      }
    };
  }, [ isRunning ] );

  // Handle starting the timer
  const handleStart = async () => {
    setIsSubmitting( true );

    try {
      const now = new Date();
      setStartTime( now );
      startTimeRef.current = now;

      // Update tracker status to active
      await changeStatus( tracker.id, TrackerStatus.ACTIVE );

      setIsRunning( true );
      if ( onUpdate ) onUpdate();
    } catch ( error ) {
      console.error( "Failed to start timer:", error );
    } finally {
      setIsSubmitting( false );
    }
  };

  // Handle stopping the timer
  const handleStop = async () => {
    setIsSubmitting( true );

    try {
      const endTime = new Date();

      if ( startTime ) {
        // Create an entry for the completed timer session
        const formData = new FormData();
        formData.append( "trackerId", tracker.id );
        formData.append( "startTime", startTime.toISOString() );
        formData.append( "endTime", endTime.toISOString() );
        formData.append( "value", elapsedTime.toString() );

        // Submit the entry
        await addEntry( formData );
      }

      // Update tracker status to inactive
      await changeStatus( tracker.id, TrackerStatus.INACTIVE );

      // Reset timer state
      setIsRunning( false );
      setElapsedTime( 0 );
      setStartTime( null );
      startTimeRef.current = null;

      if ( onUpdate ) onUpdate();
    } catch ( error ) {
      console.error( "Failed to stop timer:", error );
    } finally {
      setIsSubmitting( false );
    }
  };

  return (
    <div className="bg-background border border-border p-6 rounded-lg shadow-sm">
      {/* Timer display */}
      <div className="text-center mb-6">
        <div className="text-4xl font-mono font-semibold mb-2">
          {formatDuration( elapsedTime )}
        </div>
        <div className="text-sm text-foreground/70">
          {isRunning ? "Timer running" : "Timer stopped"}
        </div>
      </div>

      {/* Timer controls */}
      <div className="flex justify-center space-x-4">
        {!isRunning ? (
          <Button
            onClick={handleStart}
            disabled={isSubmitting}
            className="px-8"
            style={{ backgroundColor: tracker.color || undefined }}
          >
            {isSubmitting ? "Starting..." : "Start Timer"}
          </Button>
        ) : (
          <Button
            onClick={handleStop}
            disabled={isSubmitting}
            variant="secondary"
            className="px-8"
          >
            {isSubmitting ? "Stopping..." : "Stop Timer"}
          </Button>
        )}
      </div>

      {/* Recent sessions placeholder */}
      <div className="mt-8">
        <h3 className="font-medium text-sm mb-3">Recent Sessions</h3>
        <div className="text-center p-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-md">
          <p className="text-foreground/60 text-sm">
            No recent sessions to display
          </p>
        </div>
      </div>
    </div>
  );
}