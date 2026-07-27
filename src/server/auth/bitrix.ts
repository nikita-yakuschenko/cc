import type { OAuthConfig } from "next-auth/providers";
import { prisma } from "@/server/db";
import { getBitrixAdminEmails, getBitrixEnv } from "@/lib/env";
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
  return getBitrixEnv().BITRIX_PORTAL_URL.replace(/\/$/, "");
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
  const env = getBitrixEnv();
  const portal = portalBase();

  return {
    id: "bitrix",
    name: "Bitrix24",
    type: "oauth",
    clientId: env.BITRIX_CLIENT_ID,
    clientSecret: env.BITRIX_CLIENT_SECRET,
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
        url.searchParams.set("client_id", String(provider.clientId));
        url.searchParams.set("client_secret", String(provider.clientSecret));
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
    userinfo: {
      async request({
        tokens,
      }: {
        tokens: {
          access_token?: string;
          client_endpoint?: string;
        };
      }) {
        const endpoint =
          tokens.client_endpoint || `${portal}/rest/`;
        const base = endpoint.endsWith("/") ? endpoint : `${endpoint}/`;
        const res = await fetch(
          `${base}user.current.json?auth=${encodeURIComponent(String(tokens.access_token))}`,
        );
        const data = (await res.json()) as {
          result?: BitrixProfile;
          error_description?: string;
          error?: string;
        };
        if (!res.ok || !data.result) {
          throw new Error(
            data.error_description || data.error || "Bitrix user.current failed",
          );
        }
        return data.result;
      },
    },
    profile(profile) {
      return {
        id: String(profile.ID),
        name: displayName(profile),
        email: profileEmail(profile),
        // роль подставится в jwt после syncBitrixUser
        role: "USER",
      };
    },
    checks: ["state"],
    style: { brandColor: "#2fc6f6" },
  };
}
