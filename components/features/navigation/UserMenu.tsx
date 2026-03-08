"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { logout } from "@/app/actions/auth";

interface UserMenuProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name && name.length > 0) {
    return name.charAt(0).toUpperCase();
  }
  if (email && email.length > 0) {
    return email.charAt(0).toUpperCase();
  }
  return "U";
}

export default function UserMenu({ user: propUser }: UserMenuProps) {
  const { data: session } = useSession();

  // Prefer session data (kept in sync) over prop, fall back to prop for SSR/initial render
  const user = session?.user ?? propUser ?? {};

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="focus-visible:ring-primary rounded-full focus:outline-none focus-visible:ring-2"
          aria-label="User menu"
        >
          <Avatar>
            <AvatarImage
              src={user.image ?? undefined}
              alt={user.name ?? user.email ?? "User avatar"}
            />
            <AvatarFallback>{getInitials(user.name, user.email)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            {user.name && <p className="text-sm leading-none font-medium">{user.name}</p>}
            {user.email && (
              <p className="text-muted-foreground text-xs leading-none">{user.email}</p>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/settings/profile">Profile Settings</Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <form action={logout} className="w-full">
            <button
              type="submit"
              className="text-destructive focus:text-destructive w-full text-left"
            >
              Sign Out
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
