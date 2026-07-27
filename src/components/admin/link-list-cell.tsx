"use client";

import Link from "next/link";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export function LinkListCell({
  id,
  name,
  shortUrl,
}: {
  id: string;
  name: string | null;
  shortUrl: string;
}) {
  async function copyUrl() {
    await navigator.clipboard.writeText(shortUrl);
    toast.success("Ссылка скопирована");
  }

  return (
    <div className="min-w-0 space-y-1">
      <Link
        href={`/admin/links/${id}`}
        className="block truncate font-medium text-carbon hover:text-flow-green"
        title={name || undefined}
      >
        {name || "—"}
      </Link>
      <div className="flex min-w-0 items-center gap-1">
        <Link
          href={`/admin/links/${id}`}
          className="min-w-0 truncate font-mono text-xs text-flow-green hover:underline"
          title={shortUrl}
        >
          {shortUrl}
        </Link>
        <button
          type="button"
          onClick={copyUrl}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-flow-green"
          title="Копировать ссылку"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <a
          href={shortUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-flow-green"
          title="Открыть ссылку"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
