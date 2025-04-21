"use client";

import Link from "next/link";
import LimitSelector from "./LimitSelector";

const PAGE_LIMIT_OPTIONS = [ 5, 10, 25, 50 ];

// Updated type definition for pagination component props
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
  currentLimit: number;
}

export default function Pagination( {
  currentPage,
  totalPages,
  baseUrl,
  currentLimit
}: PaginationProps ) {

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

  // Function to generate page URLs on the client side
  const getPageUrl = ( pageNumber: number ): string => {
    const params = new URLSearchParams( baseUrl.split( '?' )[ 1 ] || '' );
    params.set( "page", pageNumber.toString() );
    return `/trackers?${params.toString()}`;
  };

  return (
    <div className="flex items-center justify-between my-4">
      <nav className="flex items-center gap-1" aria-label="Pagination">
        {/* Previous page button */}
        <Link
          href={currentPage > 1 ? getPageUrl( currentPage - 1 ) : "#"}
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
              href={getPageUrl( pageNum )}
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
          href={currentPage < totalPages ? getPageUrl( currentPage + 1 ) : "#"}
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
      {/* Add limit selector to the pagination */}
      <div className="hidden sm:block">
        <LimitSelector
          currentLimit={currentLimit}
          baseUrl={baseUrl}
          limitOptions={PAGE_LIMIT_OPTIONS}
        />
      </div>
    </div>
  );
}