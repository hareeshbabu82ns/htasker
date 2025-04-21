import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getTrackers, TrackerWithEntriesCount } from "@/app/actions/trackers";
import { TrackerStatus, TrackerType } from "@/types";
import TrackerFilters from "@/components/features/trackers/TrackerFilters";
import TrackerCard from "@/components/features/trackers/TrackerCard";
import Pagination from "@/components/features/trackers/Pagination";

const PAGE_LIMIT_DEFAULT = 10;

export default async function TrackersPage( {
  searchParams,
}: {
  searchParams: Promise<{ [ key: string ]: string | string[] | undefined | unknown }>;
} ) {
  const resolvedSearchParams = await searchParams;

  // Get filter parameters from URL search params
  const statusFilter = resolvedSearchParams.status as TrackerStatus | undefined;
  const typeFilter = resolvedSearchParams.type as TrackerType | undefined;
  const searchQuery = resolvedSearchParams.q as string | undefined;
  const sortOrder = resolvedSearchParams.sort as string | undefined;

  // Get pagination parameters from URL search params
  const currentPage = resolvedSearchParams.page
    ? parseInt( resolvedSearchParams.page as string, 10 )
    : 1;
  const limit = resolvedSearchParams.limit
    ? parseInt( resolvedSearchParams.limit as string, 10 )
    : PAGE_LIMIT_DEFAULT;

  // Pass filters and pagination params to getTrackers
  const response = await getTrackers( {
    status: statusFilter,
    type: typeFilter,
    search: searchQuery,
    sort: sortOrder,
    page: currentPage,
    limit: limit,
  } );

  // Extract data from the response
  let trackers: TrackerWithEntriesCount[] = [];
  let totalPages = 1;
  let total = 0;
  let page = 1;

  if ( response.success ) {
    trackers = response.data.trackers;
    totalPages = response.data.totalPages;
    total = response.data.total;
    page = response.data.page;
  }

  // Build the base URL for pagination links (preserving all current filters)
  const createBaseUrl = () => {
    const params = new URLSearchParams();

    if ( statusFilter ) params.set( "status", statusFilter );
    if ( typeFilter ) params.set( "type", typeFilter );
    if ( searchQuery ) params.set( "q", searchQuery );
    if ( sortOrder ) params.set( "sort", sortOrder );
    if ( limit !== 10 ) params.set( "limit", limit.toString() );

    return params;
  };

  const baseParams = createBaseUrl();
  const baseUrl = `/trackers?${baseParams.toString()}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-semibold">All Trackers</h1>
        <Link href="/trackers/new" passHref>
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
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-muted-foreground">
                Showing {page * limit - limit + 1} to {Math.min( page * limit, total )} of {total} trackers
              </div>
              {/* Pagination controls */}
              <div className="flex items-center gap-4">
                {totalPages > 1 && (
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    currentLimit={limit}
                    baseUrl={baseUrl}
                  />
                )}
              </div>
            </div>

            {trackers.map( ( tracker ) => (
              <TrackerCard key={tracker.id} tracker={tracker} showEdit />
            ) )}

            {/* Bottom pagination controls */}
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-muted-foreground">
                Showing {page * limit - limit + 1} to {Math.min( page * limit, total )} of {total} trackers
              </div>
              {totalPages > 1 && (
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  currentLimit={limit}
                  baseUrl={baseUrl}
                />
              )}
            </div>
          </>
        ) : (
          <div className="bg-background border border-border rounded-lg p-6 text-center">
            <p className="text-foreground/70">No trackers found</p>
            <Link href="/trackers/new" className="mt-2 inline-block">
              <Button variant="outline" size="sm">
                Create Your First Tracker
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}