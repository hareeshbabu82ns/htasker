import React from 'react';

interface EntryPaginationProps {
  currentPage: number;
  currentLimit: number;
  totalEntries: number;
  limitOptions?: number[];
  onPageChange: ( page: number ) => void;
  onLimitChange: ( limit: number ) => void;
}

export default function EntryPagination( {
  currentPage,
  currentLimit,
  totalEntries,
  limitOptions = [ 5, 10, 25, 50 ],
  onPageChange,
  onLimitChange,
}: EntryPaginationProps ) {
  const totalPages = Math.ceil( totalEntries / currentLimit );

  return (
    <div className="flex justify-between items-center mt-4">
      <div className="flex items-center space-x-2">
        <label className="text-sm">Show:</label>
        <select
          value={currentLimit}
          onChange={e => onLimitChange( +e.target.value )}
          className="p-1 border rounded"
        >
          {limitOptions.map( opt => (
            <option key={opt} value={opt}>{opt}</option>
          ) )}
        </select>
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange( Math.max( 1, currentPage - 1 ) )}
          disabled={currentPage === 1}
          className="px-2 py-1 text-sm border rounded disabled:opacity-50"
        >Prev</button>
        <span className="text-sm">{currentPage} / {totalPages}</span>
        <button
          onClick={() => onPageChange( Math.min( totalPages, currentPage + 1 ) )}
          disabled={currentPage === totalPages}
          className="px-2 py-1 text-sm border rounded disabled:opacity-50"
        >Next</button>
      </div>
    </div>
  );
}