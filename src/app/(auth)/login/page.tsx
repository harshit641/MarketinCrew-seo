"use client";

import { useEffect, useActionState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import { loginAction } from "@/app/(auth)/actions";

export default function LoginPage() {
  // useSearchParams must be inside a Suspense boundary for static prerender.
  return (
    <Suspense fallback={<LoginShell />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginShell({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-sidebar text-white shadow-sm">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight">MarketinCrew SEO</h1>
          <p className="text-sm text-muted-foreground">Sign in to the Command Center</p>
        </div>
        {children}
      </div>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      const next = params.get("next") || "/agency";
      router.push(next);
      router.refresh();
    }
  }, [state, params, router]);

  const error = state && "error" in state ? state.error : undefined;

  return (
    <LoginShell>
        <form action={formAction} className="space-y-4 rounded-[var(--radius)] border border-border bg-card p-6 shadow-sm">
          {error && (
            <div className="rounded-md border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}
          <Field label="Work email" htmlFor="email" error={undefined}>
            <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
          </Field>
          <Field label="Password" htmlFor="password">
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </Field>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Demo logins available after running <code className="rounded bg-muted px-1">npm run seed</code>
          </p>
        </form>
    </LoginShell>
  );
}
