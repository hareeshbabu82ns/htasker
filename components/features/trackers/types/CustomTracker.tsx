"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tracker, TrackerEntry } from "@/types";
import { useTracker } from "@/hooks/useTracker";

interface CustomTrackerProps {
  tracker: Tracker;
  onUpdate?: () => void;
}

export default function CustomTracker( { tracker, onUpdate }: CustomTrackerProps ) {
  const { addEntry, fetchEntries } = useTracker();
  const [ isLoading, setIsLoading ] = useState( false );
  const [ value, setValue ] = useState( "" );
  const [ note, setNote ] = useState( "" );
  const [ customTags, setCustomTags ] = useState<string[]>( [] );
  const [ tagInput, setTagInput ] = useState( "" );
  const [ entries, setEntries ] = useState<TrackerEntry[]>( [] );
  const [ isLoadingEntries, setIsLoadingEntries ] = useState( false );

  // Fetch entries when component mounts or after updates
  useEffect( () => {
    const loadEntries = async () => {
      setIsLoadingEntries( true );
      try {
        const response = await fetchEntries( {
          trackerId: tracker.id,
          limit: 10
        } );

        if ( response.success && response.data ) {
          setEntries( response.data as TrackerEntry[] );
        }
      } catch ( error ) {
        console.error( "Failed to fetch custom entries:", error );
      } finally {
        setIsLoadingEntries( false );
      }
    };

    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ tracker.id ] );

  // Format date for display
  const formatDate = ( date: Date ) => {
    return new Intl.DateTimeFormat( "en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    } ).format( new Date( date ) );
  };

  // Handle adding a new tag
  const handleAddTag = () => {
    if ( tagInput.trim() && !customTags.includes( tagInput.trim() ) ) {
      setCustomTags( [ ...customTags, tagInput.trim() ] );
      setTagInput( "" );
    }
  };

  // Handle tag key press (Enter)
  const handleTagKeyPress = ( e: React.KeyboardEvent<HTMLInputElement> ) => {
    if ( e.key === "Enter" ) {
      e.preventDefault();
      handleAddTag();
    }
  };

  // Handle removing a tag
  const handleRemoveTag = ( tagToRemove: string ) => {
    setCustomTags( customTags.filter( tag => tag !== tagToRemove ) );
  };

  // Handle form submission
  const handleSubmit = async ( e: React.FormEvent ) => {
    e.preventDefault();
    setIsLoading( true );

    try {
      const formData = new FormData();
      formData.append( "trackerId", tracker.id );
      formData.append( "date", new Date().toISOString() );

      // Add value if present
      if ( value.trim() ) {
        formData.append( "value", value.trim() );
      }

      // Add note if present
      if ( note.trim() ) {
        formData.append( "note", note.trim() );
      }

      // Add custom tags
      customTags.forEach( tag => {
        formData.append( "tags", tag );
      } );

      // Submit the entry
      await addEntry( formData );

      // Reset form
      setValue( "" );
      setNote( "" );
      setCustomTags( [] );

      // Refresh entries list after adding new entry
      const result = await fetchEntries( {
        trackerId: tracker.id,
        limit: 10
      } );

      if ( result.success ) {
        setEntries( result.data as TrackerEntry[] );
      }

      // Call the onUpdate callback if provided
      if ( onUpdate ) onUpdate();
    } catch ( error ) {
      console.error( "Failed to create custom entry:", error );
    } finally {
      setIsLoading( false );
    }
  };

  return (
    <div className="bg-background border border-border p-6 rounded-lg shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Value field */}
        <div className="space-y-2">
          <label htmlFor="custom-value" className="block text-sm font-medium">
            Value (optional)
          </label>
          <input
            type="text"
            id="custom-value"
            value={value}
            onChange={( e ) => setValue( e.target.value )}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-primary/50 focus:border-primary bg-background"
            placeholder="Enter a value for this entry..."
          />
        </div>

        {/* Note field */}
        <div className="space-y-2">
          <label htmlFor="custom-note" className="block text-sm font-medium">
            Note
          </label>
          <textarea
            id="custom-note"
            rows={3}
            value={note}
            onChange={( e ) => setNote( e.target.value )}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-primary/50 focus:border-primary bg-background"
            placeholder="Add a note to describe this entry..."
          />
        </div>

        {/* Custom tags */}
        <div className="space-y-2">
          <label htmlFor="custom-tags" className="block text-sm font-medium">
            Tags
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              id="custom-tags"
              value={tagInput}
              onChange={( e ) => setTagInput( e.target.value )}
              onKeyPress={handleTagKeyPress}
              className="flex-grow px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-primary/50 focus:border-primary bg-background"
              placeholder="Add tags (press Enter)"
            />
            <Button
              type="button"
              onClick={handleAddTag}
              variant="secondary"
              size="sm"
            >
              Add
            </Button>
          </div>

          {/* Tag list */}
          {customTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {customTags.map( ( tag ) => (
                <div
                  key={tag}
                  className="flex items-center bg-primary/10 text-primary px-2 py-1 rounded-full text-sm"
                >
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag( tag )}
                    className="ml-2 text-primary hover:text-primary/70"
                  >
                    &times;
                  </button>
                </div>
              ) )}
            </div>
          )}
        </div>

        {/* Submit button */}
        <div className="flex justify-center mt-6">
          <Button
            type="submit"
            disabled={isLoading || ( !value.trim() && !note.trim() && customTags.length === 0 )}
            className="px-8"
            style={{ backgroundColor: tracker.color || undefined }}
          >
            {isLoading ? "Saving..." : "Save Entry"}
          </Button>
        </div>
      </form>

      {/* History section */}
      <div className="mt-8">
        <h3 className="font-medium text-sm mb-3">Recent Entries</h3>
        {isLoadingEntries ? (
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : entries.length > 0 ? (
          <div className="space-y-3">
            {entries.map( ( entry ) => (
              <div key={entry.id} className="border border-border rounded-md p-3 text-sm">
                <div className="flex justify-between items-start">
                  <div className="flex-grow">
                    {entry.value && (
                      <div className="font-medium">
                        Value: {entry.value}
                      </div>
                    )}
                    {entry.note && (
                      <div className="text-sm text-foreground/70 mt-1">
                        {entry.note}
                      </div>
                    )}
                    <div className="text-xs text-foreground/50 mt-1">
                      {formatDate( entry.date )}
                    </div>
                  </div>

                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 ml-2">
                      {entry.tags.map( ( tag ) => (
                        <span
                          key={tag}
                          className="inline-block text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                        >
                          {tag}
                        </span>
                      ) )}
                    </div>
                  )}
                </div>
              </div>
            ) )}
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