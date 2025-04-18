import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getTrackers } from "@/app/actions/trackers";
import { TrackerStatus, TrackerType } from "@/types";

export default async function TrackersPage( {
  searchParams,
}: {
  searchParams: { [ key: string ]: string | string[] | undefined };
} ) {
  // Get filter parameters from URL search params
  const statusFilter = searchParams.status as TrackerStatus | undefined;
  const typeFilter = searchParams.type as TrackerType | undefined;
  const searchQuery = searchParams.q as string | undefined;
  const sortOrder = searchParams.sort as string | undefined;

  // Fetch trackers (in a real app we would pass these filters to the server)
  const response = await getTrackers();
  let trackers = response.success ? ( response.data as any[] ) : [];

  // Apply client-side filters (for demo purposes)
  if ( statusFilter ) {
    trackers = trackers.filter( tracker => tracker.status === statusFilter );
  }

  if ( typeFilter ) {
    trackers = trackers.filter( tracker => tracker.type === typeFilter );
  }

  if ( searchQuery ) {
    const query = searchQuery.toLowerCase();
    trackers = trackers.filter( tracker =>
      tracker.name.toLowerCase().includes( query ) ||
      ( tracker.description && tracker.description.toLowerCase().includes( query ) ) ||
      tracker.tags.some( ( tag: string ) => tag.toLowerCase().includes( query ) )
    );
  }

  // Apply sort order
  if ( sortOrder ) {
    switch ( sortOrder ) {
      case "name":
        trackers = trackers.sort( ( a, b ) => a.name.localeCompare( b.name ) );
        break;
      case "recent":
        trackers = trackers.sort( ( a, b ) => new Date( b.updatedAt ).getTime() - new Date( a.updatedAt ).getTime() );
        break;
      case "created":
        trackers = trackers.sort( ( a, b ) => new Date( b.createdAt ).getTime() - new Date( a.createdAt ).getTime() );
        break;
    }
  } else {
    // Default sort by most recently updated
    trackers = trackers.sort( ( a, b ) => new Date( b.updatedAt ).getTime() - new Date( a.updatedAt ).getTime() );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-semibold">All Trackers</h1>
        <Link href="/dashboard/trackers/new" passHref>
          <Button>Create New Tracker</Button>
        </Link>
      </div>

      {/* Filter and search controls */}
      <div className="bg-background border border-border p-4 rounded-lg space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-grow">
            <input
              type="text"
              placeholder="Search trackers..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-primary/50 focus:border-primary bg-background"
              defaultValue={searchQuery || ""}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {/* Status filter */}
            <select
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-primary/50 focus:border-primary bg-background"
              defaultValue={statusFilter || ""}
            >
              <option value="">All Status</option>
              <option value={TrackerStatus.ACTIVE}>Active</option>
              <option value={TrackerStatus.INACTIVE}>Inactive</option>
              <option value={TrackerStatus.ARCHIVED}>Archived</option>
            </select>

            {/* Type filter */}
            <select
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-primary/50 focus:border-primary bg-background"
              defaultValue={typeFilter || ""}
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
              defaultValue={sortOrder || "recent"}
            >
              <option value="recent">Recently Used</option>
              <option value="name">Name (A-Z)</option>
              <option value="created">Newest First</option>
            </select>
          </div>

          <Button type="button">Apply Filters</Button>
        </div>
      </div>

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