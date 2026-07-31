"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

/**
 * Dual date-range picker for comparisons. Reads/writes URL search params so the
 * selection is shareable and survives refresh. Each range is two date inputs.
 */
export function DateRangePicker({
  paramKeys = { aStart: "aStart", aEnd: "aEnd", bStart: "bStart", bEnd: "bEnd" },
  defaults,
}: {
  paramKeys?: { aStart: string; aEnd: string; bStart: string; bEnd: string };
  defaults: { aStart: string; aEnd: string; bStart: string; bEnd: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  const v = (k: string, d: string) => sp.get(k) ?? d;

  return (
    <div className="grid gap-4 rounded-[var(--radius)] border border-border bg-card p-4 sm:grid-cols-2">
      <RangeBlock
        title="Range A (current)"
        color="border-l-primary"
        startKey={paramKeys.aStart}
        endKey={paramKeys.aEnd}
        startVal={v(paramKeys.aStart, defaults.aStart)}
        endVal={v(paramKeys.aEnd, defaults.aEnd)}
        onChange={setParam}
      />
      <RangeBlock
        title="Range B (previous)"
        color="border-l-muted-foreground"
        startKey={paramKeys.bStart}
        endKey={paramKeys.bEnd}
        startVal={v(paramKeys.bStart, defaults.bStart)}
        endVal={v(paramKeys.bEnd, defaults.bEnd)}
        onChange={setParam}
      />
    </div>
  );
}

function RangeBlock({
  title,
  color,
  startKey,
  endKey,
  startVal,
  endVal,
  onChange,
}: {
  title: string;
  color: string;
  startKey: string;
  endKey: string;
  startVal: string;
  endVal: string;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className={`rounded-md border border-border border-l-4 ${color} p-3`}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          From
          <input
            type="date"
            value={startVal}
            onChange={(e) => onChange(startKey, e.target.value)}
            className="h-9 rounded-md border border-input bg-card px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          To
          <input
            type="date"
            value={endVal}
            onChange={(e) => onChange(endKey, e.target.value)}
            className="h-9 rounded-md border border-input bg-card px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
      </div>
    </div>
  );
}
