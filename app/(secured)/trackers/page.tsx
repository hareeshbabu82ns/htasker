import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getTrackers, TrackerWithEntriesCount } from "@/app/actions/trackers";
import { TrackerStatus, TrackerType } from "@/types";
import TrackerFilters from "@/components/features/trackers/TrackerFilters";
import TrackerCard from "@/components/features/trackers/TrackerCard";

const PAGE_LIMIT_DEFAULT = 10;

// Type definition for pagination component props
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  getPaginationUrl: ( page: number ) => string;
}

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

  // Helper function to generate pagination URLs
  const getPaginationUrl = ( pageNumber: number ) => {
    const params = new URLSearchParams( baseParams );
    params.set( "page", pageNumber.toString() );
    return `/trackers?${params.toString()}`;
  };

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
                Showing {page * PAGE_LIMIT_DEFAULT - PAGE_LIMIT_DEFAULT + 1} to {Math.min( page * PAGE_LIMIT_DEFAULT, total )} of {total} trackers
              </div>
              {/* Pagination controls */}
              {totalPages > 1 && (
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  getPaginationUrl={getPaginationUrl}
                />
              )}
            </div>

            {trackers.map( ( tracker ) => (
              // <TrackerListItem key={tracker.id} tracker={tracker} />
              <TrackerCard
                key={tracker.id}
                tracker={tracker} showEdit />
            ) )}

            {/* Pagination controls */}
            {totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                getPaginationUrl={getPaginationUrl}
              />
            )}
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

// Pagination Component
function Pagination( { currentPage, totalPages, getPaginationUrl }: PaginationProps ) {
  // Create an array of page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;

    if ( totalPages <= maxPagesToShow ) {
      // If total pages is less than max to show, display all pages
      for ( let i = 1; i <= totalPages; i++ ) {
        pages.push( i );
      }
    } else {
      // Always include first page
      pages.push( 1 );

      // Calculate start and end of page range
      let start = Math.max( 2, currentPage - 1 );
      let end = Math.min( totalPages - 1, currentPage + 1 );

      // Adjust if at the beginning or end
      if ( currentPage <= 2 ) {
        end = Math.min( totalPages - 1, 4 );
      } else if ( currentPage >= totalPages - 1 ) {
        start = Math.max( 2, totalPages - 3 );
      }

      // Add ellipsis if needed before middle pages
      if ( start > 2 ) {
        pages.push( -1 ); // Use -1 to represent ellipsis
      }

      // Add middle pages
      for ( let i = start; i <= end; i++ ) {
        pages.push( i );
      }

      // Add ellipsis if needed after middle pages
      if ( end < totalPages - 1 ) {
        pages.push( -2 ); // Use -2 to represent ellipsis
      }

      // Always include last page
      pages.push( totalPages );
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex justify-end my-6">
      <nav className="flex items-center gap-1" aria-label="Pagination">
        {/* Previous page button */}
        <Link
          href={currentPage > 1 ? getPaginationUrl( currentPage - 1 ) : "#"}
          className={`px-2 py-2 text-sm font-medium rounded-md ${currentPage === 1
            ? "text-gray-400 cursor-not-allowed"
            : "text-primary hover:bg-primary/5"
            }`}
          aria-disabled={currentPage === 1}
          tabIndex={currentPage === 1 ? -1 : 0}
        >
          <span className="sr-only">Previous</span>
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>

        {/* Page numbers */}
        {pageNumbers.map( ( pageNum, i ) => {
          // Handle ellipsis
          if ( pageNum < 0 ) {
            return (
              <span key={`ellipsis-${i}`} className="px-3 py-2">
                ...
              </span>
            );
          }

          // Handle regular page numbers
          return (
            <Link
              key={pageNum}
              href={getPaginationUrl( pageNum )}
              className={`px-3 py-2 text-sm font-medium rounded-md ${currentPage === pageNum
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-primary/5"
                }`}
              aria-current={currentPage === pageNum ? "page" : undefined}
            >
              {pageNum}
            </Link>
          );
        } )}

        {/* Next page button */}
        <Link
          href={currentPage < totalPages ? getPaginationUrl( currentPage + 1 ) : "#"}
          className={`px-2 py-2 text-sm font-medium rounded-md ${currentPage === totalPages
            ? "text-gray-400 cursor-not-allowed"
            : "text-primary hover:bg-primary/5"
            }`}
          aria-disabled={currentPage === totalPages}
          tabIndex={currentPage === totalPages ? -1 : 0}
        >
          <span className="sr-only">Next</span>
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>
      </nav>
    </div>
  );
}