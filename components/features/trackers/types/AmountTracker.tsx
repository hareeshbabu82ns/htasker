"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tracker } from "@/types";
import { useTracker } from "@/hooks/useTracker";

interface AmountTrackerProps {
  tracker: Tracker;
  onUpdate?: () => void;
}

export default function AmountTracker({ tracker, onUpdate }: AmountTrackerProps) {
  const { addEntry } = useTracker();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [total, setTotal] = useState(0);

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
        // Update total and reset form
        setTotal(total + numericAmount);
        setAmount("");
        setNote("");
        
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

  return (
    <div className="bg-background border border-border p-6 rounded-lg shadow-sm">
      {/* Current total */}
      <div className="text-center mb-6">
        <div className="text-4xl font-semibold mb-2" style={{ color: tracker.color || "inherit" }}>
          {formatCurrency(total)}
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
        <div className="text-center p-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-md">
          <p className="text-foreground/60 text-sm">
            No recent entries to display
          </p>
        </div>
      </div>
    </div>
  );
}