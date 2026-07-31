"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Share2, FileDown, Send } from "lucide-react";
import { Button } from "@/components/ui";
import { approveReportAction, deliverReportAction } from "../actions";
import type { ReportStatus } from "@/generated/prisma/enums";

export function ReportActions({
  reportId,
  status,
  canEdit,
  canApprove,
  canDeliver,
  clientSlug,
}: {
  reportId: string;
  status: ReportStatus;
  canEdit: boolean;
  canApprove: boolean;
  canDeliver: boolean;
  clientSlug: string;
}) {
  const [pending, start] = useTransition();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const router = useRouter();

  function approve() {
    start(async () => {
      await approveReportAction(reportId);
      router.refresh();
    });
  }
  function deliver() {
    start(async () => {
      const res = await deliverReportAction(reportId);
      if (res.ok) setShareUrl(res.data.shareUrl);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius)] border border-border bg-card p-3">
      {canEdit && (
        <Button asChild variant="outline" size="sm">
          <a href={`/reports/${reportId}/pdf`} target="_blank" rel="noreferrer">
            <FileDown className="h-4 w-4" /> Preview PDF
          </a>
        </Button>
      )}
      {canApprove && status !== "APPROVED" && status !== "DELIVERED" && (
        <Button size="sm" onClick={approve} disabled={pending}>
          <CheckCircle2 className="h-4 w-4" /> Approve report
        </Button>
      )}
      {canDeliver && (status === "APPROVED" || status === "DELIVERED") && (
        <Button size="sm" onClick={deliver} disabled={pending}>
          <Send className="h-4 w-4" /> {status === "DELIVERED" ? "Get share link" : "Deliver to client"}
        </Button>
      )}
      {shareUrl && (
        <div className="flex items-center gap-2 rounded-md bg-muted px-2 py-1 text-xs">
          <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Share link:</span>
          <Link href={shareUrl} className="font-medium text-primary hover:underline">{shareUrl}</Link>
        </div>
      )}
      <span className="ml-auto text-xs text-muted-foreground">
        Status: <b className="text-foreground">{status}</b>
      </span>
    </div>
  );
}
