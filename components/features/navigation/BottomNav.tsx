"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LayoutList, Plus, Settings, KanbanSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BottomNavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
  matchPrefix?: string;
  excludePaths?: string[];
}

interface BottomNavProps {
  className?: string;
}

const NAV_ITEMS: BottomNavItem[] = [
  {
    href: "/dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
    label: "Dashboard",
  },
  {
    href: "/trackers",
    icon: <LayoutList className="h-5 w-5" />,
    label: "Trackers",
    matchPrefix: "/trackers",
    excludePaths: ["/trackers/new"],
  },
  {
    href: "/trackers/new",
    icon: <Plus className="h-5 w-5" />,
    label: "New",
  },
  {
    href: "/boards",
    icon: <KanbanSquare className="h-5 w-5" />,
    label: "Boards",
    matchPrefix: "/boards",
  },
  {
    href: "/settings/profile",
    icon: <Settings className="h-5 w-5" />,
    label: "Settings",
    matchPrefix: "/settings",
  },
];

export default function BottomNav({ className }: BottomNavProps) {
  const pathname = usePathname();

  const isActive = (item: BottomNavItem) => {
    if (item.href === "/trackers/new") {
      return pathname === "/trackers/new";
    }
    if (item.excludePaths?.includes(pathname)) {
      return false;
    }
    if (item.matchPrefix) {
      return pathname === item.href || pathname.startsWith(`${item.matchPrefix}/`);
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  return (
    <nav
      className={cn(
        "fixed right-0 bottom-0 left-0 z-50 flex md:hidden",
        "bg-background border-border border-t pb-4",
        className
      )}
      aria-label="Mobile navigation"
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(item);
        return (
          <Button
            key={item.href}
            variant="ghost"
            asChild
            className={cn(
              "h-auto min-h-[44px] flex-1 flex-col gap-0.5 rounded-none px-1 py-2",
              active ? "text-primary font-semibold" : "text-muted-foreground font-normal"
            )}
          >
            <Link href={item.href}>
              {item.icon}
              <span className="text-[10px] leading-tight">{item.label}</span>
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}
