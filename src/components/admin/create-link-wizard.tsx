"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { analyzeUrl, applyUtmToUrl } from "@/lib/url";
import { normalizeUtmValue } from "@/lib/code";
import { getPublicAppUrl } from "@/lib/env-public";
import { Copy, Download, ExternalLink, Check } from "lucide-react";
import { createLinkAction } from "@/server/actions/links";

type CatalogItem = { id: string; name: string; value?: string; slug?: string };

type CreatedLink = {
  id: string;
  code: string;
  publicPath: string;
  originalUrl: string;
  targetUrl: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  createdAt: string | Date;
  category: { name: string; slug: string } | null;
  createdBy: { name: string };
};

export function CreateLinkWizard({
  categories,
  sources,
  media,
}: {
  categories: CatalogItem[];
  sources: CatalogItem[];
  media: CatalogItem[];
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [url, setUrl] = useState("");
  const [scenario, setScenario] = useState<"plain" | "utm" | null>(null);
  const [existingUtmMode, setExistingUtmMode] = useState<
    "keep" | "replace" | "remove"
  >("replace");
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [customAlias, setCustomAlias] = useState("");
  const [utmSource, setUtmSource] = useState("");
  const [utmMedium, setUtmMedium] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [utmContent, setUtmContent] = useState("");
  const [utmTerm, setUtmTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<CreatedLink | null>(null);
  const [copied, setCopied] = useState(false);

  const analysis = useMemo(() => (url ? analyzeUrl(url) : null), [url]);

  const previewTarget = useMemo(() => {
    if (!analysis || !analysis.ok) return null;
    if (scenario === "plain") return analysis.href;
    if (existingUtmMode === "keep" && analysis.hasUtm) return analysis.href;
    if (existingUtmMode === "remove") {
      return applyUtmToUrl(analysis.href, {}, "remove");
    }
    try {
      return applyUtmToUrl(
        analysis.href,
        {
          source: utmSource ? normalizeUtmValue(utmSource) : null,
          medium: utmMedium ? normalizeUtmValue(utmMedium) : null,
          campaign: utmCampaign ? normalizeUtmValue(utmCampaign) : null,
          content: utmContent ? normalizeUtmValue(utmContent) : null,
          term: utmTerm ? normalizeUtmValue(utmTerm) : null,
        },
        "replace",
      );
    } catch {
      return null;
    }
  }, [
    analysis,
    scenario,
    existingUtmMode,
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm,
  ]);

  const shortPreview = useMemo(() => {
    const base = getPublicAppUrl();
    const category = categories.find((c) => c.id === categoryId);
    const code = customAlias || (categoryId ? "•••••" : "•••••••");
    return category?.slug
      ? `${base}/${category.slug}/${code}`
      : `${base}/${code}`;
  }, [categories, categoryId, customAlias]);

  function goScenario() {
    if (!analysis || !analysis.ok) {
      toast.error(analysis?.ok === false ? analysis.error : "Укажите URL");
      return;
    }
    setStep(2);
  }

  async function create() {
    if (!analysis || !analysis.ok || !scenario) return;
    setLoading(true);

    let utmMode: "none" | "keep" | "replace" | "remove" = "none";
    if (scenario === "utm") {
      if (analysis.hasUtm) {
        utmMode = existingUtmMode;
      } else {
        utmMode = "replace";
      }
    }

    const result = await createLinkAction({
      name: name || undefined,
      originalUrl: analysis.href,
      categoryId: categoryId || null,
      customAlias: customAlias || null,
      utmMode,
      utmSource: utmMode === "replace" ? utmSource : null,
      utmMedium: utmMode === "replace" ? utmMedium : null,
      utmCampaign: utmMode === "replace" ? utmCampaign : null,
      utmContent: utmMode === "replace" ? utmContent : null,
      utmTerm: utmMode === "replace" ? utmTerm : null,
    });
    setLoading(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    setCreated(result.link as unknown as CreatedLink);
    setStep(4);
    toast.success("Ссылка создана.");
  }

  const createdUrl = created
    ? `${getPublicAppUrl()}/${created.publicPath}`
    : "";

  async function copyUrl() {
    await navigator.clipboard.writeText(createdUrl);
    setCopied(true);
    toast.success("Скопировано.");
    setTimeout(() => setCopied(false), 1500);
  }

  function reset() {
    setStep(1);
    setUrl("");
    setScenario(null);
    setName("");
    setCategoryId("");
    setCustomAlias("");
    setUtmSource("");
    setUtmMedium("");
    setUtmCampaign("");
    setUtmContent("");
    setUtmTerm("");
    setCreated(null);
  }

  const showUtmFields =
    scenario === "utm" &&
    (!analysis?.ok ||
      !analysis.hasUtm ||
      existingUtmMode === "replace");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-carbon">Создание ссылки</h2>
        <p className="mt-1 text-sm text-slate-500">
          Пошаговый сценарий: ссылка → UTM → короткий адрес → готово
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { n: 1, label: "Ссылка" },
          { n: 2, label: "UTM" },
          { n: 3, label: "Короткий адрес" },
          { n: 4, label: "Готово" },
        ].map((s) => (
          <Badge
            key={s.n}
            className={
              step === s.n
                ? "bg-deep-current text-white"
                : step > s.n
                  ? "bg-flow-green/15 text-flow-green"
                  : ""
            }
          >
            {s.n}. {s.label}
          </Badge>
        ))}
      </div>

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Исходная ссылка</CardTitle>
            <CardDescription>
              Только http/https. Система проверит URL и наличие UTM.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                placeholder="https://example.com/page"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            {analysis?.ok ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                <p>
                  <span className="text-slate-500">Домен:</span> {analysis.origin}
                </p>
                <p className="mt-1">
                  <span className="text-slate-500">Страница:</span>{" "}
                  {analysis.pathname}
                </p>
                {analysis.hasUtm ? (
                  <p className="mt-2 text-amber-700">
                    В ссылке уже есть UTM-разметка. На следующем шаге можно
                    сохранить, изменить или удалить её.
                  </p>
                ) : (
                  <p className="mt-2 text-slate-600">UTM-меток не обнаружено.</p>
                )}
              </div>
            ) : analysis && !analysis.ok ? (
              <p className="text-sm text-red-600">{analysis.error}</p>
            ) : null}
            <Button onClick={goScenario}>Далее</Button>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Сценарий и UTM</CardTitle>
            <CardDescription>
              Выберите: просто сократить или добавить UTM-метки.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setScenario("plain")}
                className={`rounded-lg border p-4 text-left ${
                  scenario === "plain"
                    ? "border-deep-current bg-canvas"
                    : "border-border"
                }`}
              >
                <p className="font-medium">Просто сократить</p>
                <p className="mt-1 text-sm text-slate-500">
                  Без изменения UTM-разметки
                </p>
              </button>
              <button
                type="button"
                onClick={() => setScenario("utm")}
                className={`rounded-lg border p-4 text-left ${
                  scenario === "utm"
                    ? "border-deep-current bg-canvas"
                    : "border-border"
                }`}
              >
                <p className="font-medium">Добавить UTM и сократить</p>
                <p className="mt-1 text-sm text-slate-500">
                  Конструктор UTM-меток
                </p>
              </button>
            </div>

            {scenario === "utm" && analysis?.ok && analysis.hasUtm ? (
              <div className="space-y-2">
                <Label>Существующая UTM-разметка</Label>
                <Select
                  value={existingUtmMode}
                  onChange={(e) =>
                    setExistingUtmMode(
                      e.target.value as "keep" | "replace" | "remove",
                    )
                  }
                >
                  <option value="keep">Сохранить существующую</option>
                  <option value="replace">Изменить разметку</option>
                  <option value="remove">Удалить разметку</option>
                </Select>
              </div>
            ) : null}

            {showUtmFields ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Источник (utm_source) *</Label>
                  <Select
                    value={utmSource}
                    onChange={(e) => setUtmSource(e.target.value)}
                  >
                    <option value="">Выберите источник</option>
                    {sources.map((s) => (
                      <option key={s.id} value={s.value}>
                        {s.name} ({s.value})
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Канал (utm_medium) *</Label>
                  <Select
                    value={utmMedium}
                    onChange={(e) => setUtmMedium(e.target.value)}
                  >
                    <option value="">Выберите канал</option>
                    {media.map((s) => (
                      <option key={s.id} value={s.value}>
                        {s.name} ({s.value})
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Кампания (utm_campaign) *</Label>
                  <Input
                    value={utmCampaign}
                    onChange={(e) => setUtmCampaign(e.target.value)}
                    placeholder="summer_houses_2026"
                  />
                  {utmCampaign ? (
                    <p className="text-xs text-slate-500">
                      Нормализация: {normalizeUtmValue(utmCampaign)}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label>Содержание (utm_content)</Label>
                  <Input
                    value={utmContent}
                    onChange={(e) => setUtmContent(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ключевое слово (utm_term)</Label>
                  <Input
                    value={utmTerm}
                    onChange={(e) => setUtmTerm(e.target.value)}
                  />
                </div>
              </div>
            ) : null}

            {previewTarget ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm break-all">
                <p className="text-slate-500">Итоговый URL назначения:</p>
                <p className="mt-1 font-mono text-xs text-slate-800">
                  {previewTarget}
                </p>
              </div>
            ) : null}

            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep(1)}>
                Назад
              </Button>
              <Button
                onClick={() => {
                  if (!scenario) {
                    toast.error("Выберите сценарий");
                    return;
                  }
                  if (
                    showUtmFields &&
                    (!utmSource || !utmMedium || !utmCampaign)
                  ) {
                    toast.error("Заполните обязательные UTM-поля");
                    return;
                  }
                  setStep(3);
                }}
              >
                Далее
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card>
          <CardHeader>
            <CardTitle>Категория и короткий адрес</CardTitle>
            <CardDescription>
              Код генерируется автоматически. Можно задать свой алиас.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Название (необязательно, иначе H1 страницы)</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Оставьте пустым — подставим заголовок страницы"
              />
            </div>
            <div className="space-y-2">
              <Label>Категория</Label>
              <Select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">Без категории</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.slug})
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Свой алиас (необязательно)</Label>
              <Input
                value={customAlias}
                onChange={(e) => setCustomAlias(e.target.value)}
                placeholder="modul-120"
              />
              <p className="text-xs text-slate-500">
                Латиница, цифры, дефис. 3–64 символа. Регистр не влияет на
                уникальность.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="text-slate-500">Предпросмотр:</p>
              <p className="mt-1 font-mono text-sm">{shortPreview}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep(2)}>
                Назад
              </Button>
              <Button onClick={create} disabled={loading}>
                {loading ? "Создание…" : "Создать короткую ссылку"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 4 && created ? (
        <Card>
          <CardHeader>
            <CardTitle>Готово</CardTitle>
            <CardDescription>Ссылка создана и готова к использованию</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-slate-500">Короткая ссылка</p>
              <p className="mt-1 font-mono text-lg font-medium break-all">
                {createdUrl}
              </p>
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-slate-500">Исходный URL</p>
                <p className="mt-1 break-all">{created.originalUrl}</p>
              </div>
              <div>
                <p className="text-slate-500">Страница назначения</p>
                <p className="mt-1 break-all">{created.targetUrl}</p>
              </div>
              <div>
                <p className="text-slate-500">Категория</p>
                <p className="mt-1">
                  {created.category?.name || "Без категории"}
                </p>
              </div>
              <div>
                <p className="text-slate-500">UTM</p>
                <p className="mt-1">
                  {[created.utmSource, created.utmMedium, created.utmCampaign]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Автор</p>
                <p className="mt-1">{created.createdBy.name}</p>
              </div>
              <div>
                <p className="text-slate-500">Создано</p>
                <p className="mt-1">
                  {new Date(created.createdAt).toLocaleString("ru-RU")}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={copyUrl}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                Скопировать
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(createdUrl, "_blank")}
              >
                <ExternalLink className="h-4 w-4" />
                Открыть
              </Button>
              <a href={`/api/qr/${created.id}`}>
                <Button variant="secondary" type="button">
                  <Download className="h-4 w-4" />
                  Скачать QR-код
                </Button>
              </a>
              <a href={`/admin/links/${created.id}`}>
                <Button variant="ghost" type="button">
                  Статистика
                </Button>
              </a>
              <Button variant="outline" onClick={reset}>
                Создать ещё
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
