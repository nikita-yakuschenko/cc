"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  deleteAction,
  canManage = true,
  hideHeader = false,
}: {
  title: string;
  description: string;
  items: Item[];
  mode: "category" | "source" | "medium" | "campaign";
  action: (data: unknown) => Promise<{ ok: boolean; error?: string }>;
  deleteAction?: (id: string) => Promise<{ ok: boolean; error?: string }>;
  canManage?: boolean;
  hideHeader?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slugOrValue, setSlugOrValue] = useState("");
  const [descriptionText, setDescriptionText] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const deleteItem = useMemo(
    () => items.find((item) => item.id === deleteId) ?? null,
    [deleteId, items],
  );

  const keyLabel =
    mode === "category" || mode === "campaign" ? "Slug" : "Значение";

  function resetForm() {
    setName("");
    setSlugOrValue("");
    setDescriptionText("");
    setIsActive(true);
    setSortOrder(0);
    setEditingId(null);
  }

  function startEdit(item: Item) {
    setEditingId(item.id);
    setName(item.name);
    setSlugOrValue(item.slug || item.value || "");
    setDescriptionText(item.description ?? "");
    setIsActive(item.isActive);
    setSortOrder(item.sortOrder);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload =
      mode === "category"
        ? {
            id: editingId ?? undefined,
            name,
            slug: slugOrValue,
            description: descriptionText,
            isActive,
            sortOrder,
          }
        : mode === "campaign"
          ? {
              id: editingId ?? undefined,
              name,
              slug: slugOrValue,
              description: descriptionText,
            }
          : {
              id: editingId ?? undefined,
              name,
              value: slugOrValue,
              isActive,
              sortOrder,
            };

    const result = await action(payload);
    setSaving(false);

    if (!result.ok) {
      toast.error(result.error || "Ошибка");
      return;
    }

    toast.success(editingId ? "Изменения сохранены" : "Добавлено");
    resetForm();
    router.refresh();
  }

  async function onDeleteConfirm(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (!deleteId || !deleteAction) return;

    setDeleting(true);
    const result = await deleteAction(deleteId);
    setDeleting(false);

    if (!result.ok) {
      toast.error(result.error || "Ошибка удаления");
      return;
    }

    toast.success("Удалено");
    if (editingId === deleteId) {
      resetForm();
    }
    setDeleteId(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {hideHeader ? null : (
        <div>
          <h2 className="text-2xl font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      )}

      {canManage ? (
        <form
          onSubmit={onSubmit}
          className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4"
        >
          <div className="space-y-1">
            <Label>Название</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label>{keyLabel}</Label>
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
          {mode !== "campaign" ? (
            <>
              <div className="space-y-1">
                <Label>Порядок</Label>
                <Input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
                />
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  Активен
                </label>
              </div>
            </>
          ) : null}
          <div className="flex items-end gap-2 md:col-span-4">
            <Button type="submit" disabled={saving}>
              {saving
                ? "Сохранение…"
                : editingId
                  ? "Сохранить"
                  : "Добавить"}
            </Button>
            {editingId ? (
              <Button
                type="button"
                variant="secondary"
                disabled={saving}
                onClick={resetForm}
              >
                Отмена
              </Button>
            ) : null}
          </div>
        </form>
      ) : (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          Редактирование доступно только администраторам.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Название</th>
              <th className="px-4 py-3 text-left">Ключ</th>
              {mode === "campaign" ? (
                <th className="px-4 py-3 text-left">Описание</th>
              ) : (
                <>
                  <th className="px-4 py-3 text-left">Статус</th>
                  <th className="px-4 py-3 text-left">Порядок</th>
                </>
              )}
              {canManage ? (
                <th className="px-4 py-3 text-right">Действия</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={canManage ? (mode === "campaign" ? 4 : 5) : 4}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  Пока ничего нет
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b border-slate-50">
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {item.slug || item.value}
                  </td>
                  {mode === "campaign" ? (
                    <td className="px-4 py-3 text-slate-500">
                      {item.description || "—"}
                    </td>
                  ) : (
                    <>
                      <td className="px-4 py-3">
                        {item.isActive ? "Активен" : "Отключён"}
                      </td>
                      <td className="px-4 py-3">{item.sortOrder}</td>
                    </>
                  )}
                  {canManage ? (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Редактировать"
                          title="Редактировать"
                          onClick={() => startEdit(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {deleteAction ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Удалить"
                            title="Удалить"
                            onClick={() => setDeleteId(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AlertDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить запись?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteItem
                ? `«${deleteItem.name}» будет удалена из справочника. Уже созданные ссылки не изменятся.`
                : "Запись будет удалена из справочника."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Отмена</AlertDialogCancel>
            <AlertDialogAction disabled={deleting} onClick={onDeleteConfirm}>
              {deleting ? "Удаление…" : "Удалить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
