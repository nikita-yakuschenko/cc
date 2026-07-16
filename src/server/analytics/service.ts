import { prisma } from "@/server/db";

export async function getLinkStats(
  linkId: string,
  options: { excludeBots?: boolean; days?: number } = {},
) {
  const excludeBots = options.excludeBots ?? true;
  const days = options.days ?? 30;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const whereBase = {
    shortLinkId: linkId,
    occurredAt: { gte: since },
    ...(excludeBots ? { isBot: false } : {}),
  };

  const [total, lastClick, byReferer, byDevice, byBrowser, events] =
    await Promise.all([
      prisma.clickEvent.count({ where: whereBase }),
      prisma.clickEvent.findFirst({
        where: whereBase,
        orderBy: { occurredAt: "desc" },
        select: { occurredAt: true },
      }),
      prisma.clickEvent.groupBy({
        by: ["referer"],
        where: whereBase,
        _count: { _all: true },
        orderBy: { _count: { referer: "desc" } },
        take: 10,
      }),
      prisma.clickEvent.groupBy({
        by: ["deviceType"],
        where: whereBase,
        _count: { _all: true },
        orderBy: { _count: { deviceType: "desc" } },
      }),
      prisma.clickEvent.groupBy({
        by: ["browser"],
        where: whereBase,
        _count: { _all: true },
        orderBy: { _count: { browser: "desc" } },
        take: 10,
      }),
      prisma.clickEvent.findMany({
        where: whereBase,
        select: { occurredAt: true },
      }),
    ]);

  const dayMap = new Map<string, number>();
  for (const e of events) {
    const key = e.occurredAt.toISOString().slice(0, 10);
    dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
  }
  const byDay = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, count]) => ({ day, count }));

  return {
    total,
    lastClickAt: lastClick?.occurredAt ?? null,
    byDay,
    byReferer: byReferer.map((r) => ({
      referer: r.referer || "(прямой)",
      count: r._count._all,
    })),
    byDevice: byDevice.map((r) => ({
      deviceType: r.deviceType || "unknown",
      count: r._count._all,
    })),
    byBrowser: byBrowser.map((r) => ({
      browser: r.browser || "unknown",
      count: r._count._all,
    })),
  };
}

export async function getOverviewStats(options: {
  excludeBots?: boolean;
  days?: number;
  userId?: string;
  onlyOwn?: boolean;
}) {
  const excludeBots = options.excludeBots ?? true;
  const days = options.days ?? 30;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const linkWhere = {
    deletedAt: null,
    ...(options.onlyOwn && options.userId
      ? { createdById: options.userId }
      : {}),
  };

  const links = await prisma.shortLink.findMany({
    where: linkWhere,
    select: { id: true, clickCountCache: true },
  });
  const linkIds = links.map((l) => l.id);

  const clickWhere = {
    shortLinkId: { in: linkIds },
    occurredAt: { gte: since },
    ...(excludeBots ? { isBot: false } : {}),
  };

  const [clicks, activeLinks, totalLinks] = await Promise.all([
    linkIds.length
      ? prisma.clickEvent.count({ where: clickWhere })
      : Promise.resolve(0),
    prisma.shortLink.count({
      where: { ...linkWhere, isActive: true },
    }),
    prisma.shortLink.count({ where: linkWhere }),
  ]);

  const recentEvents = linkIds.length
    ? await prisma.clickEvent.findMany({
        where: clickWhere,
        select: { occurredAt: true },
      })
    : [];

  const dayMap = new Map<string, number>();
  for (const e of recentEvents) {
    const key = e.occurredAt.toISOString().slice(0, 10);
    dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
  }

  return {
    totalLinks,
    activeLinks,
    clicks,
    cachedClicks: links.reduce((sum, l) => sum + l.clickCountCache, 0),
    byDay: Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, count]) => ({ day, count })),
  };
}
