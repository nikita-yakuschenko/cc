"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteLinkAction } from "@/server/actions/links";

export function LinkRowActions({
  id,
  canDelete,
}: {
  id: string;
  canDelete: boolean;
}) {
  const router = useRouter();

  async function onDelete() {
    if (!confirm("Удалить ссылку? Короткий адрес перестанет работать.")) {
      return;
    }

    const result = await deleteLinkAction(id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Ссылка удалена");
    router.refresh();
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        href={`/admin/links/${id}#stats`}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-flow-green transition-colors hover:bg-slate-100"
      >
        <BarChart3 className="h-4 w-4 shrink-0" />
        Статистика
      </Link>
      {canDelete ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-red-700 hover:bg-red-50 hover:text-red-800"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4 shrink-0" />
          Удалить
        </Button>
      ) : null}
    </div>
  );
}
