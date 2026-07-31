"use client";

import { QuickAddModal } from "@/components/quick-add-modal";
import type { QuickField } from "@/components/quick-add-modal";
import { addKeywordAction, addRankingSnapshotAction } from "../data-entry";

export function AddKeywordButton({ clientId }: { clientId: string }) {
  const fields: QuickField[] = [
    { name: "keyword", label: "Keyword", type: "text", required: true, placeholder: "roof repair mumbai" },
    { name: "searchVolume", label: "Search volume", type: "number", min: 0 },
    { name: "difficulty", label: "Difficulty (0-100)", type: "number", min: 0, max: 100 },
    { name: "country", label: "Country", type: "text", default: "US" },
    { name: "city", label: "City", type: "text", placeholder: "leave blank if none" },
    { name: "device", label: "Device", type: "select", default: "DESKTOP", options: [{ value: "DESKTOP", label: "Desktop" }, { value: "MOBILE", label: "Mobile" }] },
    { name: "targetUrl", label: "Target URL", type: "url", placeholder: "https://…" },
    { name: "isBrand", label: "Brand keyword?", type: "select", default: "false", options: [{ value: "false", label: "No" }, { value: "true", label: "Yes (brand)" }] },
    { name: "searchIntent", label: "Search intent", type: "select", options: [{ value: "COMMERCIAL", label: "Commercial" }, { value: "INFORMATIONAL", label: "Informational" }, { value: "TRANSACTIONAL", label: "Transactional" }, { value: "NAVIGATIONAL", label: "Navigational" }] },
    { name: "group", label: "Keyword group", type: "text", placeholder: "e.g. Core Services" },
    { name: "baselinePosition", label: "Baseline position (1-101)", type: "number", min: 1, max: 101, hint: "101 = not in top 100" },
    { name: "priority", label: "Priority (1-5)", type: "number", min: 1, max: 5, default: "3" },
  ];
  return (
    <QuickAddModal
      triggerLabel="Add keyword"
      title="Add a keyword"
      description="Add a keyword to track. You can then log ranking snapshots by date for monthly comparison."
      fields={fields}
      action={(fd) => addKeywordAction(clientId, fd)}
    />
  );
}

export function AddRankingSnapshotButton({ clientId, keywords }: { clientId: string; keywords: { id: string; keyword: string }[] }) {
  const fields: QuickField[] = [
    {
      name: "keywordId",
      label: "Keyword",
      type: "select",
      required: true,
      options: keywords.map((k) => ({ value: k.id, label: k.keyword })),
    },
    { name: "date", label: "Date", type: "date", required: true, default: new Date().toISOString().slice(0, 10), hint: "The date this ranking was captured. Use this to log monthly snapshots." },
    { name: "position", label: "Position (1-101)", type: "number", required: true, min: 1, max: 101, hint: "101 = not in top 100" },
    { name: "rankingUrl", label: "Ranking URL", type: "url", placeholder: "https://…" },
  ];
  if (keywords.length === 0) return null;
  return (
    <QuickAddModal
      triggerLabel="Log ranking (by date)"
      title="Log a ranking snapshot"
      description="Record a keyword's position on a specific date. Add one per month to see improvement over time."
      fields={fields}
      action={(fd) => addRankingSnapshotAction(clientId, fd)}
    />
  );
}
