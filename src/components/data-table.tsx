import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui";

/* ===========================================================================
   Minimal generic data table with loading/empty states and horizontal
   scrolling for narrow viewports. Keeps column defs strongly typed.
   =========================================================================== */

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}

export function DataTable<T>({
  columns,
  rows,
  loading,
  empty,
  rowKey,
  onRowClick,
}: {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  empty?: React.ReactNode;
  rowKey: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
}) {
  if (loading) {
    return (
      <div className="scrollbar-thin overflow-x-auto rounded-[var(--radius)] border border-border">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead className="bg-muted/60">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                  <Skeleton className="h-3 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-t border-border">
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-3">
                    <Skeleton className="h-3 w-24" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-dashed border-border bg-card py-12 text-center text-sm text-muted-foreground">
        {empty ?? "No records found."}
      </div>
    );
  }

  return (
    <div className="scrollbar-thin overflow-x-auto rounded-[var(--radius)] border border-border">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead className="bg-muted/60">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  "px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                  c.align === "right" && "text-right",
                  c.align === "center" && "text-center",
                  c.align !== "right" && c.align !== "center" && "text-left",
                  c.className,
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={rowKey(row, i)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                "border-t border-border transition-colors hover:bg-muted/40",
                onRowClick && "cursor-pointer",
              )}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    "px-4 py-3 align-middle text-foreground",
                    c.align === "right" && "text-right",
                    c.align === "center" && "text-center",
                    c.className,
                  )}
                >
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
