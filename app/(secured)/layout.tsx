"use client";

import ServiceWorkerRegistration from "@/components/features/pwa/ServiceWorkerRegistration";
import InstallPrompt from "@/components/features/pwa/InstallPrompt";
import OfflineIndicator from "@/components/features/pwa/OfflineIndicator";
import BottomNav from "@/components/features/navigation/BottomNav";
import UserMenu from "@/components/features/navigation/UserMenu";
import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ui/theme/ThemeToggle";
import { BadgeDollarSign, CalendarRange, Clock3, Hash, Download, KeyRound } from "lucide-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [queryClient] = useState(() => new QueryClient());
  const pathname = usePathname();

  // Check if a nav item is active
  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ServiceWorkerRegistration />
      {/* Skip-to-content link for keyboard users */}
      <a
        href="#main-content"
        className="focus:bg-primary focus:text-primary-foreground sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:px-4 focus:py-2 focus:outline-none"
      >
        Skip to main content
      </a>
      <div className="bg-background flex h-screen">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-10 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          ></div>
        )}

        {/* Sidebar */}
        <aside
          className={`bg-background border-border fixed inset-y-0 left-0 z-20 w-64 transform border-r transition-transform duration-200 lg:static lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          aria-label="Main navigation"
          id="sidebar"
        >
          {/* Sidebar header */}
          <div className="border-border flex h-16 items-center justify-between border-b px-4">
            <Link href="/" className="flex items-center">
              <span className="text-primary text-xl font-bold">HTracker</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-foreground hover:bg-muted rounded-md p-2 lg:hidden"
              aria-label="Close navigation menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-6 w-6"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Sidebar navigation */}
          <nav className="flex flex-col space-y-1 p-4" aria-label="Primary navigation">
            <NavItem
              href="/dashboard"
              icon={<DashboardIcon />}
              label="Dashboard"
              isActive={isActive("/dashboard")}
            />
            <NavItem
              href="/trackers"
              icon={<TrackersIcon />}
              label="All Trackers"
              isActive={isActive("/trackers")}
            />
            <NavItem href="/timer" icon={<Clock3 />} label="Timer" isActive={isActive("/timer")} />
            <NavItem
              href="/counter"
              icon={<Hash />}
              label="Counter"
              isActive={isActive("/counter")}
            />
            <NavItem
              href="/amount"
              icon={<BadgeDollarSign />}
              label="Amount"
              isActive={isActive("/amount")}
            />
            <NavItem
              href="/occurrence"
              icon={<CalendarRange />}
              label="Occurrence"
              isActive={isActive("/occurrence")}
            />
            <NavItem
              href="/stats"
              icon={<StatsIcon />}
              label="Statistics"
              isActive={isActive("/stats")}
            />
            <NavItem
              href="/settings/profile"
              icon={<SettingsIcon />}
              label="Settings"
              isActive={isActive("/settings/profile")}
            />
            <NavItem
              href="/settings/export"
              icon={<Download className="h-5 w-5" />}
              label="Export Data"
              isActive={isActive("/settings/export")}
            />
            <NavItem
              href="/settings/api-tokens"
              icon={<KeyRound className="h-5 w-5" />}
              label="API Tokens"
              isActive={isActive("/settings/api-tokens")}
            />
          </nav>
        </aside>

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <header
            className="border-border flex h-16 items-center justify-between border-b px-4 lg:px-6"
            role="banner"
          >
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-foreground hover:bg-muted rounded-md p-2 lg:hidden"
              aria-label="Open navigation menu"
              aria-controls="sidebar"
              aria-expanded={sidebarOpen}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-6 w-6"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            </button>

            {/* Page title - can be dynamic based on route */}
            <h1 className="text-foreground hidden text-xl font-semibold md:block"></h1>

            {/* Header actions */}
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <button
                className="bg-muted text-foreground relative rounded-full p-1"
                aria-label="View notifications"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-6 w-6"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                  />
                </svg>
              </button>
              <UserMenu />
            </div>
          </header>

          {/* Main content area */}
          <main
            id="main-content"
            className="flex-1 overflow-auto p-4 pb-20 md:pb-6 lg:p-6"
            tabIndex={-1}
          >
            {children}
          </main>
        </div>
        <BottomNav />
        <InstallPrompt />
        <OfflineIndicator />
      </div>
    </QueryClientProvider>
  );
}

// Navigation item component
interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}

function NavItem({ href, icon, label, isActive }: NavItemProps) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`flex items-center rounded-md px-3 py-2 transition-colors ${
        isActive ? "bg-primary text-white" : "text-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <span className="mr-3" aria-hidden="true">
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  );
}

// Icon Components
function DashboardIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
      />
    </svg>
  );
}

function TrackersIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
      />
    </svg>
  );
}

function StatsIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}
