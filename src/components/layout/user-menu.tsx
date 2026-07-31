"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui";
import { ROLE_LABELS } from "@/lib/constants";
import { SystemRole } from "@/generated/prisma/enums";
import { logoutAction } from "@/app/(auth)/actions";

export interface UserMenuUser {
  name: string;
  email: string;
  role: SystemRole;
}

export function UserMenu({ user }: { user: UserMenuUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        className="gap-2"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sidebar text-xs font-semibold text-white">
          {initials(user.name)}
        </span>
        <span className="hidden text-sm font-medium sm:inline">{user.name}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </Button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-60 rounded-md border border-border bg-card p-1 shadow-lg">
          <div className="border-b border-border px-3 py-2">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{ROLE_LABELS[user.role]}</p>
          </div>
          <button
            className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-foreground hover:bg-muted"
            onClick={async () => {
              setOpen(false);
              await logoutAction();
            }}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
