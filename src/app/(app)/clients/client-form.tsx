"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { createClientAction, updateClientAction } from "./actions";
import type { ActionResult } from "@/app/(auth)/actions";
import type { Client } from "@/generated/prisma/client";

const COMMON_TIMEZONES = [
  "UTC", "Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Europe/London",
  "Europe/Berlin", "America/New_York", "America/Chicago", "America/Los_Angeles",
];

type FormResult = ActionResult<{ slug?: string }>;

async function handleSubmit(
  mode: "create" | "edit",
  clientId: string,
  _prev: unknown,
  formData: FormData,
): Promise<FormResult> {
  if (mode === "create") return createClientAction(undefined, formData);
  const res = await updateClientAction(clientId, formData);
  return res.ok ? { ok: true, data: {} } : res;
}

export function ClientForm({
  mode,
  client,
}: {
  mode: "create" | "edit";
  client?: Client;
}) {
  const router = useRouter();
  const clientId = client?.id ?? "";
  const action = (_prev: unknown, formData: FormData) => handleSubmit(mode, clientId, _prev, formData);
  const [state, formAction, pending] = useActionState(action, undefined);

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      if (mode === "create" && "slug" in state.data) router.push(`/clients/${state.data.slug}`);
      else router.refresh();
    }
  }, [state, mode, router]);

  const error = state && "error" in state ? state.error : undefined;

  return (
    <form action={formAction} className="space-y-6">
      {error && (
        <div className="rounded-md border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>
      )}

      <fieldset className="space-y-4 rounded-[var(--radius)] border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">General information</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Client name *">
            <Input name="name" defaultValue={client?.name} required />
          </Field>
          <Field label="Website URL *">
            <Input name="websiteUrl" type="url" placeholder="https://example.com" defaultValue={client?.websiteUrl} required />
          </Field>
          <Field label="Industry">
            <Input name="industry" defaultValue={client?.industry ?? undefined} />
          </Field>
          <Field label="Service package">
            <Input name="servicePackage" defaultValue={client?.servicePackage ?? undefined} placeholder="e.g. Growth SEO Retainer" />
          </Field>
          <Field label="Country">
            <Input name="country" defaultValue={client?.country ?? undefined} />
          </Field>
          <Field label="City / target location">
            <Input name="city" defaultValue={client?.city ?? undefined} />
          </Field>
          <Field label="Time zone">
            <Select name="timezone" defaultValue={client?.timezone ?? "UTC"}>
              {COMMON_TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </Select>
          </Field>
          <Field label="Contract status">
            <Select name="contractStatus" defaultValue={client?.contractStatus ?? "ACTIVE"}>
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="ENDED">Ended</option>
              <option value="PROSPECT">Prospect</option>
            </Select>
          </Field>
          <Field label="Primary contact">
            <Input name="primaryContact" defaultValue={client?.primaryContact ?? undefined} />
          </Field>
          <Field label="Contact email">
            <Input name="contactEmail" type="email" defaultValue={client?.contactEmail ?? undefined} />
          </Field>
          <Field label="Monthly report day">
            <Input name="monthlyReportDay" type="number" min={1} max={28} defaultValue={client?.monthlyReportDay ?? 1} />
          </Field>
          <Field label="Start date">
            <Input name="startDate" type="date" defaultValue={client?.startDate ? toInputDate(client.startDate) : undefined} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4 rounded-[var(--radius)] border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">SEO setup</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Primary domain" hint="Leave blank to derive from the website URL.">
            <Input name="primaryDomain" defaultValue={client?.primaryDomain ?? undefined} />
          </Field>
          <Field label="Target locations" hint="Comma-separated, e.g. Mumbai, Pune">
            <Input name="targetLocations" defaultValue={client?.targetLocations?.join(", ")} />
          </Field>
          <Field label="Competitor domains" hint="Comma-separated, e.g. rival1.com, rival2.com" className="sm:col-span-2">
            <Input name="competitorDomains" defaultValue={client?.competitorDomains?.join(", ")} />
          </Field>
          <Field label="Client SEO goals" hint="Free-text goals for this account." className="sm:col-span-2">
            <Textarea name="clientGoalsText" rows={3} defaultValue={client?.clientGoalsText ?? undefined} />
          </Field>
        </div>
      </fieldset>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : mode === "create" ? "Create client" : "Save changes"}</Button>
      </div>
    </form>
  );
}

function toInputDate(d: Date | string): string {
  return new Date(d).toISOString().slice(0, 10);
}
