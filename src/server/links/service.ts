import { createHash } from "crypto";
import type { ShortLink } from "@prisma/client";
import { prisma } from "@/server/db";
import { getEnv, getPublicAppUrl } from "@/lib/env";
import {
  ANONYMOUS_LINK_LIMIT_PER_IP,
  GUEST_USER_EMAIL,
} from "@/lib/constants";
import type { AppRole } from "@/server/auth/types";
import { canDeleteLinks, isOnlyOwnLinksRole } from "@/server/auth/guards";
import {
  buildPublicPath,
  buildShortUrl,
  defaultCodeLength,
  generateShortCode,
  isReservedPath,
  isValidCustomAlias,
  normalizeCode,
  normalizeUtmValue,
} from "@/server/links/code";
import {
  analyzeUrl,
  applyUtmToUrl,
  isSafeRedirectTarget,
} from "@/server/links/url";
import { writeAuditLog } from "@/server/audit/log";
import { fetchPageHeading } from "@/server/links/page-title";

export type CreateLinkInput = {
  name?: string;
  originalUrl: string;
  categoryId?: string | null;
  customAlias?: string | null;
  utmMode: "none" | "keep" | "replace" | "remove";
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  expiresAt?: Date | null;
};

export type LinkWithRelations = ShortLink & {
  category: { id: string; name: string; slug: string } | null;
  createdBy: { id: string; name: string; email: string };
};

function normalizeOptionalUtm(value?: string | null) {
  if (!value) return null;
  const normalized = normalizeUtmValue(value);
  return normalized || null;
}

async function ensureUniqueCode(params: {
  code: string;
  categorySlug?: string | null;
}): Promise<{ code: string; publicPath: string; codeNormalized: string }> {
  const codeNormalized = normalizeCode(params.code);
  const publicPath = buildPublicPath(
    params.code,
    params.categorySlug,
  ).toLowerCase();

  if (!params.categorySlug && isReservedPath(codeNormalized)) {
    throw new Error("Код совпадает с зарезервированным системным путём");
  }

  const clash = await prisma.shortLink.findUnique({
    where: { publicPath },
  });

  if (clash && !clash.deletedAt) {
    throw new Error("Такой короткий адрес уже занят");
  }

  return { code: params.code, publicPath, codeNormalized };
}

export async function createShortLink(
  input: CreateLinkInput,
  userId: string,
): Promise<LinkWithRelations> {
  const analysis = analyzeUrl(input.originalUrl);
  if (!analysis.ok) {
    throw new Error(analysis.error);
  }

  let categorySlug: string | null = null;
  let categoryId: string | null = null;

  if (input.categoryId) {
    const category = await prisma.linkCategory.findFirst({
      where: { id: input.categoryId, isActive: true },
    });
    if (!category) {
      throw new Error("Категория не найдена или отключена");
    }
    if (isReservedPath(category.slug)) {
      throw new Error("Категория использует зарезервированный slug");
    }
    categorySlug = category.slug;
    categoryId = category.id;
  }

  const utmSource = normalizeOptionalUtm(input.utmSource);
  const utmMedium = normalizeOptionalUtm(input.utmMedium);
  const utmCampaign = normalizeOptionalUtm(input.utmCampaign);
  const utmContent = normalizeOptionalUtm(input.utmContent);
  const utmTerm = normalizeOptionalUtm(input.utmTerm);

  if (input.utmMode === "replace") {
    if (!utmSource || !utmMedium || !utmCampaign) {
      throw new Error(
        "Для UTM-разметки обязательны source, medium и campaign",
      );
    }
  }

  let targetUrl: string;
  if (input.utmMode === "none") {
    targetUrl = analysis.href;
  } else {
    targetUrl = applyUtmToUrl(
      analysis.href,
      {
        source: utmSource,
        medium: utmMedium,
        campaign: utmCampaign,
        content: utmContent,
        term: utmTerm,
      },
      input.utmMode === "keep"
        ? "keep"
        : input.utmMode === "remove"
          ? "remove"
          : "replace",
    );
  }

  if (!isSafeRedirectTarget(targetUrl)) {
    throw new Error("Итоговый URL назначения небезопасен");
  }

  const hasCategory = Boolean(categoryId);
  let code = input.customAlias?.trim() || "";

  if (code) {
    if (!isValidCustomAlias(code)) {
      throw new Error(
        "Алиас: только латиница, цифры и дефис, длина 3–64, без системных путей",
      );
    }
  } else {
    // generate with collision retries
    for (let attempt = 0; attempt < 8; attempt++) {
      const candidate = generateShortCode(defaultCodeLength(hasCategory));
      const publicPath = buildPublicPath(candidate, categorySlug).toLowerCase();
      const exists = await prisma.shortLink.findUnique({
        where: { publicPath },
      });
      if (!exists || exists.deletedAt) {
        code = candidate;
        break;
      }
    }
    if (!code) {
      throw new Error("Не удалось сгенерировать уникальный код");
    }
  }

  const unique = await ensureUniqueCode({ code, categorySlug });

  let linkName = input.name?.trim() || null;
  if (!linkName) {
    linkName = await fetchPageHeading(targetUrl);
  }

  const link = await prisma.$transaction(async (tx) => {
    const created = await tx.shortLink.create({
      data: {
        name: linkName,
        code: unique.code,
        codeNormalized: unique.codeNormalized,
        publicPath: unique.publicPath,
        categoryId,
        originalUrl: analysis.href,
        targetUrl,
        utmSource: input.utmMode === "none" || input.utmMode === "remove" ? null : utmSource ?? (input.utmMode === "keep" ? analysis.utm.source ?? null : null),
        utmMedium: input.utmMode === "none" || input.utmMode === "remove" ? null : utmMedium ?? (input.utmMode === "keep" ? analysis.utm.medium ?? null : null),
        utmCampaign: input.utmMode === "none" || input.utmMode === "remove" ? null : utmCampaign ?? (input.utmMode === "keep" ? analysis.utm.campaign ?? null : null),
        utmContent: input.utmMode === "none" || input.utmMode === "remove" ? null : utmContent ?? (input.utmMode === "keep" ? analysis.utm.content ?? null : null),
        utmTerm: input.utmMode === "none" || input.utmMode === "remove" ? null : utmTerm ?? (input.utmMode === "keep" ? analysis.utm.term ?? null : null),
        createdById: userId,
        expiresAt: input.expiresAt ?? null,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    await writeAuditLog(
      {
        actorId: userId,
        action: "link.create",
        entityType: "ShortLink",
        entityId: created.id,
        metadata: { publicPath: created.publicPath },
      },
      tx,
    );

    return created;
  });

  return link;
}

export async function getGuestUserId(): Promise<string> {
  const guest = await prisma.user.findUnique({
    where: { email: GUEST_USER_EMAIL },
  });
  if (!guest) {
    throw new Error(
      "Гостевой пользователь не найден. Выполните npm run db:seed",
    );
  }
  return guest.id;
}

export async function countAnonymousLinksByIp(ipHash: string): Promise<number> {
  return prisma.shortLink.count({
    where: {
      createdFromIpHash: ipHash,
      isAnonymous: true,
      deletedAt: null,
    },
  });
}

export async function createAnonymousShortLink(
  originalUrl: string,
  ipHash: string,
): Promise<LinkWithRelations> {
  const used = await countAnonymousLinksByIp(ipHash);
  if (used >= ANONYMOUS_LINK_LIMIT_PER_IP) {
    throw new Error(
      `Лимит: не больше ${ANONYMOUS_LINK_LIMIT_PER_IP} сокращений без регистрации с одного адреса. Войдите в аккаунт для UTM, статистики и безлимитного сокращения.`,
    );
  }

  const guestId = await getGuestUserId();
  const analysis = analyzeUrl(originalUrl);
  if (!analysis.ok) {
    throw new Error(analysis.error);
  }
  if (!isSafeRedirectTarget(analysis.href)) {
    throw new Error("Небезопасный URL");
  }

  let code = "";
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = generateShortCode(defaultCodeLength(false));
    const publicPath = buildPublicPath(candidate).toLowerCase();
    const exists = await prisma.shortLink.findUnique({ where: { publicPath } });
    if (!exists || exists.deletedAt) {
      code = candidate;
      break;
    }
  }
  if (!code) {
    throw new Error("Не удалось сгенерировать уникальный код");
  }

  const unique = await ensureUniqueCode({ code, categorySlug: null });
  const linkName = await fetchPageHeading(analysis.href);

  return prisma.$transaction(async (tx) => {
    const created = await tx.shortLink.create({
      data: {
        name: linkName,
        code: unique.code,
        codeNormalized: unique.codeNormalized,
        publicPath: unique.publicPath,
        originalUrl: analysis.href,
        targetUrl: analysis.href,
        createdById: guestId,
        createdFromIpHash: ipHash,
        isAnonymous: true,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    await writeAuditLog(
      {
        actorId: null,
        action: "link.create_anonymous",
        entityType: "ShortLink",
        entityId: created.id,
        metadata: { publicPath: created.publicPath },
      },
      tx,
    );

    return created;
  });
}

export function getShortLinkUrl(link: {
  code: string;
  category?: { slug: string } | null;
}): string {
  return buildShortUrl(
    getPublicAppUrl(),
    link.code,
    link.category?.slug ?? null,
  );
}

export async function updateShortLink(
  id: string,
  data: {
    name?: string | null;
    targetUrl?: string;
    isActive?: boolean;
    expiresAt?: Date | null;
    utmSource?: string | null;
    utmMedium?: string | null;
    utmCampaign?: string | null;
    utmContent?: string | null;
    utmTerm?: string | null;
  },
  actor: { id: string; role: AppRole },
) {
  const existing = await prisma.shortLink.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) {
    throw new Error("Ссылка не найдена");
  }

  if (isOnlyOwnLinksRole(actor.role) && existing.createdById !== actor.id) {
    throw new Error("Недостаточно прав");
  }

  if (data.targetUrl !== undefined) {
    if (!isSafeRedirectTarget(data.targetUrl)) {
      throw new Error("Небезопасный URL назначения");
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const link = await tx.shortLink.update({
      where: { id },
      data: {
        name: data.name === undefined ? undefined : data.name,
        targetUrl: data.targetUrl,
        isActive: data.isActive,
        expiresAt: data.expiresAt === undefined ? undefined : data.expiresAt,
        utmSource:
          data.utmSource === undefined
            ? undefined
            : normalizeOptionalUtm(data.utmSource),
        utmMedium:
          data.utmMedium === undefined
            ? undefined
            : normalizeOptionalUtm(data.utmMedium),
        utmCampaign:
          data.utmCampaign === undefined
            ? undefined
            : normalizeOptionalUtm(data.utmCampaign),
        utmContent:
          data.utmContent === undefined
            ? undefined
            : normalizeOptionalUtm(data.utmContent),
        utmTerm:
          data.utmTerm === undefined
            ? undefined
            : normalizeOptionalUtm(data.utmTerm),
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    await writeAuditLog(
      {
        actorId: actor.id,
        action: "link.update",
        entityType: "ShortLink",
        entityId: id,
        metadata: data,
      },
      tx,
    );

    return link;
  });

  return updated;
}

export async function softDeleteShortLink(
  id: string,
  actor: { id: string; role: AppRole },
) {
  const existing = await prisma.shortLink.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) {
    throw new Error("Ссылка не найдена");
  }
  if (!canDeleteLinks(actor.role)) {
    throw new Error("Удаление доступно администратору");
  }

  await prisma.$transaction(async (tx) => {
    // освобождаем unique publicPath для повторного использования
    await tx.shortLink.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        publicPath: `deleted/${existing.id}/${existing.publicPath}`,
      },
    });
    await writeAuditLog(
      {
        actorId: actor.id,
        action: "link.delete",
        entityType: "ShortLink",
        entityId: id,
      },
      tx,
    );
  });
}

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const salt = getEnv().IP_HASH_SALT;
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

/** Подтягивает H1/title для ссылок без названия (до 15 за запрос списка). */
export async function backfillMissingLinkNames(
  links: Array<{ id: string; name: string | null; targetUrl: string }>,
): Promise<void> {
  const missing = links.filter((link) => !link.name?.trim());
  if (missing.length === 0) return;

  await Promise.all(
    missing.slice(0, 15).map(async (link) => {
      const title = await fetchPageHeading(link.targetUrl);
      if (!title) return;

      await prisma.shortLink.update({
        where: { id: link.id },
        data: { name: title },
      });

      link.name = title;
    }),
  );
}

export type ListLinksFilters = {
  q?: string;
  categoryId?: string;
  authorId?: string;
  campaign?: string;
  source?: string;
  status?: "active" | "inactive" | "expired" | "all";
  page?: number;
  pageSize?: number;
  sortBy?: "createdAt" | "clickCountCache" | "name";
  sortDir?: "asc" | "desc";
  onlyOwn?: boolean;
  userId?: string;
};

export async function listShortLinks(filters: ListLinksFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
  const now = new Date();

  const where: Record<string, unknown> = {
    deletedAt: null,
  };

  if (filters.onlyOwn && filters.userId) {
    where.createdById = filters.userId;
  } else if (filters.authorId) {
    where.createdById = filters.authorId;
  }

  if (filters.categoryId) {
    where.categoryId = filters.categoryId;
  }
  if (filters.campaign) {
    where.utmCampaign = filters.campaign;
  }
  if (filters.source) {
    where.utmSource = filters.source;
  }

  if (filters.status === "active") {
    where.isActive = true;
    where.OR = [{ expiresAt: null }, { expiresAt: { gt: now } }];
  } else if (filters.status === "inactive") {
    where.isActive = false;
  } else if (filters.status === "expired") {
    where.expiresAt = { lte: now };
  }

  if (filters.q) {
    const q = filters.q.trim();
    where.AND = [
      {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { code: { contains: q, mode: "insensitive" } },
          { publicPath: { contains: q, mode: "insensitive" } },
          { originalUrl: { contains: q, mode: "insensitive" } },
          { targetUrl: { contains: q, mode: "insensitive" } },
          { utmCampaign: { contains: q, mode: "insensitive" } },
        ],
      },
    ];
  }

  const sortBy = filters.sortBy ?? "createdAt";
  const sortDir = filters.sortDir ?? "desc";

  const [total, items] = await Promise.all([
    prisma.shortLink.count({ where }),
    prisma.shortLink.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { [sortBy]: sortDir },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    pageCount: Math.ceil(total / pageSize),
  };
}
