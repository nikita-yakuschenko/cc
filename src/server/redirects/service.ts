import { UAParser } from "ua-parser-js";
import { prisma } from "@/server/db";
import { hashIp } from "@/server/links/service";
import { isSafeRedirectTarget } from "@/server/links/url";
import { isReservedPath } from "@/server/links/code";

const BOT_HINTS =
  /bot|crawl|spider|slurp|facebookexternalhit|preview|wget|curl|python-requests|httpclient/i;

export type RedirectResult =
  | { status: "redirect"; targetUrl: string; linkId: string }
  | { status: "not_found" }
  | { status: "disabled" }
  | { status: "expired" }
  | { status: "unsafe" };

export function parsePublicPath(
  segments: string[],
): { categorySlug?: string; code: string } | null {
  if (segments.length === 1) {
    const code = segments[0]!;
    if (isReservedPath(code)) return null;
    return { code };
  }
  if (segments.length === 2) {
    const [categorySlug, code] = segments;
    if (!categorySlug || !code) return null;
    if (isReservedPath(categorySlug)) return null;
    return { categorySlug, code };
  }
  return null;
}

function detectBot(userAgent?: string | null): boolean {
  if (!userAgent) return false;
  return BOT_HINTS.test(userAgent);
}

export async function resolveRedirect(
  segments: string[],
  requestMeta: {
    referer?: string | null;
    userAgent?: string | null;
    ip?: string | null;
  },
): Promise<RedirectResult> {
  const parsed = parsePublicPath(segments);
  if (!parsed) {
    return { status: "not_found" };
  }

  const publicPath = parsed.categorySlug
    ? `${parsed.categorySlug}/${parsed.code}`.toLowerCase()
    : parsed.code.toLowerCase();

  const link = await prisma.shortLink.findFirst({
    where: {
      publicPath,
      deletedAt: null,
    },
    include: {
      category: true,
    },
  });

  if (!link) {
    return { status: "not_found" };
  }

  if (parsed.categorySlug) {
    if (!link.category || link.category.slug !== parsed.categorySlug) {
      return { status: "not_found" };
    }
  } else if (link.categoryId) {
    return { status: "not_found" };
  }

  if (!link.isActive) {
    return { status: "disabled" };
  }

  if (link.expiresAt && link.expiresAt.getTime() <= Date.now()) {
    return { status: "expired" };
  }

  if (!isSafeRedirectTarget(link.targetUrl)) {
    return { status: "unsafe" };
  }

  const ua = requestMeta.userAgent ?? "";
  const parser = new UAParser(ua);
  const uaResult = parser.getResult();
  const isBot = detectBot(ua);

  const deviceType =
    uaResult.device.type ||
    (uaResult.device.model ? "mobile" : "desktop") ||
    "unknown";

  await prisma.$transaction(async (tx) => {
    await tx.clickEvent.create({
      data: {
        shortLinkId: link.id,
        referer: requestMeta.referer ?? null,
        userAgent: ua || null,
        deviceType,
        browser: uaResult.browser.name ?? null,
        operatingSystem: uaResult.os.name ?? null,
        ipHash: hashIp(requestMeta.ip),
        isBot,
        metadata: {
          browserVersion: uaResult.browser.version ?? null,
          osVersion: uaResult.os.version ?? null,
        },
      },
    });

    if (!isBot) {
      await tx.shortLink.update({
        where: { id: link.id },
        data: { clickCountCache: { increment: 1 } },
      });
    }
  });

  return {
    status: "redirect",
    targetUrl: link.targetUrl,
    linkId: link.id,
  };
}
