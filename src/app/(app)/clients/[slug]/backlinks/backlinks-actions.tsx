"use client";

import { QuickAddModal } from "@/components/quick-add-modal";
import type { QuickField } from "@/components/quick-add-modal";
import { addBacklinkAction } from "../data-entry";

export function AddBacklinkButton({ clientId }: { clientId: string }) {
  const fields: QuickField[] = [
    { name: "sourceUrl", label: "Source URL", type: "url", required: true, placeholder: "https://blog.example.com/article" },
    { name: "targetUrl", label: "Target URL", type: "url", required: true, placeholder: "https://client.com/page" },
    { name: "anchorText", label: "Anchor text", type: "text", placeholder: "roof repair services" },
    { name: "linkType", label: "Link type", type: "select", default: "DOFOLLOW", options: [{ value: "DOFOLLOW", label: "Dofollow" }, { value: "NOFOLLOW", label: "Nofollow" }, { value: "SPONSORED", label: "Sponsored" }, { value: "UGC", label: "UGC" }] },
    { name: "status", label: "Status", type: "select", default: "LIVE", options: [{ value: "LIVE", label: "Live" }, { value: "LOST", label: "Lost" }, { value: "BROKEN", label: "Broken" }, { value: "PENDING", label: "Pending" }] },
    { name: "domainRating", label: "Domain rating (0-100)", type: "number", min: 0, max: 100 },
    { name: "acquiredAt", label: "Date acquired", type: "date", required: true, default: new Date().toISOString().slice(0, 10) },
    { name: "cost", label: "Cost", type: "number", min: 0, step: 0.01 },
    { name: "vendor", label: "Vendor", type: "text" },
    { name: "campaign", label: "Campaign", type: "text" },
    { name: "linkBuildingMethod", label: "Method", type: "text", placeholder: "Guest post, outreach…" },
  ];
  return (
    <QuickAddModal
      triggerLabel="Add backlink"
      title="Add a backlink"
      description="Manually log a backlink with its acquisition date."
      fields={fields}
      action={(fd) => addBacklinkAction(clientId, fd)}
    />
  );
}
