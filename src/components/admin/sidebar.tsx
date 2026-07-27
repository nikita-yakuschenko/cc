"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  FolderTree,
  Link2,
  LogOut,
  Megaphone,
  Radio,
  Settings,
  Share2,
  Users,
} from "lucide-react";
import type { Role } from "@prisma/client";
import type { AppRole } from "@/server/auth/types";
import { cn } from "@/lib/utils";
import { RelayWordmark } from "@/components/brand/relay-mark";

const nav = [
  { href: "/admin", label: "Создание ссылки", icon: Link2 },
  { href: "/admin/links", label: "Все ссылки", icon: Share2 },
  { href: "/admin/campaigns", label: "Кампании", icon: Megaphone },
  {
    href: "/admin/categories",
    label: "Категории",
    icon: FolderTree,
    roles: ["ADMIN"] as AppRole[],
  },
  {
    href: "/admin/sources",
    label: "Источники",
    icon: Radio,
    roles: ["ADMIN"] as AppRole[],
  },
  {
    href: "/admin/media",
    label: "Каналы",
    icon: Radio,
    roles: ["ADMIN"] as AppRole[],
  },
  { href: "/admin/stats", label: "Статистика", icon: BarChart3 },
  {
    href: "/admin/users",
    label: "Пользователи",
    icon: Users,
    roles: ["ADMIN"] as AppRole[],
  },
  { href: "/admin/settings", label: "Настройки", icon: Settings },
];

export function AdminSidebar({
  user,
}: {
  user: { name?: string | null; email?: string | null; role: Role | AppRole };
}) {
  const pathname = usePathname();

  async function onLogout() {
    await fetch("/api/bitrix/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col bg-deep-current text-white">
      <div className="border-b border-white/10 px-5 py-5">
        <RelayWordmark variant="mono-light" showDomain markClassName="h-8 w-8" />
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {nav
          .filter((item) => !item.roles || item.roles.includes(user.role))
          .map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors duration-150",
                  active
                    ? "bg-flow-green/80 text-white"
                    : "text-mist hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4 opacity-90" strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
      </nav>
      <div className="border-t border-white/10 p-4">
        <p className="truncate text-sm font-medium text-white">{user.name}</p>
        <p className="truncate text-xs text-mist">{user.email}</p>
        <p className="mt-1 text-xs text-mist/70">{user.role}</p>
        <button
          type="button"
          onClick={onLogout}
          className="mt-3 inline-flex items-center gap-2 text-sm text-mist transition-colors hover:text-white"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
          Выйти
        </button>
      </div>
    </aside>
  );
}
