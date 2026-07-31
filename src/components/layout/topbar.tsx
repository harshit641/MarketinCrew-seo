"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui";
import { Sidebar, type SidebarUser } from "@/components/layout/sidebar";
import { SystemRole } from "@/generated/prisma/enums";

export function Topbar({ user }: { user: SidebarUser }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card px-4 lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <span className="text-sm font-semibold">MarketinCrew SEO</span>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72">
            <button
              className="absolute right-3 top-3 z-10 text-sidebar-muted hover:text-white"
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
            <Sidebar user={user} mobile />
          </div>
        </div>
      )}
    </>
  );
}
