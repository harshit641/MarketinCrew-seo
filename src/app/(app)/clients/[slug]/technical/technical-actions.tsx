"use client";

import { useTransition } from "react";
import { QuickAddModal } from "@/components/quick-add-modal";
import type { QuickField } from "@/components/quick-add-modal";
import { Button } from "@/components/ui";
import { addTechnicalIssueAction, updateIssueStatusAction, deleteTechnicalIssueAction } from "../data-entry";

const SEVERITY_OPTIONS = [
  { value: "CRITICAL", label: "Critical" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
  { value: "INFO", label: "Info" },
];

const CATEGORY_OPTIONS = [
  "Missing meta description", "Duplicate title tag", "Broken link", "Slow LCP",
  "Slow page speed", "Missing H1", "Thin content", "Redirect chain",
  "Canonical issue", "Indexing blocked", "Missing alt text", "Schema error",
  "Mobile usability", "404 error", "Broken redirect", "Other",
].map((c) => ({ value: c, label: c }));

export function AddTechnicalFixButton({ clientId }: { clientId: string }) {
  const fields: QuickField[] = [
    { name: "url", label: "Affected URL", type: "url", required: true, placeholder: "https://client.com/page" },
    { name: "category", label: "Issue type", type: "select", required: true, options: CATEGORY_OPTIONS, default: "Missing meta description" },
    { name: "severity", label: "Severity", type: "select", default: "MEDIUM", options: SEVERITY_OPTIONS },
    { name: "description", label: "Description", type: "textarea", placeholder: "What is wrong on this page?" },
    { name: "recommendedFix", label: "Recommended fix", type: "textarea", placeholder: "How should this be fixed?" },
  ];
  return (
    <QuickAddModal
      triggerLabel="Log a fix"
      title="Log a technical fix to be done"
      description="Add a technical issue or fix that needs to be done on the client's website."
      fields={fields}
      action={(fd) => addTechnicalIssueAction(clientId, fd)}
    />
  );
}

export function IssueStatusControl({ issueId, currentStatus }: { issueId: string; currentStatus: string }) {
  const [pending, start] = useTransition();
  const next: Record<string, { label: string; status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "IGNORED" }> = {
    OPEN: { label: "→ Start", status: "IN_PROGRESS" },
    IN_PROGRESS: { label: "→ Resolve", status: "RESOLVED" },
    RESOLVED: { label: "↺ Reopen", status: "OPEN" },
    IGNORED: { label: "↺ Reopen", status: "OPEN" },
  };
  const action = next[currentStatus];
  return (
    <div className="flex items-center gap-1">
      {action && (
        <Button
          size="sm"
          variant={currentStatus === "RESOLVED" ? "outline" : "default"}
          className="h-6 px-2 text-[11px]"
          disabled={pending}
          onClick={() => start(async () => { await updateIssueStatusAction(issueId, action.status); })}
        >
          {action.label}
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        className="h-6 px-2 text-[11px] text-danger hover:text-danger"
        disabled={pending}
        onClick={() => start(async () => { await deleteTechnicalIssueAction(issueId); })}
      >
        Delete
      </Button>
    </div>
  );
}
