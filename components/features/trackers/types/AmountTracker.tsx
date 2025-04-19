"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tracker, TrackerEntry } from "@/types";
import { useTracker } from "@/hooks/useTracker";

interface AmountTrackerProps {
  tracker: Tracker;
  onUpdate?: () => void;
}

export default function AmountTracker({ tracker, onUpdate }: AmountTrackerProps) {
  const { addEntry, fetchEntries, isLoading: isHookLoading } = useTracker();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [displayedEntries, setDisplayedEntries] = useState<TrackerEntry[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isCalculatingTotal, setIsCalculatingTotal] = useState(false);

  // Fetch entries and calculate total when component mounts or tracker changes
  useEffect(() => {
    loadEntries();
    calculateTotalFromAllEntries();
  }, [tracker.id]);

  // Function to load entries for display in UI
  const loadEntries = async () => {
    setIsLoadingEntries(true);
    try {
      const result = await fetchEntries({
        trackerId: tracker.id,
        limit: 10, // Limit to most recent entries for display
      });
      
      if (result.success) {
        setDisplayedEntries(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch display entries:", error);
    } finally {
      setIsLoadingEntries(false);
    }
  };

  // Function to calculate total from ALL entries in database
  const calculateTotalFromAllEntries = async () => {
    setIsCalculatingTotal(true);
    try {
      // Using a large limit to effectively get all entries
      // In a production app, you might want to implement pagination or
      // create a dedicated server action for this calculation
      const result = await fetchEntries({
        trackerId: tracker.id,
        limit: 1000, // Very large limit to get all entries
      });
      
      if (result.success) {
        // Calculate total from all entries
        const total = result.data.reduce(
          (sum, entry) => sum + (entry.value || 0),
          0
        );
        setTotalAmount(total);
      }
    } catch (error) {
      console.error("Failed to calculate total:", error);
    } finally {
      setIsCalculatingTotal(false);
    }
  };

  // Handle submitting a new amount entry
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || isNaN(parseFloat(amount))) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const numericAmount = parseFloat(amount);
      
      // Create form data for the entry
      const formData = new FormData();
      formData.append("trackerId", tracker.id);
      formData.append("value", numericAmount.toString());
      formData.append("date", new Date().toISOString());
      
      if (note) {
        formData.append("note", note);
      }
      
      // Add currency as a tag
      formData.append("tags", currency);

      // Submit the entry
      const result = await addEntry(formData);
      
      if (result.success) {
        // Reset form and reload entries
        setAmount("");
        setNote("");
        await loadEntries();
        await calculateTotalFromAllEntries();
        
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error("Failed to add amount:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Common currency options
  const currencies = [
    { code: "USD", symbol: "$" },
    { code: "EUR", symbol: "€" },
    { code: "GBP", symbol: "£" },
    { code: "JPY", symbol: "¥" },
    { code: "None", symbol: "" },
  ];

  // Format currency amount
  const formatCurrency = (value: number) => {
    const currencyObj = currencies.find(c => c.code === currency);
    
    if (!currencyObj || currencyObj.code === "None") {
      return value.toFixed(2);
    }
    
    return `${currencyObj.symbol}${value.toFixed(2)}`;
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-background border border-border p-6 rounded-lg shadow-sm">
      {/* Current total */}
      <div className="text-center mb-6">
        <div className="text-4xl font-semibold mb-2" style={{ color: tracker.color || "inherit" }}>
          {isCalculatingTotal ? (
            <span className="text-2xl text-foreground/50">Calculating...</span>
          ) : (
            formatCurrency(totalAmount)
          )}
        </div>
        <div className="text-sm text-foreground/70">Total amount</div>
      </div>

      {/* Amount entry form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Amount input with currency selector */}
        <div className="grid grid-cols-4 gap-2">
          <div className="col-span-1">
            <select
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-primary/50 focus:border-primary bg-background"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {currencies.map((curr) => (
                <option key={curr.code} value={curr.code}>
                  {curr.code}
                </option>
              ))}
            </select>
          </div>
          
          <div className="col-span-3">
            <input
              type="number"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-primary/50 focus:border-primary bg-background"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
        </div>
        
        {/* Note input */}
        <div>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-primary/50 focus:border-primary bg-background"
            placeholder="Add a note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {/* Submit button */}
        <div className="flex justify-center">
          <Button
            type="submit"
            disabled={isSubmitting || !amount || isNaN(parseFloat(amount))}
            className="px-8"
            style={{ backgroundColor: tracker.color || undefined }}
          >
            {isSubmitting ? "Adding..." : "Add Amount"}
          </Button>
        </div>
      </form>

      {/* History section */}
      <div className="mt-8">
        <h3 className="font-medium text-sm mb-3">Recent Entries</h3>
        
        {isLoadingEntries ? (
          <div className="text-center p-4">
            <p className="text-foreground/60">Loading entries...</p>
          </div>
        ) : displayedEntries.length > 0 ? (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {displayedEntries.map((entry) => (
              <div 
                key={entry.id} 
                className="flex justify-between items-center p-3 border border-gray-200 dark:border-gray-800 rounded-md bg-background/50"
              >
                <div>
                  <div className="font-medium">
                    {formatCurrency(entry.value || 0)}
                  </div>
                  {entry.note && (
                    <div className="text-sm text-foreground/70">{entry.note}</div>
                  )}
                  <div className="text-xs text-foreground/50">
                    {formatDate(entry.date)}
                  </div>
                </div>
                <div>
                  {entry.tags?.map((tag) => (
                    <span 
                      key={tag} 
                      className="inline-block text-xs px-2 py-1 rounded-full bg-primary/10 text-primary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-md">
            <p className="text-foreground/60 text-sm">
              No recent entries to display
            </p>
          </div>
        )}
      </div>
    </div>
  );
}