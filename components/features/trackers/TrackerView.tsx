"use client";

import { Tracker, TrackerType } from "@/types";
import TimerTracker from "./types/TimerTracker";
import CounterTracker from "./types/CounterTracker";
import AmountTracker from "./types/AmountTracker";
import OccurrenceTracker from "./types/OccurrenceTracker";
import CustomTracker from "./types/CustomTracker";
import { useState } from "react";

interface TrackerViewProps {
  tracker: Tracker;
  onUpdate?: () => void;
}

/**
 * TrackerView component that renders the appropriate tracker component based on type
 */
export default function TrackerView( { tracker, onUpdate }: TrackerViewProps ) {
  const [ isLoading, setIsLoading ] = useState( false );

  // Render the appropriate tracker component based on type
  const renderTrackerByType = () => {
    switch ( tracker.type ) {
      case TrackerType.TIMER:
        return <TimerTracker tracker={tracker} onUpdate={onUpdate} />;
      case TrackerType.COUNTER:
        return <CounterTracker tracker={tracker} onUpdate={onUpdate} />;
      case TrackerType.AMOUNT:
        return <AmountTracker tracker={tracker} onUpdate={onUpdate} />;
      case TrackerType.OCCURRENCE:
        return <OccurrenceTracker tracker={tracker} onUpdate={onUpdate} />;
      case TrackerType.CUSTOM:
        return <CustomTracker tracker={tracker} onUpdate={onUpdate} />;
      default:
        return (
          <div className="p-6 bg-background border border-border rounded-lg shadow-sm">
            <p className="text-center text-red-500">Unknown tracker type</p>
          </div>
        );
    }
  };

  return (
    <div className="tracker-view">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">{tracker.name}</h2>
          {tracker.description && (
            <p className="text-foreground/70 mt-1">{tracker.description}</p>
          )}
        </div>

        {/* Tags display */}
        {tracker.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap justify-end">
            {tracker.tags.map( ( tag ) => (
              <span
                key={tag}
                className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs"
              >
                {tag}
              </span>
            ) )}
          </div>
        )}
      </div>

      {/* Render the appropriate tracker component */}
      {isLoading ? (
        <div className="flex items-center justify-center p-10">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        renderTrackerByType()
      )}
    </div>
  );
}