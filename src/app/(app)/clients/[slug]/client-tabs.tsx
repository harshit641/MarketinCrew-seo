"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Overview", href: "" },
  { label: "Goals", href: "/goals" },
  { label: "Tasks", href: "/tasks" },
  { label: "Work", href: "/work" },
  { label: "Rankings", href: "/rankings" },
  { label: "Search Console", href: "/search-console" },
  { label: "Analytics", href: "/analytics" },
  { label: "Backlinks", href: "/backlinks" },
  { label: "Technical", href: "/technical" },
  { label: "Content", href: "/content" },
  { label: "Reports", href: "/reports" },
  { label: "Settings", href: "/settings" },
] as const;

export function ClientTabs({ basePath }: { basePath: string }) {
  const pathname = usePathname();
  return (
    <div className="scrollbar-thin -mx-1 overflow-x-auto">
      <nav className="flex w-max min-w-full gap-1 px-1">
        {TABS.map((tab) => {
          const href = basePath + tab.href;
          const active =
            tab.href === ""
              ? pathname === basePath
              : pathname.startsWith(href);
          return (
            <Link
              key={tab.href}
              href={href}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
