'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getTrackers, TrackerWithEntriesCount } from '@/app/actions/trackers';
import { RefreshCw } from 'lucide-react';
import TrackerCard from '@/components/features/trackers/TrackerCard';
import { useEffect, useState, useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

const LIMIT_OPTIONS = [ 5, 10, 15, 25 ];

export default function RecentTrackers() {
  const [ displayTrackers, setDisplayTrackers ] = useState<TrackerWithEntriesCount[]>( [] );
  const [ isLoading, setIsLoading ] = useState( true );
  const [ limit, setLimit ] = useState<number>( LIMIT_OPTIONS[ 0 ] ); // Default limit

  const fetchAndProcessTrackers = useCallback( async ( currentLimit: number ) => {
    setIsLoading( true );
    try {
      // Fetch all trackers initially (consider optimizing if performance becomes an issue)
      const response = await getTrackers();
      const allTrackers = response.success ? ( response.data.trackers as TrackerWithEntriesCount[] ) : [];

      // Process trackers to include only the active ones and not archived
      const activeTrackers = allTrackers.filter( tracker => tracker.status !== 'ARCHIVED' );

      // Get the most recently updated trackers (based on updatedAt)
      const recentTrackers = [ ...activeTrackers ]
        .sort( ( a, b ) => new Date( b.updatedAt ).getTime() - new Date( a.updatedAt ).getTime() )
        .slice( 0, currentLimit ); // Use currentLimit for slicing

      // Get the most frequently used trackers (based on entry count)
      const frequentTrackers = [ ...activeTrackers ]
        .sort( ( a, b ) => b.entriesCount - a.entriesCount )
        .slice( 0, currentLimit ); // Use currentLimit for slicing

      // Combine and deduplicate (prioritizing recently used)
      const combinedTrackers = [ ...recentTrackers ];
      for ( const tracker of frequentTrackers ) {
        // Add only if not already present and we haven't reached the limit
        if ( !combinedTrackers.some( t => t.id === tracker.id ) && combinedTrackers.length < currentLimit ) {
          combinedTrackers.push( tracker );
        }
      }

      // Ensure the final list respects the limit
      setDisplayTrackers( combinedTrackers.slice( 0, currentLimit ) );
    } catch ( error ) {
      console.error( "Failed to fetch trackers:", error );
      setDisplayTrackers( [] );
    } finally {
      setIsLoading( false );
    }
  }, [] ); // Removed limit from dependencies here, pass it directly

  useEffect( () => {
    fetchAndProcessTrackers( limit );
  }, [ fetchAndProcessTrackers, limit ] ); // Add limit as a dependency

  const handleRefresh = () => {
    fetchAndProcessTrackers( limit );
  };

  const handleLimitChange = ( value: string ) => {
    const newLimit = parseInt( value, 10 );
    if ( !isNaN( newLimit ) && LIMIT_OPTIONS.includes( newLimit ) ) {
      setLimit( newLimit );
      // Fetching is handled by the useEffect hook reacting to limit change
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h2 className="text-xl font-semibold">Recent Trackers</h2>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/trackers" passHref>View All</Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading}
            aria-label="Refresh recent trackers"
            className="h-8 w-8" // Match height with select trigger
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Select value={limit.toString()} onValueChange={handleLimitChange} disabled={isLoading}>
            <SelectTrigger id="recent-limit" className="h-8 w-[70px]">
              <SelectValue placeholder="Limit" />
            </SelectTrigger>
            <SelectContent>
              {LIMIT_OPTIONS.map( ( option ) => (
                <SelectItem key={option} value={option.toString()}>
                  {option}
                </SelectItem>
              ) )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          // Optional: Add Skeleton loaders here
          <p>Loading trackers...</p>
        ) : displayTrackers.length > 0 ? (
          displayTrackers.map( ( tracker ) => (
            <TrackerCard key={tracker.id} tracker={tracker} />
          ) )
        ) : (
          <div className="bg-background border border-border rounded-lg p-6 text-center">
            <p className="text-foreground/70">No recent trackers found</p>
            <Link href="/trackers/new" passHref className="mt-2 inline-block">
              <Button variant="outline" size="sm">Create Your First Tracker</Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
