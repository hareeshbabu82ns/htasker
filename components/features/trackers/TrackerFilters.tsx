"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { TrackerStatus, TrackerType } from "@/types";
import { useDebounce } from "@/hooks/useDebounce";

interface TrackerFiltersProps {
  defaultStatus?: string;
  defaultType?: string;
  defaultQuery?: string;
  defaultSort?: string;
}

export default function TrackerFilters( {
  defaultStatus,
  defaultType,
  defaultQuery,
  defaultSort = "recent",
}: TrackerFiltersProps ) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ isPending, startTransition ] = useTransition();

  const [ statusFilter, setStatusFilter ] = useState( defaultStatus || "" );
  const [ typeFilter, setTypeFilter ] = useState( defaultType || "" );
  const [ searchQuery, setSearchQuery ] = useState( defaultQuery || "" );
  const [ sortOrder, setSortOrder ] = useState( defaultSort || "recent" );

  // Debounce the filter values to prevent excessive URL updates
  const debouncedSearchQuery = useDebounce( searchQuery, 500 );
  const debouncedStatusFilter = useDebounce( statusFilter, 300 );
  const debouncedTypeFilter = useDebounce( typeFilter, 300 );
  const debouncedSortOrder = useDebounce( sortOrder, 300 );

  // Apply filters when debounced values change
  useEffect( () => {
    applyFilters();
  }, [ debouncedSearchQuery, debouncedStatusFilter, debouncedTypeFilter, debouncedSortOrder ] );

  // Apply filters by updating the URL search parameters
  const applyFilters = () => {
    startTransition( () => {
      // Create a new URLSearchParams object based on current params
      const params = new URLSearchParams( searchParams.toString() );

      // Always remove page parameter when filters change to reset pagination
      params.delete( "page" );

      // Handle search query parameter (set or delete)
      if ( debouncedSearchQuery ) {
        params.set( "q", debouncedSearchQuery );
      } else {
        params.delete( "q" );
      }

      // Handle status filter parameter (set or delete)
      if ( debouncedStatusFilter ) {
        params.set( "status", debouncedStatusFilter );
      } else {
        params.delete( "status" );
      }

      // Handle type filter parameter (set or delete)
      if ( debouncedTypeFilter ) {
        params.set( "type", debouncedTypeFilter );
      } else {
        params.delete( "type" );
      }

      // Handle sort order parameter (set or delete)
      if ( debouncedSortOrder && debouncedSortOrder !== "recent" ) {
        params.set( "sort", debouncedSortOrder );
      } else {
        params.delete( "sort" );
      }

      // Update the URL with the new search parameters
      router.push( `/trackers?${params.toString()}` );
    } );
  };

  // Clear all filters
  const handleClearFilters = () => {
    // Reset all filter states to their defaults
    setStatusFilter( "" );
    setTypeFilter( "" );
    setSearchQuery( "" );
    setSortOrder( "recent" );

    // Update the URL to remove all search parameters
    startTransition( () => {
      router.push( "/trackers" );
    } );
  };

  return (
    <div className="bg-background border border-border p-4 rounded-lg space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-grow relative">
          <input
            type="text"
            placeholder="Search trackers..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-primary/50 focus:border-primary bg-background"
            value={searchQuery}
            onChange={( e ) => setSearchQuery( e.target.value )}
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {/* Status filter */}
          <select
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-primary/50 focus:border-primary bg-background"
            value={statusFilter}
            onChange={( e ) => setStatusFilter( e.target.value )}
          >
            <option value="">All Status</option>
            <option value={TrackerStatus.ACTIVE}>Active</option>
            <option value={TrackerStatus.INACTIVE}>Inactive</option>
            <option value={TrackerStatus.ARCHIVED}>Archived</option>
          </select>

          {/* Type filter */}
          <select
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-primary/50 focus:border-primary bg-background"
            value={typeFilter}
            onChange={( e ) => setTypeFilter( e.target.value )}
          >
            <option value="">All Types</option>
            <option value={TrackerType.TIMER}>Timer</option>
            <option value={TrackerType.COUNTER}>Counter</option>
            <option value={TrackerType.AMOUNT}>Amount</option>
            <option value={TrackerType.OCCURRENCE}>Occurrence</option>
            <option value={TrackerType.CUSTOM}>Custom</option>
          </select>

          {/* Sort order */}
          <select
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-primary/50 focus:border-primary bg-background"
            value={sortOrder}
            onChange={( e ) => setSortOrder( e.target.value )}
          >
            <option value="recent">Recently Used</option>
            <option value="name">Name (A-Z)</option>
            <option value="created">Newest First</option>
          </select>
        </div>

        {/* Clear filters button - always visible */}
        <Button
          type="button"
          onClick={handleClearFilters}
          disabled={isPending}
          variant="outline"
          size="sm"
          className="h-10 w-10 flex-shrink-0"
          aria-label="Clear filters"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </Button>
      </div>
      {isPending && (
        <div className="text-xs text-muted-foreground text-right">
          Updating filters...
        </div>
      )}
    </div>
  );
}