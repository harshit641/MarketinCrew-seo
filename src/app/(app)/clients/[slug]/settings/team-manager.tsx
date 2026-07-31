"use client";

import { useTransition } from "react";
import { UserMinus, UserPlus } from "lucide-react";
import { Button, Select, Badge } from "@/components/ui";
import { assignTeamMemberAction, removeAssignmentAction } from "../../actions";
import { ROLE_LABELS } from "@/lib/constants";
import { SystemRole } from "@/generated/prisma/enums";
import { useState } from "react";

export interface AssignmentRow {
  employeeId: string;
  userId: string;
  name: string;
  role: SystemRole;
}

export function TeamAssignmentManager({
  clientId,
  assignments,
  staff,
}: {
  clientId: string;
  assignments: AssignmentRow[];
  staff: { id: string; name: string }[];
}) {
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState("");
  const [role, setRole] = useState<SystemRole>(SystemRole.SEO_EXECUTIVE);

  const assignedIds = new Set(assignments.map((a) => a.employeeId));
  const available = staff.filter((s) => !assignedIds.has(s.id));

  function assign() {
    if (!selected) return;
    start(async () => {
      await assignTeamMemberAction(clientId, selected, role);
      setSelected("");
    });
  }

  function remove(employeeId: string) {
    start(async () => {
      await removeAssignmentAction(clientId, employeeId);
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {assignments.length === 0 && (
          <p className="text-sm text-muted-foreground">No team members assigned yet.</p>
        )}
        {assignments.map((a) => (
          <div key={a.employeeId} className="flex items-center justify-between rounded-md border border-border p-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                {a.name[0]}
              </span>
              <span className="text-sm font-medium">{a.name}</span>
              <Badge tone="neutral">{ROLE_LABELS[a.role]}</Badge>
            </div>
            <Button variant="ghost" size="sm" disabled={pending} onClick={() => remove(a.employeeId)}>
              <UserMinus className="h-4 w-4" /> Remove
            </Button>
          </div>
        ))}
      </div>

      {available.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Add team member</label>
            <Select value={selected} onChange={(e) => setSelected(e.target.value)} disabled={pending}>
              <option value="">Select…</option>
              {available.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </div>
          <div className="w-full space-y-1 sm:w-44">
            <label className="text-xs font-medium text-muted-foreground">Role</label>
            <Select value={role} onChange={(e) => setRole(e.target.value as SystemRole)} disabled={pending}>
              <option value={SystemRole.SEO_MANAGER}>SEO Manager</option>
              <option value={SystemRole.SEO_EXECUTIVE}>SEO Executive</option>
            </Select>
          </div>
          <Button onClick={assign} disabled={pending || !selected}>
            <UserPlus className="h-4 w-4" /> Assign
          </Button>
        </div>
      )}
    </div>
  );
}
