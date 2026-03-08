import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Clock } from "lucide-react";
import { getTrackers, TrackerWithEntriesCount } from "@/app/actions/trackers";
import { TrackerStatus, TrackerType } from "@/types";
import TrackerFilters from "@/components/features/trackers/TrackerFilters";
import TrackerListClient from "@/components/features/trackers/TrackerListClient";
import Pagination from "@/components/features/trackers/Pagination";

const PAGE_LIMIT_DEFAULT = 10;

interface TimerPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined | unknown }>;
}

export default async function TimerPage({ searchParams }: TimerPageProps) {
  const resolvedSearchParams = await searchParams;

  const statusFilter = resolvedSearchParams.status as TrackerStatus | undefined;
  const searchQuery = resolvedSearchParams.q as string | undefined;
  const sortOrder = resolvedSearchParams.sort as string | undefined;

  const currentPage = resolvedSearchParams.page
    ? parseInt(resolvedSearchParams.page as string, 10)
    : 1;
  const limit = resolvedSearchParams.limit
    ? parseInt(resolvedSearchParams.limit as string, 10)
    : PAGE_LIMIT_DEFAULT;

  const response = await getTrackers({
    status: statusFilter,
    type: TrackerType.TIMER,
    search: searchQuery,
    sort: sortOrder,
    page: currentPage,
    limit: limit,
  });

  let trackers: TrackerWithEntriesCount[] = [];
  let totalPages = 1;
  let total = 0;
  let page = 1;

  if (response.success) {
    trackers = response.data.trackers;
    totalPages = response.data.totalPages;
    total = response.data.total;
    page = response.data.page;
  }

  const buildBaseUrl = () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (searchQuery) params.set("q", searchQuery);
    if (sortOrder) params.set("sort", sortOrder);
    if (limit !== PAGE_LIMIT_DEFAULT) params.set("limit", limit.toString());
    return params;
  };

  const baseParams = buildBaseUrl();
  const baseUrl = `/timer?${baseParams.toString()}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Clock className="text-primary h-6 w-6" />
          <div>
            <h1 className="text-2xl font-semibold">Timer Trackers</h1>
            <p className="text-muted-foreground text-sm">
              Track time spent on activities and projects
            </p>
          </div>
        </div>
        <Link href="/trackers/new?type=TIMER">
          <Button>Create Timer Tracker</Button>
        </Link>
      </div>

      <TrackerFilters
        defaultStatus={statusFilter}
        defaultType={TrackerType.TIMER}
        defaultQuery={searchQuery}
        defaultSort={sortOrder || "recent"}
        basePath="/timer"
      />

      <div className="space-y-4">
        {trackers.length > 0 ? (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div className="text-muted-foreground text-sm">
                Showing {page * limit - limit + 1} to {Math.min(page * limit, total)} of {total}{" "}
                trackers
              </div>
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

            <TrackerListClient trackers={trackers} />

            <div className="mb-4 flex items-center justify-between">
              <div className="text-muted-foreground text-sm">
                Showing {page * limit - limit + 1} to {Math.min(page * limit, total)} of {total}{" "}
                trackers
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
          <div className="bg-background border-border rounded-lg border p-6 text-center">
            <p className="text-foreground/70">No timer trackers found</p>
            <Link href="/trackers/new?type=TIMER" className="mt-2 inline-block">
              <Button variant="outline" size="sm">
                Create Your First Timer Tracker
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
