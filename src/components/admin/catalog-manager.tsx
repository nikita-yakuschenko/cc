"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Item = {
  id: string;
  name: string;
  slug?: string;
  value?: string;
  description?: string | null;
  isActive: boolean;
  sortOrder: number;
};

export function CatalogManager({
  title,
  description,
  items,
  mode,
  action,
}: {
  title: string;
  description: string;
  items: Item[];
  mode: "category" | "source" | "medium" | "campaign";
  action: (data: unknown) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [name, setName] = useState("");
  const [slugOrValue, setSlugOrValue] = useState("");
  const [descriptionText, setDescriptionText] = useState("");

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const payload =
      mode === "category"
        ? { name, slug: slugOrValue, description: descriptionText }
        : mode === "campaign"
          ? { name, slug: slugOrValue, description: descriptionText }
          : { name, value: slugOrValue };

    const result = await action(payload);
    if (!result.ok) {
      toast.error(result.error || "Ошибка");
      return;
    }
    toast.success("Сохранено");
    setName("");
    setSlugOrValue("");
    setDescriptionText("");
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      <form
        onSubmit={onCreate}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4"
      >
        <div className="space-y-1">
          <Label>Название</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label>
            {mode === "category" || mode === "campaign" ? "Slug" : "Значение"}
          </Label>
          <Input
            value={slugOrValue}
            onChange={(e) => setSlugOrValue(e.target.value)}
            required
          />
        </div>
        {(mode === "category" || mode === "campaign") && (
          <div className="space-y-1">
            <Label>Описание</Label>
            <Input
              value={descriptionText}
              onChange={(e) => setDescriptionText(e.target.value)}
            />
          </div>
        )}
        <div className="flex items-end">
          <Button type="submit">Добавить</Button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Название</th>
              <th className="px-4 py-3 text-left">Ключ</th>
              <th className="px-4 py-3 text-left">Статус</th>
              <th className="px-4 py-3 text-left">Порядок</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-slate-50">
                <td className="px-4 py-3">{item.name}</td>
                <td className="px-4 py-3 font-mono text-xs">
                  {item.slug || item.value}
                </td>
                <td className="px-4 py-3">
                  {item.isActive ? "Активен" : "Отключён"}
                </td>
                <td className="px-4 py-3">{item.sortOrder}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
