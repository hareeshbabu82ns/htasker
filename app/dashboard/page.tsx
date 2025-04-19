import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { TrackerType } from '@/types';
import { getTrackers } from '@/app/actions/trackers';

export default async function DashboardPage() {
  // Fetch trackers from the database
  const response = await getTrackers();
  const allTrackers = response.success ? ( response.data.trackers as any[] ) : [];

  // Process trackers to include only the active ones and not archived
  const activeTrackers = allTrackers
    .filter( tracker => tracker.status !== 'ARCHIVED' )
    .map( tracker => ( {
      id: tracker.id,
      name: tracker.name,
      type: tracker.type,
      description: tracker.description,
      lastUsed: new Date( tracker.updatedAt ),
      entries: tracker._count?.entries || 0
    } ) );

  // Get the most recently updated trackers (based on updatedAt)
  const recentTrackers = [ ...activeTrackers ]
    .sort( ( a, b ) => b.lastUsed.getTime() - a.lastUsed.getTime() )
    .slice( 0, 3 );

  // Get the most frequently used trackers (based on entry count)
  const frequentTrackers = [ ...activeTrackers ]
    .sort( ( a, b ) => b.entries - a.entries )
    .slice( 0, 3 );

  // Combine and deduplicate (prioritizing recently used)
  const combinedTrackers = [ ...recentTrackers ];
  for ( const tracker of frequentTrackers ) {
    if ( !combinedTrackers.some( t => t.id === tracker.id ) ) {
      combinedTrackers.push( tracker );
    }
  }

  // Limit to at most 4 trackers for display
  const displayTrackers = combinedTrackers.slice( 0, 4 );

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <section className="bg-background border border-border rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Welcome to HTracker</h2>
        <p className="text-foreground/80 mb-6">
          Track your time, count anything, monitor expenses, or record occurrences - all in one place.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link href="/dashboard/trackers/new" passHref>
            <Button>Create New Tracker</Button>
          </Link>
          <Link href="/dashboard/trackers" passHref>
            <Button variant="outline">View All Trackers</Button>
          </Link>
        </div>
      </section>

      {/* Quick actions section */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionCard
            title="Timer"
            description="Track duration of activities"
            href="/dashboard/timer"
            icon={<TimerIcon />}
          />
          <QuickActionCard
            title="Counter"
            description="Track occurrences and quantities"
            href="/dashboard/counter"
            icon={<CounterIcon />}
          />
          <QuickActionCard
            title="Amount"
            description="Track monetary values and expenses"
            href="/dashboard/amount"
            icon={<AmountIcon />}
          />
          <QuickActionCard
            title="Occurrence"
            description="Track date-based events"
            href="/dashboard/occurrence"
            icon={<OccurrenceIcon />}
          />
        </div>
      </section>

      {/* Recent trackers section */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Recent Trackers</h2>
          <Link href="/dashboard/trackers" className="text-primary hover:underline text-sm">
            View All
          </Link>
        </div>

        <div className="space-y-4">
          {displayTrackers.length > 0 ? (
            displayTrackers.map( ( tracker ) => (
              <TrackerCard key={tracker.id} tracker={tracker} />
            ) )
          ) : (
            <div className="bg-background border border-border rounded-lg p-6 text-center">
              <p className="text-foreground/70">No recent trackers found</p>
              <Link href="/dashboard/trackers/new" passHref className="mt-2 inline-block">
                <Button variant="outline" size="sm">Create Your First Tracker</Button>
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// Quick Action Card Component
function QuickActionCard( { title, description, href, icon } ) {
  return (
    <Link
      href={href}
      className="bg-background border border-border rounded-lg p-4 hover:border-primary hover:shadow-sm transition-all flex flex-col items-center text-center"
    >
      <div className="text-primary mb-2 p-2 bg-primary/10 rounded-full">
        {icon}
      </div>
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-foreground/70 mt-1">{description}</p>
    </Link>
  );
}

// Tracker Card Component
function TrackerCard( { tracker } ) {
  const getTypeIcon = ( type ) => {
    switch ( type ) {
      case TrackerType.TIMER:
        return <TimerIcon />;
      case TrackerType.COUNTER:
        return <CounterIcon />;
      case TrackerType.AMOUNT:
        return <AmountIcon />;
      case TrackerType.OCCURRENCE:
        return <OccurrenceIcon />;
      default:
        return <CustomIcon />;
    }
  };

  const formatDate = ( date ) => {
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
            <h3 className="font-medium">{tracker.name}</h3>
            <p className="text-sm text-foreground/70 mt-1">{tracker.description}</p>
            <div className="flex items-center mt-2 text-xs text-foreground/60">
              <span>Last used: {formatDate( tracker.lastUsed )}</span>
              <span className="mx-2">•</span>
              <span>{tracker.entries} entries</span>
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <Link href={`/dashboard/trackers/${tracker.id}`} passHref>
            <Button variant="ghost" size="sm">View</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// Icon Components
function TimerIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="w-5 h-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  );
}

function CounterIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="w-5 h-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3"
      />
    </svg>
  );
}

function AmountIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="w-5 h-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  );
}

function OccurrenceIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="w-5 h-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z"
      />
    </svg>
  );
}

function CustomIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="w-5 h-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      />
    </svg>
  );
}