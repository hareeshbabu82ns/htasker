import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getTrackers, TrackerWithEntriesCount } from '@/app/actions/trackers';
import { BadgeDollarSign, CalendarRange, Clock3, Hash } from 'lucide-react';
import TrackerCard from '@/components/features/trackers/TrackerCard';

export default async function DashboardPage() {
  // Fetch trackers from the database
  const response = await getTrackers();
  const allTrackers = response.success ? ( response.data.trackers as TrackerWithEntriesCount[] ) : [];

  // Process trackers to include only the active ones and not archived
  const activeTrackers = allTrackers
    .filter( tracker => tracker.status !== 'ARCHIVED' );
  // .map( tracker => ( {
  //   id: tracker.id,
  //   name: tracker.name,
  //   type: tracker.type,
  //   description: tracker.description,
  //   updatedAt: new Date( tracker.updatedAt ),
  //   entriesCount: tracker.entriesCount,
  // } ) );

  // Get the most recently updated trackers (based on updatedAt)
  const recentTrackers = [ ...activeTrackers ]
    .sort( ( a, b ) => b.updatedAt.getTime() - a.updatedAt.getTime() )
    .slice( 0, 3 );

  // Get the most frequently used trackers (based on entry count)
  const frequentTrackers = [ ...activeTrackers ]
    .sort( ( a, b ) => b.entriesCount - a.entriesCount )
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
        <p className="text-warning-foreground mb-6">
          Track your time, count anything, monitor expenses, or record occurrences - all in one place.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link href="/trackers/new" passHref>
            <Button>Create New Tracker</Button>
          </Link>
          <Link href="/trackers" passHref>
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
            href="/timer"
            icon={<Clock3 />}
          />
          <QuickActionCard
            title="Counter"
            description="Track occurrences and quantities"
            href="/counter"
            icon={<Hash />}
          />
          <QuickActionCard
            title="Amount"
            description="Track monetary values and expenses"
            href="/amount"
            icon={<BadgeDollarSign />}
          />
          <QuickActionCard
            title="Occurrence"
            description="Track date-based events"
            href="/occurrence"
            icon={<CalendarRange />}
          />
        </div>
      </section>

      {/* Recent trackers section */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Recent Trackers</h2>
          <Link href="/trackers" className="text-primary hover:underline text-sm">
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
              <Link href="/trackers/new" passHref className="mt-2 inline-block">
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
function QuickActionCard( { title, description, href, icon }: { title: string; description: string; href: string; icon: React.ReactNode; } ) {
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

