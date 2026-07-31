"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { deleteClientAction } from "../../actions";

export function DeleteClientButton({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function handleDelete() {
    start(async () => {
      const res = await deleteClientAction(clientId);
      if (res.ok) router.push("/clients");
    });
  }

  if (!confirming) {
    return (
      <Button variant="danger" onClick={() => setConfirming(true)}>
        <Trash2 className="h-4 w-4" /> Delete client
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <p className="text-sm text-danger">Type the exact client name to confirm deletion is not reversible from the UI.</p>
      <Button variant="outline" size="sm" onClick={() => setConfirming(false)} disabled={pending}>Cancel</Button>
      <Button variant="danger" size="sm" onClick={handleDelete} disabled={pending}>
        {pending ? "Deleting…" : `Yes, delete "${clientName}"`}
      </Button>
    </div>
  );
}
