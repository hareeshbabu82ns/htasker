import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BadgeDollarSign, CalendarRange, Clock3, Hash } from "lucide-react";
import RecentTrackers from "@/components/features/dashboard/RecentTrackers";
import SummaryStats from "@/components/features/dashboard/SummaryStats";
import PinnedTrackers from "@/components/features/dashboard/PinnedTrackers";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <section className="bg-background border-border rounded-lg border p-6">
        <h2 className="mb-4 text-2xl font-semibold">Welcome to HTracker</h2>
        <p className="text-warning mb-6">
          Track your time, count anything, monitor expenses, or record occurrences - all in one
          place.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link href="/trackers/new">
            <Button>Create New Tracker</Button>
          </Link>
          <Link href="/trackers">
            <Button variant="outline">View All Trackers</Button>
          </Link>
        </div>
      </section>

      {/* Summary stats widget */}
      <SummaryStats />

      {/* Quick actions section */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickActionCard
            title="Timer"
            description="Track duration of activities"
            href="/trackers/new?type=TIMER"
            icon={<Clock3 />}
          />
          <QuickActionCard
            title="Counter"
            description="Track occurrences and quantities"
            href="/trackers/new?type=COUNTER"
            icon={<Hash />}
          />
          <QuickActionCard
            title="Amount"
            description="Track monetary values and expenses"
            href="/trackers/new?type=AMOUNT"
            icon={<BadgeDollarSign />}
          />
          <QuickActionCard
            title="Occurrence"
            description="Track date-based events"
            href="/trackers/new?type=OCCURRENCE"
            icon={<CalendarRange />}
          />
        </div>
      </section>

      {/* Pinned trackers widget */}
      <PinnedTrackers />

      {/* Recent trackers */}
      <RecentTrackers />
    </div>
  );
}

// Quick Action Card Component
function QuickActionCard({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="bg-background border-border hover:border-primary flex flex-col items-center rounded-lg border p-4 text-center transition-all hover:shadow-sm"
    >
      <div className="text-primary bg-primary/10 mb-2 rounded-full p-2">{icon}</div>
      <h3 className="font-medium">{title}</h3>
      <p className="text-foreground/70 mt-1 text-sm">{description}</p>
    </Link>
  );
}
