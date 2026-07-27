import Link from "next/link";
import { requireSession, canManageAllLinks } from "@/server/auth/guards";
import { listShortLinks } from "@/server/links/service";
import { prisma } from "@/server/db";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { getPublicAppUrl } from "@/lib/env-public";
import { LinkRowActions } from "@/components/admin/link-row-actions";

export default async function LinksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const onlyOwn = !canManageAllLinks(session.user.role);

  const result = await listShortLinks({
    q: params.q,
    categoryId: params.categoryId,
    authorId: params.authorId,
    campaign: params.campaign,
    source: params.source,
    status: (params.status as "active" | "inactive" | "expired" | "all") || "all",
    page: Number(params.page || 1),
    sortBy: (params.sortBy as "createdAt" | "clickCountCache" | "name") || "createdAt",
    sortDir: (params.sortDir as "asc" | "desc") || "desc",
    onlyOwn,
    userId: session.user.id,
  });

  const [categories, authors, sources] = await Promise.all([
    prisma.linkCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    canManageAllLinks(session.user.role)
      ? prisma.user.findMany({
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    prisma.utmSource.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const base = getPublicAppUrl();
  const canDelete =
    session.user.role === "ADMIN" || session.user.role === "MANAGER";

  function statusOf(link: (typeof result.items)[number]) {
    if (!link.isActive) return { label: "Отключена", className: "bg-slate-200" };
    if (link.expiresAt && link.expiresAt.getTime() <= Date.now()) {
      return { label: "Истекла", className: "bg-amber-100 text-amber-800" };
    }
    return { label: "Активна", className: "bg-flow-green/15 text-flow-green" };
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Все ссылки</h2>
          <p className="mt-1 text-sm text-slate-500">
            Найдено: {result.total}
          </p>
        </div>
        <Link href="/admin">
          <Button>Создать</Button>
        </Link>
      </div>

      <form className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3 lg:grid-cols-6">
        <Input name="q" placeholder="Поиск…" defaultValue={params.q || ""} className="lg:col-span-2" />
        <Select name="categoryId" defaultValue={params.categoryId || ""}>
          <option value="">Все категории</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        {canManageAllLinks(session.user.role) ? (
          <Select name="authorId" defaultValue={params.authorId || ""}>
            <option value="">Все авторы</option>
            {authors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        ) : null}
        <Select name="source" defaultValue={params.source || ""}>
          <option value="">Все источники</option>
          {sources.map((s) => (
            <option key={s.id} value={s.value}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select name="status" defaultValue={params.status || "all"}>
          <option value="all">Все статусы</option>
          <option value="active">Активные</option>
          <option value="inactive">Отключённые</option>
          <option value="expired">Истекшие</option>
        </Select>
        <Input
          name="campaign"
          placeholder="Кампания"
          defaultValue={params.campaign || ""}
        />
        <Select name="sortBy" defaultValue={params.sortBy || "createdAt"}>
          <option value="createdAt">По дате</option>
          <option value="clickCountCache">По переходам</option>
          <option value="name">По названию</option>
        </Select>
        <Button type="submit">Применить</Button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-240 text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Ссылка</th>
              <th className="px-4 py-3">Название</th>
              <th className="px-4 py-3">Категория</th>
              <th className="px-4 py-3">Домен</th>
              <th className="px-4 py-3">Кампания</th>
              <th className="px-4 py-3 text-right">Переходы</th>
              <th className="px-4 py-3">Автор</th>
              <th className="px-4 py-3 whitespace-nowrap">Создана</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3 text-right whitespace-nowrap">Действия</th>
            </tr>
          </thead>
          <tbody>
            {result.items.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-slate-500">
                  Ссылки не найдены
                </td>
              </tr>
            ) : (
              result.items.map((link) => {
                const status = statusOf(link);
                let domain = "";
                try {
                  domain = new URL(link.originalUrl).hostname;
                } catch {
                  domain = "—";
                }
                return (
                  <tr key={link.id} className="border-b border-slate-50 hover:bg-slate-50/80">
                    <td className="max-w-70 px-4 py-3">
                      <Link
                        href={`/admin/links/${link.id}`}
                        className="block truncate font-mono text-xs text-flow-green hover:underline"
                        title={`${base}/${link.publicPath}`}
                      >
                        {base}/{link.publicPath}
                      </Link>
                    </td>
                    <td className="max-w-40 truncate px-4 py-3">
                      {link.name || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {link.category?.name || "—"}
                    </td>
                    <td className="max-w-45 truncate px-4 py-3" title={domain}>
                      {domain}
                    </td>
                    <td className="max-w-35 truncate px-4 py-3">
                      {link.utmCampaign || "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {link.clickCountCache}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {link.createdBy.name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {link.createdAt.toLocaleDateString("ru-RU")}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge className={status.className}>{status.label}</Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <LinkRowActions id={link.id} canDelete={canDelete} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {result.pageCount > 1 ? (
        <div className="flex items-center gap-2">
          {Array.from({ length: result.pageCount }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/links?${new URLSearchParams({
                ...Object.fromEntries(
                  Object.entries(params).filter(([, v]) => v),
                ) as Record<string, string>,
                page: String(p),
              }).toString()}`}
              className={`rounded-md px-3 py-1 text-sm ${
                p === result.page
                  ? "bg-deep-current text-white"
                  : "border border-border bg-white"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
