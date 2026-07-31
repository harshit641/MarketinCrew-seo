"use client";

import { useState, useTransition } from "react";
import { Check, X, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui";
import { approveWorkLogAction } from "./actions";

export function ApprovalActions({ workLogId }: { workLogId: string }) {
  const [pending, start] = useTransition();
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState("");

  function decide(decision: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED") {
    start(async () => {
      await approveWorkLogAction(workLogId, decision, note || undefined);
      setNote("");
      setShowNote(false);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex gap-1.5">
        <Button size="sm" variant="outline" disabled={pending} onClick={() => decide("REJECTED")} className="h-7 text-xs">
          <X className="h-3.5 w-3.5" /> Reject
        </Button>
        <Button size="sm" disabled={pending} onClick={() => decide("APPROVED")} className="h-7 text-xs">
          <Check className="h-3.5 w-3.5" /> Approve
        </Button>
      </div>
      {showNote ? (
        <div className="flex items-center gap-1">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="h-7 w-40 rounded border border-border px-2 text-xs"
          />
          <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={pending} onClick={() => decide("CHANGES_REQUESTED")}>
            Send
          </Button>
        </div>
      ) : (
        <button
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          onClick={() => setShowNote(true)}
        >
          <MessageSquare className="h-3 w-3" /> Request changes
        </button>
      )}
    </div>
  );
}
