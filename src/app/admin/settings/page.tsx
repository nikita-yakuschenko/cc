import { requireRole } from "@/server/auth/guards";
import { getPublicAppUrl } from "@/lib/env-public";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SettingsPage() {
  const session = await requireRole(["SUPER_ADMIN"]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Система</h2>
        <p className="mt-1 text-sm text-slate-500">
          Справочная информация для администратора. Обычным пользователям этот
          раздел недоступен.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Развёртывание</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="text-slate-500">Публичный URL:</span>{" "}
            <span className="font-mono">{getPublicAppUrl()}</span>
          </p>
          <p className="text-slate-500">
            Секреты, Bitrix OAuth и строка подключения к PostgreSQL задаются в
            Dokploy или локально в <code className="rounded bg-slate-100 px-1">.env</code>.
            Супер-админ задаётся через{" "}
            <code className="rounded bg-slate-100 px-1">
              BITRIX_SUPER_ADMIN_EMAILS
            </code>
            .
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Справочники и обслуживание</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-500">
          <p>
            Начальное наполнение категорий и UTM-справочников после деплоя:
          </p>
          <p>
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-carbon">
              npm run db:seed
            </code>
          </p>
          <p>
            Категории, источники и каналы редактируются в соответствующих
            разделах меню. Пользователи и роли — в разделе «Пользователи».
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Текущая сессия</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-slate-500">Администратор:</span>{" "}
            {session.user.name} ({session.user.email})
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
