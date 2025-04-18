"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tracker } from "@/types";
import { useTracker } from "@/hooks/useTracker";

interface TimerTrackerProps {
  tracker: Tracker;
  onUpdate?: () => void;
}

export default function TimerTracker( { tracker, onUpdate }: TimerTrackerProps ) {
  const { addEntry } = useTracker();
  const [ isRunning, setIsRunning ] = useState( false );
  const [ startTime, setStartTime ] = useState<Date | null>( null );
  const [ elapsedTime, setElapsedTime ] = useState( 0 ); // in milliseconds
  const [ isLoading, setIsLoading ] = useState( false );

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
            className="px-8 py-2"
            style={{ backgroundColor: tracker.color || undefined }}
          >
            Start Timer
          </Button>
        ) : (
          <Button
            onClick={handleStop}
            disabled={isLoading}
            variant="outline"
            className="px-8 py-2 border-2"
            style={{ borderColor: tracker.color || undefined }}
          >
            Stop Timer
          </Button>
        )}
      </div>

      {/* History section */}
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