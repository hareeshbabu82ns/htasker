import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BadgeDollarSign, CalendarRange, Clock3, Hash } from 'lucide-react';
import RecentTrackers from '@/components/features/dashboard/RecentTrackers'; // Import the new component

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <section className="bg-background border border-border rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Welcome to HTracker</h2>
        <p className="text-warning mb-6">
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

      {/* Use the new RecentTrackers component */}
      <RecentTrackers />
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

