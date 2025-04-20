import { TrackerWithEntriesCount } from "@/app/actions/trackers";
import { TrackerStatus, TrackerType } from "@/app/generated/prisma";
import { Button } from "@/components/ui/button";
import { BadgeDollarSign, CalendarRange, Clock3, Columns3Cog, Hash } from "lucide-react";
import Link from "next/link";

// Tracker Card Component
export default function TrackerCard( { tracker, showLabel = false, showEdit = false }: { tracker: TrackerWithEntriesCount, showLabel?: boolean, showEdit?: boolean } ) {
  const getTypeIcon = ( type: string ) => {
    switch ( type ) {
      case TrackerType.TIMER:
        return <Clock3 />;
      case TrackerType.COUNTER:
        return <Hash />;
      case TrackerType.AMOUNT:
        return <BadgeDollarSign />;
      case TrackerType.OCCURRENCE:
        return <CalendarRange />;
      default:
        return <Columns3Cog />;
    }
  };

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

  const formatDate = ( date: Date ) => {
    return new Intl.DateTimeFormat( 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    } ).format( date );
  };

  return (
    <div className="bg-background border border-border rounded-lg p-4 hover:border-primary transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="text-primary p-2 bg-primary/10 rounded-full">
            {getTypeIcon( tracker.type )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{tracker.name}</h3>
              {tracker.tags &&
                tracker.tags.map( ( tag: string ) => (
                  <span
                    key={tag}
                    className="bg-primary/5 text-primary/90 px-2 py-0.5 rounded-full text-xs"
                  >
                    {tag}
                  </span>
                ) )}
              {tracker.status === TrackerStatus.ARCHIVED && (
                <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full text-xs">
                  Archived
                </span>
              )}
              {showLabel && (
                <span className="bg-primary/5 text-primary/90 px-2 py-0.5 rounded-full text-xs">
                  {getTypeLabel( tracker.type )}
                </span>
              )}
            </div>
            <p className="text-sm text-foreground/70 mt-1">{tracker.description}</p>
            <div className="flex items-center mt-2 text-xs text-foreground/60">
              <span>Last used: {formatDate( tracker.updatedAt )}</span>
              <span className="mx-2">•</span>
              <span>{tracker.entriesCount ?? 0} entries</span>
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <Link href={`/trackers/${tracker.id}`} passHref>
            <Button variant="ghost" size="sm">View</Button>
          </Link>
          {showEdit && <Link href={`/trackers/${tracker.id}/edit`} passHref>
            <Button variant="outline" size="sm">Edit</Button>
          </Link>}
        </div>
      </div>
    </div>
  );
}