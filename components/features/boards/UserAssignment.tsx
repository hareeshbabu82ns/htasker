"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useUserSearch } from "@/hooks/useBoardQuery";
import { User as UserIcon } from "lucide-react";
import type { User } from "@/types";

type UserSummary = Pick<User, "id" | "name" | "email" | "image">;

interface UserAssignmentProps {
  value: string | null | undefined;
  onSelect: (userId: string | null) => void;
  assignee?: UserSummary | null;
}

export function UserAssignment({ value, onSelect, assignee }: UserAssignmentProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { data: users } = useUserSearch(query);

  const displayName = assignee?.name ?? assignee?.email ?? null;

  return (
    <div className="relative">
      {value && displayName ? (
        <div className="flex items-center gap-2 rounded-md border p-2">
          <div className="bg-primary/10 text-primary flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium">
            {(assignee?.name ?? assignee?.email ?? "?")[0].toUpperCase()}
          </div>
          <span className="flex-1 truncate text-sm">{displayName}</span>
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setQuery("");
            }}
            className="text-muted-foreground hover:text-foreground text-xs"
            aria-label="Remove assignee"
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="relative">
          <UserIcon className="text-muted-foreground absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search users to assign..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 200)}
            className="pl-8"
          />
        </div>
      )}

      {open && users && users.length > 0 && (
        <ul className="bg-popover border-border absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border shadow-md">
          {users.map((user) => (
            <li key={user.id}>
              <button
                type="button"
                className="hover:bg-accent flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(user.id);
                  setQuery("");
                  setOpen(false);
                }}
              >
                <div className="bg-primary/10 text-primary flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium">
                  {(user.name ?? user.email)[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  {user.name && <p className="truncate font-medium">{user.name}</p>}
                  <p className="text-muted-foreground truncate text-xs">{user.email}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
