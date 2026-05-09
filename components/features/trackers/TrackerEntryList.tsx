import { TrackerEntry } from "@/types";
import EntryPagination from "./EntryPagination";
import EditEntryModal from "./EditEntryModal";

interface TrackerEntryListProps {
  entries: TrackerEntry[];
  isLoading: boolean;
  totalEntries: number;
  currentPage: number;
  currentLimit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  renderItem: (entry: TrackerEntry) => React.ReactNode;
  emptyMessage?: string;
  sectionTitle?: string;
}

/**
 * Shared entry list component with loading spinner, empty state, and pagination.
 * Accepts a `renderItem` function for tracker-type-specific entry rendering.
 */
export default function TrackerEntryList({
  entries,
  isLoading,
  totalEntries,
  currentPage,
  currentLimit,
  onPageChange,
  onLimitChange,
  renderItem,
  emptyMessage = "No recent entries to display",
  sectionTitle = "Recent Entries",
}: TrackerEntryListProps) {
  return (
    <div className="mt-8">
      <h3 className="mb-3 text-sm font-medium">{sectionTitle}</h3>
      {isLoading ? (
        <div className="flex justify-center p-4">
          <div className="border-primary h-6 w-6 animate-spin rounded-full border-t-2 border-b-2"></div>
        </div>
      ) : entries.length > 0 ? (
        <>
          <div className="space-y-3">{entries.map((entry) => renderItem(entry))}</div>
          <EntryPagination
            currentPage={currentPage}
            currentLimit={currentLimit}
            totalEntries={totalEntries}
            onPageChange={onPageChange}
            onLimitChange={(limit) => {
              onLimitChange(limit);
              onPageChange(1);
            }}
          />
        </>
      ) : (
        <div className="border-border rounded-md border border-dashed p-4 text-center">
          <p className="text-foreground/60 text-sm">{emptyMessage}</p>
        </div>
      )}
    </div>
  );
}
