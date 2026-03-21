import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/ui/theme/ThemeToggle";
import { Button } from "@/components/ui/button";
import { BadgeDollarSign, Hash, Clock, BarChart3, Zap } from "lucide-react";

// Feature Card Component
interface FeatureCardProps {
  title: string;
  description: string;
  icon: ReactNode;
}

function FeatureCard({ title, description, icon }: FeatureCardProps) {
  return (
    <div className="glass-card flex flex-col items-start rounded-2xl p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
      <div className="mb-6 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 p-3 text-white shadow-md shadow-indigo-500/20">
        {icon}
      </div>
      <h3 className="mb-3 text-2xl font-bold tracking-tight">{title}</h3>
      <p className="text-foreground/70 leading-relaxed">{description}</p>
    </div>
  );
}

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      {/* Background gradients */}
      <div className="hero-gradient pointer-events-none absolute inset-0 z-0 opacity-60"></div>

      {/* Navigation */}
      <header className="border-border/40 bg-background/50 relative sticky top-0 z-10 border-b backdrop-blur-md transition-all">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-2">
            <div className="rounded-lg bg-gradient-to-r from-indigo-600 to-fuchsia-600 p-2">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <span className="text-gradient text-2xl font-extrabold tracking-tight">HTracker</span>
          </div>
          <div className="flex items-center space-x-6">
            <ThemeToggle />
            <Link href="/dashboard">
              <Button className="rounded-full px-6 shadow-lg shadow-indigo-500/20 transition-transform hover:scale-105">
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col pt-12 md:pt-4">
        {/* Hero Section */}
        <section className="flex flex-col items-center justify-center px-4 py-20 text-center md:py-32 xl:py-40">
          <div className="mb-8 inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-600 backdrop-blur-sm dark:text-indigo-400">
            <span className="mr-2 flex h-2 w-2 animate-pulse rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
            HTracker 2.0 is now live
          </div>
          <h1 className="mb-6 max-w-4xl text-5xl font-extrabold tracking-tight sm:text-7xl md:leading-tight">
            Master your metrics with <span className="text-gradient">precision</span> and style.
          </h1>
          <p className="text-foreground/70 mb-10 max-w-2xl text-lg leading-relaxed md:text-xl">
            A comprehensive tracking solution built for modern professionals. Monitor time, count
            occurrences, and track expenses all in one delightfully simple interface.
          </p>
          <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
            <Link href="/dashboard">
              <Button
                size="lg"
                className="rounded-full px-8 py-6 text-lg shadow-xl shadow-indigo-600/20 transition-all hover:-translate-y-1 hover:shadow-indigo-600/40"
              >
                Start Tracking Free
              </Button>
            </Link>
            <Link href="/login">
              <Button
                variant="outline"
                size="lg"
                className="glass hover:bg-foreground/5 rounded-full px-8 py-6 text-lg backdrop-blur-md transition-all"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section className="relative mt-auto py-24">
          <div className="bg-muted/30 border-border/50 absolute inset-0 -z-10 origin-top-left skew-y-[-2deg] border-y shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"></div>
          <div className="relative z-10 container mx-auto px-6">
            <div className="mb-16 text-center">
              <h2 className="mb-4 text-4xl font-extrabold tracking-tight">
                Everything you need to stay organized
              </h2>
              <p className="text-foreground/60 mx-auto max-w-2xl text-lg">
                Flexible tracking modules designed to adapt to your unique workflow.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
              <FeatureCard
                title="Time Tracking"
                description="Effortlessly log minutes and hours. Understand exactly where your time goes with our powerful visual timer."
                icon={<Clock className="h-6 w-6" />}
              />
              <FeatureCard
                title="Counters"
                description="Keep tally of habits, Inventory, or repeated actions. Simple, tap-to-increment counters that sync instantly."
                icon={<Hash className="h-6 w-6" />}
              />
              <FeatureCard
                title="Expenses & Amounts"
                description="Maintain budgets, track revenue, or keep a ledger of any numerical value. Fast and accurate."
                icon={<BadgeDollarSign className="h-6 w-6" />}
              />
              <FeatureCard
                title="Visual Analytics"
                description="Generate stunning reports and beautiful charts. Uncover insights to optimize your routines."
                icon={<BarChart3 className="h-6 w-6" />}
              />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-border/40 bg-background/50 relative z-10 border-t py-12 text-center backdrop-blur-sm md:text-left">
        <div className="container mx-auto px-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-indigo-500" />
              <span className="font-bold">HTracker</span>
            </div>
            <p className="text-foreground/60 text-sm">
              © {new Date().getFullYear()} HTracker Inc. Designed for power users.
            </p>
            <div className="flex space-x-6">
              <Link
                href="/privacy"
                className="text-foreground/60 text-sm transition-colors hover:text-indigo-500"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-foreground/60 text-sm transition-colors hover:text-indigo-500"
              >
                Terms
              </Link>
              <Link
                href="/contact"
                className="text-foreground/60 text-sm transition-colors hover:text-indigo-500"
              >
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
