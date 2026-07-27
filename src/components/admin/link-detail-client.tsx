"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteLinkAction,
  toggleLinkAction,
  updateLinkAction,
} from "@/server/actions/links";
import { getPublicAppUrl } from "@/lib/env-public";
import { Copy, Download, ExternalLink } from "lucide-react";

type LinkDetail = {
  id: string;
  name: string | null;
  code: string;
  publicPath: string;
  originalUrl: string;
  targetUrl: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  isActive: boolean;
  expiresAt: string | Date | null;
  clickCountCache: number;
  createdAt: string | Date;
  category: { name: string; slug: string } | null;
  createdBy: { name: string; email: string };
};

export function LinkDetailClient({
  link,
  stats,
  canDelete,
}: {
  link: LinkDetail;
  stats: {
    total: number;
    lastClickAt: string | Date | null;
    byDay: Array<{ day: string; count: number }>;
    byReferer: Array<{ referer: string; count: number }>;
    byDevice: Array<{ deviceType: string; count: number }>;
    byBrowser: Array<{ browser: string; count: number }>;
  };
  canDelete: boolean;
}) {
  const router = useRouter();
  const shortUrl = `${getPublicAppUrl()}/${link.publicPath}`;
  const [targetUrl, setTargetUrl] = useState(link.targetUrl);
  const [name, setName] = useState(link.name || "");
  const [expiresAt, setExpiresAt] = useState(
    link.expiresAt
      ? new Date(link.expiresAt).toISOString().slice(0, 16)
      : "",
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const result = await updateLinkAction({
      id: link.id,
      name: name || null,
      targetUrl,
      expiresAt: expiresAt || null,
    });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Сохранено");
    router.refresh();
  }

  async function toggle() {
    const result = await toggleLinkAction(link.id, !link.isActive);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(link.isActive ? "Ссылка отключена" : "Ссылка включена");
    router.refresh();
  }

  async function remove() {
    if (!confirm("Удалить ссылку?")) return;
    const result = await deleteLinkAction(link.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Удалено");
    router.push("/admin/links");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{name || shortUrl}</h2>
          <p className="mt-1 font-mono text-sm text-flow-green">{shortUrl}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(shortUrl);
              toast.success("Скопировано");
            }}
          >
            <Copy className="h-4 w-4" />
            Копировать
          </Button>
          <Button variant="outline" onClick={() => window.open(shortUrl, "_blank")}>
            <ExternalLink className="h-4 w-4" />
            Открыть
          </Button>
          <a href={`/api/qr/${link.id}`}>
            <Button variant="secondary">
              <Download className="h-4 w-4" />
              QR
            </Button>
          </a>
          <Button variant="secondary" onClick={toggle}>
            {link.isActive ? "Отключить" : "Включить"}
          </Button>
          {canDelete ? (
            <Button variant="danger" onClick={remove}>
              Удалить
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold">Редактирование</h3>
          <div className="space-y-2">
            <Label>Название</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>URL назначения (короткий адрес не изменится)</Label>
            <Input
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Срок действия</Label>
            <Input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
          <Button onClick={save} disabled={saving}>
            {saving ? "Сохранение…" : "Сохранить"}
          </Button>
          <div className="grid gap-2 border-t border-slate-100 pt-4 text-sm">
            <p>
              <span className="text-slate-500">Исходный URL:</span>{" "}
              {link.originalUrl}
            </p>
            <p>
              <span className="text-slate-500">Категория:</span>{" "}
              {link.category?.name || "—"}
            </p>
            <p>
              <span className="text-slate-500">UTM:</span>{" "}
              {[link.utmSource, link.utmMedium, link.utmCampaign]
                .filter(Boolean)
                .join(" · ") || "—"}
            </p>
            <p>
              <span className="text-slate-500">Автор:</span> {link.createdBy.name}
            </p>
            <p>
              <span className="text-slate-500">Создана:</span>{" "}
              {new Date(link.createdAt).toLocaleString("ru-RU")}
            </p>
          </div>
        </div>

        <div
          id="stats"
          className="scroll-mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-5"
        >
          <h3 className="font-semibold">Статистика (30 дней, без ботов)</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Переходы</p>
              <p className="text-2xl font-semibold">{stats.total}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Кеш счётчика</p>
              <p className="text-2xl font-semibold">{link.clickCountCache}</p>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            Последний переход:{" "}
            {stats.lastClickAt
              ? new Date(stats.lastClickAt).toLocaleString("ru-RU")
              : "—"}
          </p>
          <div>
            <p className="mb-2 text-sm font-medium">По дням</p>
            <div className="max-h-40 space-y-1 overflow-auto text-sm">
              {stats.byDay.length === 0 ? (
                <p className="text-slate-500">Нет данных</p>
              ) : (
                stats.byDay.map((d) => (
                  <div key={d.day} className="flex justify-between">
                    <span>{d.day}</span>
                    <span className="font-medium">{d.count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium">Referer</p>
              {stats.byReferer.map((r) => (
                <div key={r.referer} className="flex justify-between text-sm">
                  <span className="truncate pr-2">{r.referer}</span>
                  <span>{r.count}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Устройства / браузеры</p>
              {stats.byDevice.map((r) => (
                <div key={r.deviceType} className="flex justify-between text-sm">
                  <span>{r.deviceType}</span>
                  <span>{r.count}</span>
                </div>
              ))}
              {stats.byBrowser.map((r) => (
                <div key={r.browser} className="flex justify-between text-sm">
                  <span>{r.browser}</span>
                  <span>{r.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
