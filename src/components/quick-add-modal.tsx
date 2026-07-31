"use client";

import { useState, useTransition } from "react";
import { Plus, X, AlertCircle } from "lucide-react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";

/**
 * A reusable "Add" button that opens a modal form. The form fields + the server
 * action are passed in, so each client tab can offer quick single-record entry.
 */
export interface QuickField {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "url" | "select" | "textarea";
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  default?: string;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
}

export function QuickAddModal({
  triggerLabel,
  title,
  description,
  fields,
  action,
}: {
  triggerLabel: string;
  title: string;
  description?: string;
  fields: QuickField[];
  action: (formData: FormData) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    start(async () => {
      const res = await action(formData);
      if (res.ok) {
        setOpen(false);
      } else {
        setError(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> {triggerLabel}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !pending && setOpen(false)} />
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius)] border border-border bg-card p-6 shadow-lg">
            <button className="absolute right-4 top-4 text-muted-foreground hover:text-foreground" onClick={() => !pending && setOpen(false)} disabled={pending}>
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold">{title}</h2>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}

            <form action={onSubmit} className="mt-4 space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-md border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
                  <AlertCircle className="h-4 w-4" /> {error}
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                {fields.map((f) => (
                  <Field
                    key={f.name}
                    label={f.label + (f.required ? " *" : "")}
                    hint={f.hint}
                    className={f.type === "textarea" || f.name === "url" || f.name === "description" || f.name === "recommendedFix" || f.name === "anchorText" ? "sm:col-span-2" : ""}
                  >
                    {f.type === "select" ? (
                      <Select name={f.name} defaultValue={f.default} required={f.required}>
                        {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </Select>
                    ) : f.type === "textarea" ? (
                      <Textarea name={f.name} placeholder={f.placeholder} defaultValue={f.default} required={f.required} rows={2} />
                    ) : (
                      <Input
                        name={f.name}
                        type={f.type ?? "text"}
                        placeholder={f.placeholder}
                        defaultValue={f.default}
                        required={f.required}
                        min={f.min}
                        max={f.max}
                        step={f.step}
                      />
                    )}
                  </Field>
                ))}
              </div>
              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
                <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
