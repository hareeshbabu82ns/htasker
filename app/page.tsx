import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme/ThemeToggle";
import { Button } from "@/components/ui/button";
import { BadgeDollarSign, Hash } from "lucide-react";


export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-primary">HTracker</span>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <Link href="/dashboard" passHref>
              <Button>Dashboard</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-16 md:py-24">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
          Track <span className="text-primary">Anything</span>, Anytime
        </h1>
        <p className="text-lg md:text-xl text-foreground/80 max-w-2xl mb-10">
          HTracker is a powerful application that helps you track time, counters, amounts,
          and more. Stay productive and keep everything organized in one place.
        </p>
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <Link href="/dashboard" passHref>
            <Button size="lg">Get Started</Button>
          </Link>
          <Link href="/auth/login" passHref>
            <Button variant="outline" size="lg">Sign In</Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-muted py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              title="Time Tracking"
              description="Track how long you spend on different activities with simple start/stop controls."
              icon={<ClockIcon />}
            />
            <FeatureCard
              title="Counter Tracking"
              description="Count occurrences of anything with easy increment and decrement controls."
              icon={<Hash />}
            />
            <FeatureCard
              title="Amount Tracking"
              description="Track numerical values like expenses, income, or any other quantity."
              icon={<BadgeDollarSign />}
            />
            <FeatureCard
              title="Custom Tracking"
              description="Create your own tracking method for whatever you need to monitor."
              icon={<CustomIcon />}
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-foreground/70">
              © 2025 HTracker. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/privacy" className="text-sm text-foreground/70 hover:text-foreground">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-sm text-foreground/70 hover:text-foreground">
                Terms of Service
              </Link>
              <Link href="/contact" className="text-sm text-foreground/70 hover:text-foreground">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Feature Card Component
function FeatureCard( { title, description, icon } ) {
  return (
    <div className="bg-background p-6 rounded-lg shadow-sm border border-border flex flex-col items-center text-center">
      <div className="text-primary mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-foreground/80">{description}</p>
    </div>
  );
}

// Icon Components
function ClockIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="w-8 h-8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
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
      className="w-8 h-8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      />
    </svg>
  );
}
