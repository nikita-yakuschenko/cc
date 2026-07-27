"use client";

import { useMemo, useState, type ComponentProps, type ReactNode } from "react";
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
import { analyzeUrl, applyUtmToUrl } from "@/lib/url";
import { normalizeUtmValue } from "@/lib/code";
import { getPublicAppUrl } from "@/lib/env-public";
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Link2,
  Sparkles,
  Tags,
  X,
} from "lucide-react";
import { createLinkAction } from "@/server/actions/links";
import { cn } from "@/lib/utils";

type CatalogItem = { id: string; name: string; value?: string; slug?: string };

function ClearableSelect({
  value,
  onChange,
  placeholder,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-2">
      <Select
        className="min-w-0 flex-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {children}
      </Select>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Очистить"
        title="Очистить"
        disabled={!value}
        onClick={() => onChange("")}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ClearableInput({
  value,
  onChange,
  ...props
}: Omit<ComponentProps<typeof Input>, "onChange" | "value"> & {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex gap-2">
      <Input
        className="min-w-0 flex-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Очистить"
        title="Очистить"
        disabled={!value}
        onClick={() => onChange("")}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

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
      </div>

      <ol className="grid gap-3 sm:grid-cols-4">
        {[
          { n: 1 as const, label: "Ссылка", hint: "Исходный URL", Icon: Link2 },
          { n: 2 as const, label: "UTM", hint: "Метки и сценарий", Icon: Tags },
          {
            n: 3 as const,
            label: "Короткий адрес",
            hint: "Категория и код",
            Icon: Sparkles,
          },
          {
            n: 4 as const,
            label: "Готово",
            hint: "Ссылка создана",
            Icon: CheckCircle2,
          },
        ].map((s) => {
          const done = step > s.n;
          const active = step === s.n;
          const Icon = s.Icon;
          return (
            <li key={s.n} className="relative">
              <div
                className={cn(
                  "relative flex items-start gap-3 rounded-2xl border px-4 py-4 transition-colors",
                  active &&
                    "border-flow-green bg-flow-green/10 shadow-[0_8px_24px_rgba(39,97,82,0.12)]",
                  done && !active && "border-flow-green/40 bg-white",
                  !active && !done && "border-border bg-white",
                )}
              >
                <span
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold",
                    active && "bg-deep-current text-white",
                    done && !active && "bg-flow-green text-white",
                    !active && !done && "bg-canvas text-muted",
                  )}
                >
                  {done && !active ? (
                    <Check className="h-5 w-5" strokeWidth={2.5} />
                  ) : (
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  )}
                </span>
                <div className="min-w-0 pt-0.5">
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      active || done ? "text-carbon" : "text-muted",
                    )}
                  >
                    {s.n}. {s.label}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">{s.hint}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

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
                  <ClearableSelect
                    value={utmSource}
                    onChange={setUtmSource}
                    placeholder="Выберите источник"
                  >
                    {sources.map((s) => (
                      <option key={s.id} value={s.value}>
                        {s.name} ({s.value})
                      </option>
                    ))}
                  </ClearableSelect>
                </div>
                <div className="space-y-2">
                  <Label>Канал (utm_medium) *</Label>
                  <ClearableSelect
                    value={utmMedium}
                    onChange={setUtmMedium}
                    placeholder="Выберите канал"
                  >
                    {media.map((s) => (
                      <option key={s.id} value={s.value}>
                        {s.name} ({s.value})
                      </option>
                    ))}
                  </ClearableSelect>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Кампания (utm_campaign)</Label>
                  <ClearableInput
                    value={utmCampaign}
                    onChange={setUtmCampaign}
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
                  <ClearableInput
                    value={utmContent}
                    onChange={setUtmContent}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ключевое слово (utm_term)</Label>
                  <ClearableInput value={utmTerm} onChange={setUtmTerm} />
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
                  if (showUtmFields && (!utmSource || !utmMedium)) {
                    toast.error("Заполните источник и канал UTM");
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
              <a href={`/links/${created.id}`}>
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
