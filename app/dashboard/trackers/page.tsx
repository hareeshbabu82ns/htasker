import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getTrackers } from "@/app/actions/trackers";
import { TrackerStatus, TrackerType } from "@/types";
import TrackerFilters from "@/components/features/trackers/TrackerFilters";

export default async function TrackersPage( {
  searchParams,
}: {
  searchParams: { [ key: string ]: string | string[] | undefined | Promise<unknown> };
} ) {
  const resolvedSearchParams = await searchParams;

  // Get filter parameters from URL search params
  const statusFilter = resolvedSearchParams.status as TrackerStatus | undefined;
  const typeFilter = resolvedSearchParams.type as TrackerType | undefined;
  const searchQuery = resolvedSearchParams.q as string | undefined;
  const sortOrder = resolvedSearchParams.sort as string | undefined;

  // Pass filters directly to getTrackers for server-side filtering
  const response = await getTrackers( {
    status: statusFilter,
    type: typeFilter,
    search: searchQuery,
    sort: sortOrder,
  } );

  // Get the trackers from the response
  const trackers = response.success ? ( response.data as any[] ) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-semibold">All Trackers</h1>
        <Link href="/dashboard/trackers/new" passHref>
          <Button>Create New Tracker</Button>
        </Link>
      </div>

      {/* Filter and search controls */}
      <TrackerFilters
        defaultStatus={statusFilter}
        defaultType={typeFilter}
        defaultQuery={searchQuery}
        defaultSort={sortOrder || "recent"}
      />

      {/* Trackers list */}
      <div className="space-y-4">
        {trackers.length > 0 ? (
          trackers.map( ( tracker ) => (
            <TrackerListItem key={tracker.id} tracker={tracker} />
          ) )
        ) : (
          <div className="bg-background border border-border rounded-lg p-6 text-center">
            <p className="text-foreground/70">No trackers found</p>
            <Link href="/dashboard/trackers/new" className="mt-2 inline-block">
              <Button variant="outline" size="sm">Create Your First Tracker</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// Tracker List Item Component
function TrackerListItem( { tracker }: { tracker: any } ) {
  // Helper function to get the icon for tracker type
  const getTypeLabel = ( type: TrackerType ) => {
    switch ( type ) {
      case TrackerType.TIMER:
        return "Timer";
      case TrackerType.COUNTER:
        return "Counter";
      case TrackerType.AMOUNT:
        return "Amount";
      case TrackerType.OCCURRENCE:
        return "Occurrence";
      case TrackerType.CUSTOM:
        return "Custom";
      default:
        return "Unknown";
    }
  };

  // Helper function to format dates
  const formatDate = ( dateString: string ) => {
    return new Intl.DateTimeFormat( 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    } ).format( new Date( dateString ) );
  };

  return (
    <div className="bg-background border border-border rounded-lg p-4 hover:border-primary transition-colors">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex-grow">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{tracker.name}</h3>
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">
              {getTypeLabel( tracker.type )}
            </span>
            {tracker.status === TrackerStatus.ARCHIVED && (
              <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full text-xs">
                Archived
              </span>
            )}
          </div>

          {tracker.description && (
            <p className="text-sm text-foreground/70 mt-1">{tracker.description}</p>
          )}

          <div className="flex flex-wrap gap-2 mt-2">
            {tracker.tags && tracker.tags.map( ( tag: string ) => (
              <span key={tag} className="bg-primary/5 text-primary/90 px-2 py-0.5 rounded-full text-xs">
                {tag}
              </span>
            ) )}
          </div>

          <div className="flex items-center mt-2 text-xs text-foreground/60">
            <span>Created: {formatDate( tracker.createdAt )}</span>
            <span className="mx-2">•</span>
            <span>Last used: {formatDate( tracker.updatedAt )}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Link href={`/dashboard/trackers/${tracker.id}`} passHref>
            <Button variant="outline" size="sm">View</Button>
          </Link>
          <Link href={`/dashboard/trackers/${tracker.id}/edit`} passHref>
            <Button variant="ghost" size="sm">Edit</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}