"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RefreshCw, Plug, Unplug, CheckCircle2, AlertCircle } from "lucide-react";
import { Button, Badge } from "@/components/ui";
import { syncSearchConsoleAction, disconnectSearchConsoleAction } from "../gsc-sync";

export function GscConnector({
  clientId,
  status,
  connected,
  property,
  lastSync,
  lastError,
}: {
  clientId: string;
  status: string;
  connected: boolean;
  property?: string | null;
  lastSync?: Date | string | null;
  lastError?: string | null;
}) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const sp = useSearchParams();

  // Surface OAuth outcome from the callback redirect.
  const googleParam = sp.get("google");
  const googleError = sp.get("google_error");
  const flash = googleError
    ? { type: "error" as const, msg: `Google connection failed: ${googleError}` }
    : googleParam === "connected"
    ? { type: "success" as const, msg: "Google Search Console connected successfully." }
    : null;

  function sync() {
    setError(null);
    setResult(null);
    start(async () => {
      const res = await syncSearchConsoleAction(clientId, 28);
      if (res.ok) {
        setResult(`Synced ${res.data.daysSynced} days from ${res.data.property}.`);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function disconnect() {
    start(async () => {
      await disconnectSearchConsoleAction(clientId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-[var(--radius)] border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`flex h-8 w-8 items-center justify-center rounded-md ${connected ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
            <Plug className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium">Google Search Console</p>
            <p className="text-xs text-muted-foreground">
              {connected ? (property ?? "Connected") : "Not connected"}
              {lastSync && connected && ` · Last sync ${new Date(lastSync).toLocaleDateString()}`}
            </p>
          </div>
          {connected && <Badge tone="success">Connected</Badge>}
          {status === "ERROR" && <Badge tone="danger">Error</Badge>}
        </div>

        <div className="flex gap-2">
          {!connected ? (
            <Button asChild size="sm">
              <a href={`/api/integrations/google/connect?client=${clientId}`}>
                <Plug className="h-4 w-4" /> Connect Google
              </a>
            </Button>
          ) : (
            <>
              <Button size="sm" onClick={sync} disabled={pending}>
                <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} /> Sync data
              </Button>
              <Button size="sm" variant="outline" onClick={disconnect} disabled={pending}>
                <Unplug className="h-4 w-4" /> Disconnect
              </Button>
            </>
          )}
        </div>
      </div>

      {flash?.type === "success" && (
        <p className="flex items-center gap-1.5 text-sm text-success"><CheckCircle2 className="h-4 w-4" /> {flash.msg}</p>
      )}
      {flash?.type === "error" && (
        <p className="flex items-center gap-1.5 text-sm text-danger"><AlertCircle className="h-4 w-4" /> {flash.msg}</p>
      )}
      {error && <p className="flex items-center gap-1.5 text-sm text-danger"><AlertCircle className="h-4 w-4" /> {error}</p>}
      {result && <p className="flex items-center gap-1.5 text-sm text-success"><CheckCircle2 className="h-4 w-4" /> {result}</p>}
      {lastError && status === "ERROR" && <p className="flex items-center gap-1.5 text-sm text-danger"><AlertCircle className="h-4 w-4" /> {lastError}</p>}
    </div>
  );
}
