"use client";

import { QuickAddModal } from "@/components/quick-add-modal";
import type { QuickField } from "@/components/quick-add-modal";
import { addAnalyticsAction, addSearchConsoleAction } from "./data-entry";

export function AddAnalyticsButton({ clientId }: { clientId: string }) {
  const fields: QuickField[] = [
    { name: "date", label: "Date", type: "date", required: true, default: new Date().toISOString().slice(0, 10), hint: "Log organic sessions/users/conversions for a specific date." },
    { name: "sessions", label: "Sessions", type: "number", min: 0, default: "0" },
    { name: "users", label: "Users", type: "number", min: 0, default: "0" },
    { name: "newUsers", label: "New users", type: "number", min: 0, default: "0" },
    { name: "conversions", label: "Conversions", type: "number", min: 0, default: "0" },
    { name: "revenue", label: "Revenue (optional)", type: "number", min: 0, step: 0.01 },
  ];
  return (
    <QuickAddModal
      triggerLabel="Add analytics"
      title="Log analytics data"
      description="Manually enter GA4 organic metrics for a date. Re-entering a date updates it."
      fields={fields}
      action={(fd) => addAnalyticsAction(clientId, fd)}
    />
  );
}

export function AddSearchConsoleButton({ clientId }: { clientId: string }) {
  const fields: QuickField[] = [
    { name: "date", label: "Date", type: "date", required: true, default: new Date().toISOString().slice(0, 10) },
    { name: "clicks", label: "Clicks", type: "number", min: 0, default: "0" },
    { name: "impressions", label: "Impressions", type: "number", min: 0, default: "0" },
    { name: "ctr", label: "CTR (optional, decimal)", type: "number", min: 0, step: 0.0001, hint: "Leave blank to auto-calculate from clicks/impressions" },
    { name: "position", label: "Avg position (optional)", type: "number", min: 0, step: 0.1, hint: "GSC average position — NOT exact SERP rank" },
    { name: "query", label: "Query (optional)", type: "text" },
    { name: "page", label: "Page (optional)", type: "url" },
  ];
  return (
    <QuickAddModal
      triggerLabel="Add Search Console data"
      title="Log Search Console data"
      description="Manually enter Google Search Console metrics for a date (or sync automatically once connected)."
      fields={fields}
      action={(fd) => addSearchConsoleAction(clientId, fd)}
    />
  );
}
