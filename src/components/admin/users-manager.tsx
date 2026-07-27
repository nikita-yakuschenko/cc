"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { updateUserAction } from "@/server/actions/links";
import { GUEST_USER_EMAIL } from "@/lib/constants";
import type { AppRole } from "@/server/auth/types";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  isActive: boolean;
  bitrixId: string | null;
};

const roleLabels: Record<AppRole, string> = {
  USER: "Пользователь",
  MANAGER: "Менеджер",
  ADMIN: "Администратор",
  SUPER_ADMIN: "Супер-админ",
};

export function UsersManager({ users }: { users: UserRow[] }) {
  const visible = users.filter((u) => u.email !== GUEST_USER_EMAIL);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function onSave(
    user: UserRow,
    role: UserRow["role"],
    isActive: boolean,
  ) {
    setPendingId(user.id);
    const result = await updateUserAction({ id: user.id, role, isActive });
    setPendingId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Сохранено");
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Пользователи</h2>
        <p className="mt-1 text-sm text-slate-500">
          Вход только через Bitrix24. Здесь супер-админ назначает роли и
          отключает доступ.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Имя</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Bitrix ID</th>
              <th className="px-4 py-3 text-left">Роль</th>
              <th className="px-4 py-3 text-left">Статус</th>
              <th className="px-4 py-3 text-left" />
            </tr>
          </thead>
          <tbody>
            {visible.map((u) => (
              <UserRowEditor
                key={u.id}
                user={u}
                busy={pendingId === u.id}
                onSave={onSave}
              />
            ))}
            {visible.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  Пока никто не входил через Bitrix24
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserRowEditor({
  user,
  busy,
  onSave,
}: {
  user: UserRow;
  busy: boolean;
  onSave: (
    user: UserRow,
    role: UserRow["role"],
    isActive: boolean,
  ) => Promise<void>;
}) {
  const [role, setRole] = useState(user.role);
  const [isActive, setIsActive] = useState(user.isActive);
  const dirty = role !== user.role || isActive !== user.isActive;

  return (
    <tr className="border-b border-slate-50">
      <td className="px-4 py-3">{user.name}</td>
      <td className="px-4 py-3">{user.email}</td>
      <td className="px-4 py-3 text-slate-500">{user.bitrixId || "—"}</td>
      <td className="px-4 py-3">
        <Select
          value={role}
          onChange={(e) => setRole(e.target.value as AppRole)}
          disabled={busy}
        >
          {(Object.keys(roleLabels) as AppRole[]).map((value) => (
            <option key={value} value={value}>
              {roleLabels[value]}
            </option>
          ))}
        </Select>
      </td>
      <td className="px-4 py-3">
        <Select
          value={isActive ? "1" : "0"}
          onChange={(e) => setIsActive(e.target.value === "1")}
          disabled={busy}
        >
          <option value="1">Активен</option>
          <option value="0">Отключён</option>
        </Select>
      </td>
      <td className="px-4 py-3">
        <Button
          type="button"
          size="sm"
          disabled={!dirty || busy}
          onClick={() => onSave(user, role, isActive)}
        >
          Сохранить
        </Button>
      </td>
    </tr>
  );
}
