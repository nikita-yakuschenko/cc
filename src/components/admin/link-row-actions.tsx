"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart3, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteLinkDialog } from "@/components/admin/delete-link-dialog";

export function LinkRowActions({
  id,
  canDelete,
}: {
  id: string;
  canDelete: boolean;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        <Link
          href={`/links/${id}#stats`}
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
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            Удалить
          </Button>
        ) : null}
      </div>

      {canDelete ? (
        <DeleteLinkDialog
          linkId={id}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
        />
      ) : null}
    </>
  );
}
