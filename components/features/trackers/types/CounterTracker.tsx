"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tracker } from "@/types";
import { useTracker } from "@/hooks/useTracker";

interface CounterTrackerProps {
  tracker: Tracker;
  onUpdate?: () => void;
}

export default function CounterTracker({ tracker, onUpdate }: CounterTrackerProps) {
  const { addEntry } = useTracker();
  const [currentValue, setCurrentValue] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [changeAmount, setChangeAmount] = useState(1);

  // Handle incrementing the counter
  const handleIncrement = async () => {
    setIsLoading(true);
    try {
      const newValue = currentValue + changeAmount;
      
      // Create form data for the entry
      const formData = new FormData();
      formData.append("trackerId", tracker.id);
      formData.append("value", changeAmount.toString());
      formData.append("date", new Date().toISOString());

      // Submit the entry
      await addEntry(formData);
      
      // Update local state
      setCurrentValue(newValue);
      
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Failed to increment counter:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle decrementing the counter
  const handleDecrement = async () => {
    setIsLoading(true);
    try {
      const newValue = currentValue - changeAmount;
      
      // Create form data for the entry
      const formData = new FormData();
      formData.append("trackerId", tracker.id);
      formData.append("value", (-changeAmount).toString());
      formData.append("date", new Date().toISOString());

      // Submit the entry
      await addEntry(formData);
      
      // Update local state
      setCurrentValue(newValue);
      
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Failed to decrement counter:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resetting the counter
  const handleReset = async () => {
    setIsLoading(true);
    try {
      // Calculate the amount to reset (negative of current value)
      const resetAmount = -currentValue;
      
      // Only create an entry if there's a change
      if (resetAmount !== 0) {
        const formData = new FormData();
        formData.append("trackerId", tracker.id);
        formData.append("value", resetAmount.toString());
        formData.append("date", new Date().toISOString());
        formData.append("note", "Counter reset");

        // Submit the entry
        await addEntry(formData);
      }
      
      // Reset to zero
      setCurrentValue(0);
      
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Failed to reset counter:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-background border border-border p-6 rounded-lg shadow-sm">
      {/* Counter display */}
      <div className="text-center mb-6">
        <div className="text-5xl font-semibold mb-2" style={{ color: tracker.color || "inherit" }}>
          {currentValue}
        </div>
        <div className="text-sm text-foreground/70">Current count</div>
      </div>

      {/* Counter increment/decrement controls */}
      <div className="flex flex-col space-y-4">
        {/* Change amount selector */}
        <div className="flex justify-center items-center space-x-2 mb-2">
          <span className="text-sm">Change amount:</span>
          <div className="flex border border-border rounded-md overflow-hidden">
            {[1, 5, 10].map((amount) => (
              <button
                key={amount}
                onClick={() => setChangeAmount(amount)}
                className={`px-3 py-1 text-sm ${
                  changeAmount === amount
                    ? "bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted"
                }`}
              >
                {amount}
              </button>
            ))}
          </div>
        </div>
        
        {/* Control buttons */}
        <div className="flex justify-center space-x-3">
          <Button
            onClick={handleDecrement}
            disabled={isLoading}
            variant="outline"
            className="w-16 h-16 rounded-full text-xl"
          >
            -
          </Button>
          
          <Button
            onClick={handleIncrement}
            disabled={isLoading}
            className="w-16 h-16 rounded-full text-xl"
            style={{ backgroundColor: tracker.color || undefined }}
          >
            +
          </Button>
        </div>
        
        {/* Reset button */}
        <div className="flex justify-center mt-4">
          <Button
            onClick={handleReset}
            disabled={isLoading || currentValue === 0}
            variant="ghost"
            size="sm"
            className="text-xs"
          >
            Reset to 0
          </Button>
        </div>
      </div>

      {/* History section */}
      <div className="mt-8">
        <h3 className="font-medium text-sm mb-3">Recent Changes</h3>
        <div className="text-center p-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-md">
          <p className="text-foreground/60 text-sm">
            No recent changes to display
          </p>
        </div>
      </div>
    </div>
  );
}