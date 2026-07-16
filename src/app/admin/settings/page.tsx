import { requireSession } from "@/server/auth/guards";
import { getPublicAppUrl } from "@/lib/env-public";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SettingsPage() {
  const session = await requireSession();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Настройки</h2>
        <p className="mt-1 text-sm text-slate-500">
          Системные параметры приложения
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Окружение</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-slate-500">Публичный URL:</span>{" "}
            {getPublicAppUrl()}
          </p>
          <p>
            <span className="text-slate-500">Текущий пользователь:</span>{" "}
            {session.user.email} ({session.user.role})
          </p>
          <p className="text-slate-500">
            Секреты и строка подключения к БД задаются через переменные
            окружения Dokploy / `.env`. Seed справочников:{" "}
            <code className="rounded bg-slate-100 px-1">npm run db:seed</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
