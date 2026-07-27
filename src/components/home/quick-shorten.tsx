"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, Copy, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createPublicLinkAction,
  getPublicQuotaAction,
} from "@/server/actions/public-links";
import { analyzeUrl } from "@/lib/url";

export function QuickShorten() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limit, setLimit] = useState(5);

  useEffect(() => {
    getPublicQuotaAction().then((q) => {
      setRemaining(q.remaining);
      setLimit(q.limit);
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const analysis = analyzeUrl(url);
    if (!analysis.ok) {
      toast.error(analysis.error);
      return;
    }

    setLoading(true);
    const result = await createPublicLinkAction({
      originalUrl: analysis.href,
    });
    setLoading(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    setShortUrl(result.shortUrl);
    setRemaining(result.remaining);
    setLimit(result.limit);
    toast.success("Ссылка создана.");
  }

  async function copy() {
    if (!shortUrl) return;
    await navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    toast.success("Скопировано.");
    setTimeout(() => setCopied(false), 1500);
  }

  const quotaExhausted = remaining === 0;

  return (
    <div className="w-full max-w-xl">
      <form onSubmit={onSubmit}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Вставьте длинную ссылку"
            className="h-12 border-border bg-white text-base"
            disabled={quotaExhausted}
            autoFocus
            inputMode="url"
            autoComplete="url"
          />
          <Button
            type="submit"
            disabled={loading || quotaExhausted || !url.trim()}
            className="h-12 shrink-0 px-6"
          >
            {loading ? "…" : "Создать"}
            {!loading ? <ArrowRight className="h-4 w-4" /> : null}
          </Button>
        </div>
      </form>

      {shortUrl ? (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3">
          <p className="min-w-0 flex-1 truncate font-mono text-sm text-deep-current">
            {shortUrl}
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={copy}
            className="shrink-0"
          >
            {copied ? (
              <Check className="h-4 w-4 text-flow-green" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            Копировать
          </Button>
        </div>
      ) : null}

      <p className="mt-4 text-sm text-muted">
        {remaining === null
          ? "Без аккаунта — до 5 сокращений с вашего адреса."
          : quotaExhausted
            ? "Лимит исчерпан. Войдите через Bitrix24 для UTM, статистики и новых ссылок."
            : `Осталось: ${remaining} из ${limit}.`}{" "}
        <Link
          href="/login"
          className="font-medium text-flow-green underline-offset-2 hover:underline"
        >
          Войти через Bitrix24
        </Link>
      </p>
    </div>
  );
}
