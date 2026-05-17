"use client";

import { useState } from "react";
import { Check, Copy, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  subject: string;
  bodyHtml: string;
}

export function VariantPreview({ subject, bodyHtml }: Props) {
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState<"subject" | "html" | null>(null);

  async function copy(text: string, type: "subject" | "html") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 1500);
    } catch (err) {
      console.error("Clipboard failed:", err);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => copy(subject, "subject")}
          className="flex-1"
        >
          {copied === "subject" ? (
            <>
              <Check className="size-3.5" />
              Copié
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              Sujet
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => copy(bodyHtml, "html")}
          className="flex-1"
        >
          {copied === "html" ? (
            <>
              <Check className="size-3.5" />
              Copié
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              HTML
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowPreview((s) => !s)}
        >
          {showPreview ? (
            <EyeOff className="size-3.5" />
          ) : (
            <Eye className="size-3.5" />
          )}
        </Button>
      </div>

      {showPreview && (
        <div className="overflow-hidden rounded-md border border-[var(--border-subtle)]">
          <iframe
            srcDoc={bodyHtml}
            title={subject}
            sandbox="allow-same-origin"
            className="block h-[400px] w-full bg-white"
          />
        </div>
      )}
    </div>
  );
}
