"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/server/auth";
import { canManageAllLinks } from "@/server/auth/guards";
import {
  createShortLink,
  softDeleteShortLink,
  updateShortLink,
} from "@/server/links/service";
import { checkRateLimit } from "@/server/rate-limit";
import { prisma } from "@/server/db";
import { writeAuditLog } from "@/server/audit/log";
import { normalizeUtmValue } from "@/server/links/code";
import { isReservedPath } from "@/server/links/code";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Требуется авторизация");
  }
  return session.user;
}

const createLinkSchema = z.object({
  name: z.string().optional(),
  originalUrl: z.string().url(),
  categoryId: z.string().optional().nullable(),
  customAlias: z.string().optional().nullable(),
  utmMode: z.enum(["none", "keep", "replace", "remove"]),
  utmSource: z.string().optional().nullable(),
  utmMedium: z.string().optional().nullable(),
  utmCampaign: z.string().optional().nullable(),
  utmContent: z.string().optional().nullable(),
  utmTerm: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
});

export async function createLinkAction(raw: unknown) {
  const user = await requireUser();
  const limited = checkRateLimit(`create:${user.id}`, 30, 60_000);
  if (!limited.ok) {
    return { ok: false as const, error: `Слишком много запросов. Повторите через ${limited.retryAfterSec} с.` };
  }

  const parsed = createLinkSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: "Проверьте заполнение формы" };
  }

  try {
    const link = await createShortLink(
      {
        ...parsed.data,
        expiresAt: parsed.data.expiresAt
          ? new Date(parsed.data.expiresAt)
          : null,
      },
      user.id,
    );
    revalidatePath("/admin/links");
    return { ok: true as const, link };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Ошибка создания",
    };
  }
}

const updateLinkSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional().nullable(),
  targetUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().optional().nullable(),
  utmSource: z.string().optional().nullable(),
  utmMedium: z.string().optional().nullable(),
  utmCampaign: z.string().optional().nullable(),
  utmContent: z.string().optional().nullable(),
  utmTerm: z.string().optional().nullable(),
});

export async function updateLinkAction(raw: unknown) {
  const user = await requireUser();
  const parsed = updateLinkSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: "Некорректные данные" };
  }

  try {
    const { id, expiresAt, ...rest } = parsed.data;
    const link = await updateShortLink(
      id,
      {
        ...rest,
        expiresAt:
          expiresAt === undefined
            ? undefined
            : expiresAt
              ? new Date(expiresAt)
              : null,
      },
      { id: user.id, role: user.role },
    );
    revalidatePath("/admin/links");
    revalidatePath(`/admin/links/${id}`);
    return { ok: true as const, link };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Ошибка сохранения",
    };
  }
}

export async function deleteLinkAction(id: string) {
  const user = await requireUser();
  try {
    await softDeleteShortLink(id, { id: user.id, role: user.role });
    revalidatePath("/admin/links");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Ошибка удаления",
    };
  }
}

export async function toggleLinkAction(id: string, isActive: boolean) {
  return updateLinkAction({ id, isActive });
}

const catalogItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  value: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function upsertCategoryAction(raw: unknown) {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    return { ok: false as const, error: "Недостаточно прав" };
  }
  const parsed = catalogItemSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: "Некорректные данные" };
  }
  const slug = (parsed.data.slug || "").toLowerCase();
  if (!slug || !/^[a-z0-9-]+$/.test(slug) || isReservedPath(slug)) {
    return { ok: false as const, error: "Некорректный или зарезервированный slug" };
  }

  const data = {
    name: parsed.data.name,
    slug,
    description: parsed.data.description ?? null,
    isActive: parsed.data.isActive ?? true,
    sortOrder: parsed.data.sortOrder ?? 0,
  };

  const item = parsed.data.id
    ? await prisma.linkCategory.update({ where: { id: parsed.data.id }, data })
    : await prisma.linkCategory.create({ data });

  await writeAuditLog({
    actorId: user.id,
    action: parsed.data.id ? "category.update" : "category.create",
    entityType: "LinkCategory",
    entityId: item.id,
  });
  revalidatePath("/admin/categories");
  return { ok: true as const, item };
}

export async function upsertUtmSourceAction(raw: unknown) {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    return { ok: false as const, error: "Недостаточно прав" };
  }
  const parsed = catalogItemSchema.safeParse(raw);
  if (!parsed.success || !parsed.data.value) {
    return { ok: false as const, error: "Некорректные данные" };
  }
  const value = normalizeUtmValue(parsed.data.value);
  const data = {
    name: parsed.data.name,
    value,
    isActive: parsed.data.isActive ?? true,
    sortOrder: parsed.data.sortOrder ?? 0,
  };
  const item = parsed.data.id
    ? await prisma.utmSource.update({ where: { id: parsed.data.id }, data })
    : await prisma.utmSource.create({ data });
  await writeAuditLog({
    actorId: user.id,
    action: parsed.data.id ? "utm_source.update" : "utm_source.create",
    entityType: "UtmSource",
    entityId: item.id,
  });
  revalidatePath("/admin/sources");
  return { ok: true as const, item };
}

export async function upsertUtmMediumAction(raw: unknown) {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    return { ok: false as const, error: "Недостаточно прав" };
  }
  const parsed = catalogItemSchema.safeParse(raw);
  if (!parsed.success || !parsed.data.value) {
    return { ok: false as const, error: "Некорректные данные" };
  }
  const value = normalizeUtmValue(parsed.data.value);
  const data = {
    name: parsed.data.name,
    value,
    isActive: parsed.data.isActive ?? true,
    sortOrder: parsed.data.sortOrder ?? 0,
  };
  const item = parsed.data.id
    ? await prisma.utmMedium.update({ where: { id: parsed.data.id }, data })
    : await prisma.utmMedium.create({ data });
  await writeAuditLog({
    actorId: user.id,
    action: parsed.data.id ? "utm_medium.update" : "utm_medium.create",
    entityType: "UtmMedium",
    entityId: item.id,
  });
  revalidatePath("/admin/media");
  return { ok: true as const, item };
}

const campaignSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional().nullable(),
});

export async function upsertCampaignAction(raw: unknown) {
  const user = await requireUser();
  if (!canManageAllLinks(user.role) && user.role !== "USER") {
    return { ok: false as const, error: "Недостаточно прав" };
  }
  // USER and above can create campaigns for themselves; managers/admins manage all
  const parsed = campaignSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: "Некорректные данные" };
  }
  const slug = normalizeUtmValue(parsed.data.slug);
  const data = {
    name: parsed.data.name,
    slug,
    description: parsed.data.description ?? null,
  };

  let item;
  if (parsed.data.id) {
    const existing = await prisma.campaign.findUnique({
      where: { id: parsed.data.id },
    });
    if (!existing) return { ok: false as const, error: "Кампания не найдена" };
    if (user.role === "USER" && existing.createdById !== user.id) {
      return { ok: false as const, error: "Недостаточно прав" };
    }
    item = await prisma.campaign.update({
      where: { id: parsed.data.id },
      data,
    });
  } else {
    item = await prisma.campaign.create({
      data: { ...data, createdById: user.id },
    });
  }

  await writeAuditLog({
    actorId: user.id,
    action: parsed.data.id ? "campaign.update" : "campaign.create",
    entityType: "Campaign",
    entityId: item.id,
  });
  revalidatePath("/admin/campaigns");
  return { ok: true as const, item };
}

const userUpdateSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["USER", "MANAGER", "ADMIN"]),
  isActive: z.boolean(),
});

/** Пользователи создаются только через вход Bitrix — здесь только роль и статус */
export async function updateUserAction(raw: unknown) {
  const actor = await requireUser();
  if (actor.role !== "ADMIN") {
    return { ok: false as const, error: "Недостаточно прав" };
  }
  const parsed = userUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: "Некорректные данные" };
  }

  if (parsed.data.id === actor.id && !parsed.data.isActive) {
    return { ok: false as const, error: "Нельзя отключить свой аккаунт" };
  }

  const item = await prisma.user.update({
    where: { id: parsed.data.id },
    data: {
      role: parsed.data.role,
      isActive: parsed.data.isActive,
    },
  });
  await writeAuditLog({
    actorId: actor.id,
    action: "user.update",
    entityType: "User",
    entityId: item.id,
  });
  revalidatePath("/admin/users");
  return { ok: true as const, item };
}
