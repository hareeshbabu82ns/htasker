import Link from "next/link";
import { BadgeDollarSign, CalendarRange, Clock3, Hash } from "lucide-react";
import RecentTrackers from "@/components/features/dashboard/RecentTrackers";
// import SummaryStats from "@/components/features/dashboard/SummaryStats";
import PinnedTrackers from "@/components/features/dashboard/PinnedTrackers";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Pinned trackers widget */}
      <PinnedTrackers />

      {/* Quick actions section */}
      {/* <QuickActionBar /> */}

      {/* Recent trackers */}
      <RecentTrackers />
    </div>
  );
}

function QuickActionBar() {
  return (
    <section className="space-y-4">
      {/* <h2 className="text-xl font-semibold">Quick Actions</h2> */}
      <div className="grid grid-cols-4 gap-4">
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
      {/* <p className="text-foreground/70 mt-1 text-sm">{description}</p> */}
    </Link>
  );
}
