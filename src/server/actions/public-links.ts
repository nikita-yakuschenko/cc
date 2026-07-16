"use server";

import { headers } from "next/headers";
import { z } from "zod";
import {
  createAnonymousShortLink,
  countAnonymousLinksByIp,
  hashIp,
} from "@/server/links/service";
import { checkRateLimit } from "@/server/rate-limit";
import { ANONYMOUS_LINK_LIMIT_PER_IP } from "@/lib/constants";
import { getPublicAppUrl } from "@/lib/env-public";

async function clientIp(): Promise<string | null> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    null
  );
}

export async function createPublicLinkAction(raw: unknown) {
  const parsed = z
    .object({ originalUrl: z.string().url() })
    .safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: "Укажите корректный URL" };
  }

  const ip = await clientIp();
  const ipHash = hashIp(ip || "unknown");
  if (!ipHash) {
    return { ok: false as const, error: "Не удалось определить адрес" };
  }

  const burst = checkRateLimit(`public-create:${ipHash}`, 10, 60_000);
  if (!burst.ok) {
    return {
      ok: false as const,
      error: `Слишком много запросов. Подождите ${burst.retryAfterSec} с.`,
    };
  }

  try {
    const link = await createAnonymousShortLink(
      parsed.data.originalUrl,
      ipHash,
    );
    const used = await countAnonymousLinksByIp(ipHash);
    const shortUrl = `${getPublicAppUrl()}/${link.publicPath}`;
    return {
      ok: true as const,
      shortUrl,
      publicPath: link.publicPath,
      remaining: Math.max(0, ANONYMOUS_LINK_LIMIT_PER_IP - used),
      limit: ANONYMOUS_LINK_LIMIT_PER_IP,
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Ошибка создания",
    };
  }
}

export async function getPublicQuotaAction() {
  const ip = await clientIp();
  const ipHash = hashIp(ip || "unknown");
  if (!ipHash) {
    return { used: 0, remaining: ANONYMOUS_LINK_LIMIT_PER_IP, limit: ANONYMOUS_LINK_LIMIT_PER_IP };
  }
  const used = await countAnonymousLinksByIp(ipHash);
  return {
    used,
    remaining: Math.max(0, ANONYMOUS_LINK_LIMIT_PER_IP - used),
    limit: ANONYMOUS_LINK_LIMIT_PER_IP,
  };
}
