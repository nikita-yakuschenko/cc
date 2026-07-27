"use client";

import { useEffect } from "react";
import { Toaster, toast, useSonner } from "sonner";

const toastClassNames = {
  toast:
    "font-[family-name:var(--font-manrope)] rounded-xl border border-border bg-white text-carbon shadow-[0_8px_24px_rgba(7,30,27,0.12)]",
  title: "text-sm font-medium",
  description: "text-sm text-muted",
  success:
    "!border-l-4 !border-flow-green !bg-[#eef5f2] [&_[data-icon]]:text-flow-green",
  error:
    "!border-l-4 !border-red-600 !bg-red-50 [&_[data-icon]]:text-red-700",
  warning:
    "!border-l-4 !border-amber-500 !bg-amber-50 [&_[data-icon]]:text-amber-700",
  info: "!border-l-4 !border-slate-400 !bg-slate-50 [&_[data-icon]]:text-slate-600",
};

function ToastContextMenuDismiss() {
  const { toasts } = useSonner();

  useEffect(() => {
    function onContextMenu(event: MouseEvent) {
      const el = (event.target as HTMLElement).closest<HTMLElement>(
        "[data-sonner-toast]",
      );
      if (!el) return;

      event.preventDefault();

      const index = Number(el.dataset.index);
      if (Number.isNaN(index)) return;

      const y = el.dataset.yPosition ?? "bottom";
      const x = el.dataset.xPosition ?? "right";
      const position = `${y}-${x}`;

      const visible = toasts.filter(
        (item) => (item.position ?? "bottom-right") === position,
      );
      const target = visible[index];
      if (target) {
        toast.dismiss(target.id);
      }
    }

    document.addEventListener("contextmenu", onContextMenu);
    return () => document.removeEventListener("contextmenu", onContextMenu);
  }, [toasts]);

  return null;
}

export function AppToaster() {
  return (
    <>
      <Toaster
        position="bottom-right"
        closeButton={false}
        duration={4000}
        offset={20}
        toastOptions={{
          closeButton: false,
          classNames: toastClassNames,
        }}
      />
      <ToastContextMenuDismiss />
    </>
  );
}
