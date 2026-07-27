import type { OAuthConfig } from "next-auth/providers";
import { prisma } from "@/server/db";
import { getBitrixAdminEmails } from "@/lib/env";
import { GUEST_USER_EMAIL } from "@/lib/constants";

export type BitrixProfile = {
  ID: string | number;
  NAME?: string;
  LAST_NAME?: string;
  EMAIL?: string;
  ACTIVE?: boolean | string;
};

type BitrixTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  client_endpoint?: string;
  domain?: string;
  error?: string;
  error_description?: string;
};

function portalBase(): string {
  const url = process.env.BITRIX_PORTAL_URL?.trim();
  if (!url) {
    throw new Error("BITRIX_PORTAL_URL is not configured");
  }
  return url.replace(/\/$/, "");
}

function bitrixClientId(): string {
  const id = process.env.BITRIX_CLIENT_ID?.trim();
  if (!id) throw new Error("BITRIX_CLIENT_ID is not configured");
  return id;
}

function bitrixClientSecret(): string {
  const secret = process.env.BITRIX_CLIENT_SECRET?.trim();
  if (!secret) throw new Error("BITRIX_CLIENT_SECRET is not configured");
  return secret;
}

function isBitrixActive(profile: BitrixProfile): boolean {
  if (profile.ACTIVE === false || profile.ACTIVE === "N") return false;
  return true;
}

function displayName(profile: BitrixProfile): string {
  const name = [profile.NAME, profile.LAST_NAME]
    .map((p) => (p || "").trim())
    .filter(Boolean)
    .join(" ");
  return name || `Bitrix #${profile.ID}`;
}

function profileEmail(profile: BitrixProfile): string {
  const email = (profile.EMAIL || "").trim().toLowerCase();
  if (email) return email;
  return `bitrix-${profile.ID}@users.bitrix.local`;
}

/** Синхронизация пользователя Bitrix → локальная таблица User */
export async function syncBitrixUser(profile: BitrixProfile) {
  if (!isBitrixActive(profile)) return null;

  const bitrixId = String(profile.ID);
  const email = profileEmail(profile);
  if (email === GUEST_USER_EMAIL) return null;

  const name = displayName(profile);
  const existing = await prisma.user.findFirst({
    where: { OR: [{ bitrixId }, { email }] },
  });

  if (existing) {
    if (!existing.isActive) return null;
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        bitrixId,
        name,
        email,
        passwordHash: null,
      },
    });
  }

  const admins = getBitrixAdminEmails();
  const role = admins.has(email) ? "ADMIN" : "USER";

  return prisma.user.create({
    data: {
      bitrixId,
      email,
      name,
      role,
      passwordHash: null,
      isActive: true,
    },
  });
}

export function BitrixProvider(): OAuthConfig<BitrixProfile> {
  // Build-time placeholders — реальные значения читаются в runtime-хендлерах
  const portal =
    process.env.BITRIX_PORTAL_URL?.replace(/\/$/, "") ||
    "https://build.invalid";
  const clientId = process.env.BITRIX_CLIENT_ID || "build-client-id";
  const clientSecret = process.env.BITRIX_CLIENT_SECRET || "build-client-secret";

  return {
    id: "bitrix",
    name: "Bitrix24",
    type: "oauth",
    clientId,
    clientSecret,
    authorization: {
      url: `${portal}/oauth/authorize/`,
      params: { response_type: "code" },
    },
    token: {
      url: "https://oauth.bitrix24.tech/oauth/token/",
      async request({
        provider,
        params,
      }: {
        provider: { clientId?: string; clientSecret?: string };
        params: { code?: string };
      }) {
        const url = new URL("https://oauth.bitrix24.tech/oauth/token/");
        url.searchParams.set("grant_type", "authorization_code");
        url.searchParams.set("client_id", bitrixClientId());
        url.searchParams.set("client_secret", bitrixClientSecret());
        url.searchParams.set("code", String(params.code));

        const res = await fetch(url.toString(), { method: "GET" });
        const data = (await res.json()) as BitrixTokenResponse;
        if (!res.ok || !data.access_token) {
          throw new Error(
            data.error_description || data.error || "Bitrix token exchange failed",
          );
        }

        return {
          tokens: {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_in: data.expires_in,
            // client_endpoint нужен для user.current
            client_endpoint: data.client_endpoint,
          },
        };
      },
    },
    userinfo: `${portal}/rest/user.current.json`,
    profile(profile) {
      const bitrixProfile = (profile as { result?: BitrixProfile }).result ?? profile;
      return {
        id: String(bitrixProfile.ID),
        name: displayName(bitrixProfile),
        email: profileEmail(bitrixProfile),
        // роль подставится в jwt после syncBitrixUser
        role: "USER",
      };
    },
    checks: ["state"],
    style: { brandColor: "#2fc6f6" },
  };
}
