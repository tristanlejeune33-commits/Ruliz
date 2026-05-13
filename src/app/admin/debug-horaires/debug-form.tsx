"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { debugSaveHoraires } from "./actions";

export function DebugHorairesForm({
  restaurantId,
  currentHappyStart,
  currentHappyEnd,
}: {
  restaurantId: string;
  currentHappyStart: string;
  currentHappyEnd: string;
}) {
  const router = useRouter();
  const [start, setStart] = useState(currentHappyStart);
  const [end, setEnd] = useState(currentHappyEnd);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const onSubmit = async () => {
    setPending(true);
    setResult(null);
    try {
      const res = await debugSaveHoraires({ restaurantId, start, end });
      setResult(JSON.stringify(res, null, 2));
      if (res.ok) {
        toast.success("Save raw SQL OK");
        // Refresh la page pour voir la nouvelle valeur (étape 2)
        router.refresh();
      } else {
        toast.error(`Save fail : ${res.error}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setResult(`EXCEPTION : ${msg}`);
      toast.error(`Exception : ${msg}`);
    }
    setPending(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <div>
          <label className="block text-xs font-medium mb-1">
            Happy Hour Start
          </label>
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="rounded border border-[var(--border-glass)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">
            Happy Hour End
          </label>
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="rounded border border-[var(--border-glass)] px-3 py-2 text-sm"
          />
        </div>
        <Button onClick={onSubmit} disabled={pending}>
          {pending ? "Test..." : "Tester raw SQL UPDATE"}
        </Button>
      </div>
      {result && (
        <pre className="rounded bg-black/80 p-3 text-xs text-green-400 overflow-x-auto">
          {result}
        </pre>
      )}
    </div>
  );
}
