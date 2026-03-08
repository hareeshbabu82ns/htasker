"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tracker, TrackerEntry, TrackerType } from "@/types";
import { useEntriesQuery, useAddEntryMutation } from "@/hooks/useTrackerQuery";
import { trackerKeys } from "@/hooks/queries/trackerQueries";
import EntryPagination from "../EntryPagination";
import EditEntryModal from "../EditEntryModal";

interface CustomTrackerProps {
  tracker: Tracker;
  onUpdate?: () => void;
}

export default function CustomTracker( { tracker, onUpdate }: CustomTrackerProps ) {
  const queryClient = useQueryClient();

  const [ value, setValue ] = useState( "" );
  const [ note, setNote ] = useState( "" );
  const [ customTags, setCustomTags ] = useState<string[]>( [] );
  const [ tagInput, setTagInput ] = useState( "" );
  const [ currentPage, setCurrentPage ] = useState( 1 );
  const [ currentLimit, setCurrentLimit ] = useState( 10 );

  const entriesQuery = useEntriesQuery( tracker.id, currentPage, currentLimit );
  const addEntryMutation = useAddEntryMutation( tracker.id );

  const entries = ( entriesQuery.data?.entries ?? [] ) as TrackerEntry[];
  const totalEntries = entriesQuery.data?.total ?? 0;
  const isLoadingEntries = entriesQuery.isLoading;

  const handleEntryUpdated = () => {
    void queryClient.invalidateQueries( { queryKey: trackerKeys.detail( tracker.id ) } );
    void queryClient.invalidateQueries( { queryKey: [ "entries", tracker.id ] } );
  };

  const formatDate = ( date: Date ) => {
    return new Intl.DateTimeFormat( "en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    } ).format( new Date( date ) );
  };

  const handleAddTag = () => {
    if ( tagInput.trim() && !customTags.includes( tagInput.trim() ) ) {
      setCustomTags( [ ...customTags, tagInput.trim() ] );
      setTagInput( "" );
    }
  };

  const handleTagKeyPress = ( e: React.KeyboardEvent<HTMLInputElement> ) => {
    if ( e.key === "Enter" ) {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = ( tagToRemove: string ) => {
    setCustomTags( customTags.filter( ( tag ) => tag !== tagToRemove ) );
  };

  const handleSubmit = ( e: React.FormEvent ) => {
    e.preventDefault();

    const parsedValue = value.trim() ? parseFloat( value.trim() ) : undefined;

    addEntryMutation.mutate(
      {
        trackerId: tracker.id,
        date: new Date(),
        value: parsedValue !== undefined && !isNaN( parsedValue ) ? parsedValue : null,
        note: note.trim() || null,
        tags: customTags,
      },
      {
        onSuccess: () => {
          setValue( "" );
          setNote( "" );
          setCustomTags( [] );
          if ( onUpdate ) onUpdate();
        },
      }
    );
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
            <Button type="button" onClick={handleAddTag} variant="secondary" size="sm" className="h-11">
              Add
            </Button>
          </div>

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
                    className="ml-2 text-primary hover:text-primary/70 min-h-[44px] min-w-[44px] flex items-center justify-center"
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
            disabled={
              addEntryMutation.isPending ||
              ( !value.trim() && !note.trim() && customTags.length === 0 )
            }
            className="px-8 h-11"
            style={{ backgroundColor: tracker.color || undefined }}
          >
            {addEntryMutation.isPending ? "Saving..." : "Save Entry"}
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
          <>
            <div className="space-y-3">
              {entries.map( ( entry ) => (
                <div key={entry.id} className="border border-border rounded-md p-3 text-sm">
                  <div className="flex justify-between items-start">
                    <div className="flex-grow">
                      {entry.value !== null && entry.value !== undefined && (
                        <div className="font-medium">Value: {entry.value}</div>
                      )}
                      {entry.note && (
                        <div className="text-sm text-foreground/70 mt-1">{entry.note}</div>
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
                    <EditEntryModal
                      entry={entry}
                      trackerType={TrackerType.CUSTOM}
                      onSuccess={handleEntryUpdated}
                    />
                  </div>
                </div>
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
              No recent entries to display
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
