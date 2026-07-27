import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { resolveRedirect } from "@/server/redirects/service";
import { checkRateLimit } from "@/server/rate-limit";
import { isReservedPath } from "@/lib/code";
import { prisma } from "@/server/db";
import { RelayMark } from "@/components/brand/relay-mark";
import { APP_NAME } from "@/lib/constants";

type Props = {
  params: Promise<{ slug: string[] }>;
};

export default async function PublicRedirectPage({ params }: Props) {
  const { slug } = await params;

  if (!slug || slug.length === 0 || slug.length > 2) {
    return (
      <main className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold">Ссылка не найдена</h1>
      </main>
    );
  }

  if (isReservedPath(slug[0]!)) {
    redirect("/");
  }

  if (slug.length === 2) {
    const known = await prisma.linkCategory.findFirst({
      where: { slug: slug[0], isActive: true },
      select: { id: true },
    });
    if (!known) {
      return (
        <main className="mx-auto max-w-lg px-4 py-24 text-center">
          <h1 className="text-2xl font-semibold">Ссылка не найдена</h1>
          <p className="mt-2 text-slate-600">
            Короткая ссылка не существует или была удалена.
          </p>
        </main>
      );
    }
  }

  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    null;

  const limited = checkRateLimit(`redirect:${ip || "unknown"}`, 120, 60_000);
  if (!limited.ok) {
    return (
      <main className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold">Слишком много запросов</h1>
        <p className="mt-2 text-slate-600">Попробуйте позже</p>
      </main>
    );
  }

  const result = await resolveRedirect(slug, {
    referer: h.get("referer"),
    userAgent: h.get("user-agent"),
    ip,
  });

  if (result.status === "redirect") {
    redirect(result.targetUrl);
  }

  const messages = {
    not_found: {
      title: "Ссылка не найдена",
      text: "Короткая ссылка не существует или была удалена.",
    },
    disabled: {
      title: "Ссылка отключена",
      text: "Эта короткая ссылка временно недоступна.",
    },
    expired: {
      title: "Срок действия истёк",
      text: "Срок действия этой короткой ссылки закончился.",
    },
    unsafe: {
      title: "Небезопасная ссылка",
      text: "Переход заблокирован по соображениям безопасности.",
    },
  } as const;

  const msg = messages[result.status];

  return (
    <main className="relay-canvas mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 py-24 text-center">
      <RelayMark className="h-10 w-10" />
      <p className="mt-4 text-xs tracking-[0.18em] text-muted uppercase">
        {APP_NAME} · go.avgst.ru
      </p>
      <h1 className="mt-3 text-2xl font-medium text-carbon">{msg.title}</h1>
      <p className="mt-2 text-muted">{msg.text}</p>
    </main>
  );
}
