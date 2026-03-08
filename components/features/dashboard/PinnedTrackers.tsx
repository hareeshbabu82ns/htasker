'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getTrackers, TrackerWithEntriesCount } from '@/app/actions/trackers';
import { Pin, RefreshCw } from 'lucide-react';
import TrackerCard from '@/components/features/trackers/TrackerCard';
import { useEffect, useState, useCallback } from 'react';
import { TrackerStatus } from '@/types';

export default function PinnedTrackers() {
  const [ pinnedTrackers, setPinnedTrackers ] = useState<TrackerWithEntriesCount[]>( [] );
  const [ isLoading, setIsLoading ] = useState( true );

  const fetchPinnedTrackers = useCallback( async () => {
    setIsLoading( true );
    try {
      const response = await getTrackers( { pinned: true, limit: 100 } );
      if ( response.success ) {
        // Exclude archived trackers
        const active = response.data.trackers.filter(
          ( t ) => t.status !== TrackerStatus.ARCHIVED
        );
        setPinnedTrackers( active );
      } else {
        setPinnedTrackers( [] );
      }
    } catch ( error ) {
      console.error( 'Failed to fetch pinned trackers:', error );
      setPinnedTrackers( [] );
    } finally {
      setIsLoading( false );
    }
  }, [] );

  useEffect( () => {
    fetchPinnedTrackers();
  }, [ fetchPinnedTrackers ] );

  // Re-fetch when any TrackerCard signals a pin change
  useEffect( () => {
    const handler = () => fetchPinnedTrackers();
    window.addEventListener( 'pinned-trackers-changed', handler );
    return () => window.removeEventListener( 'pinned-trackers-changed', handler );
  }, [ fetchPinnedTrackers ] );

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pin className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Pinned Trackers</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchPinnedTrackers}
          disabled={isLoading}
          aria-label="Refresh pinned trackers"
          className="h-8 w-8"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        ) : pinnedTrackers.length > 0 ? (
          pinnedTrackers.map( ( tracker ) => (
            <TrackerCard key={tracker.id} tracker={tracker} showEdit />
          ) )
        ) : (
          <div className="bg-background border border-dashed border-border rounded-lg p-6 text-center">
            <Pin className="h-8 w-8 text-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-foreground/60">
              Pin trackers from the tracker card menu to see them here
            </p>
            <Link href="/trackers" passHref className="mt-3 inline-block">
              <Button variant="outline" size="sm">Browse Trackers</Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
