import { prisma } from "@/server/db";
import { resolveRoleFromEmail, getBitrixSuperAdminEmails } from "@/lib/env";
import { GUEST_USER_EMAIL } from "@/lib/constants";
import type { AppRole } from "@/server/auth/types";

export type BitrixProfile = {
  ID: string | number;
  NAME?: string;
  LAST_NAME?: string;
  EMAIL?: string;
  ACTIVE?: boolean | string;
};

export type BitrixTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  client_endpoint?: string;
  domain?: string;
  error?: string;
  error_description?: string;
};

export function getBitrixPortalBase(): string {
  const portal = process.env.BITRIX_PORTAL_URL?.trim();
  if (!portal) {
    throw new Error("BITRIX_PORTAL_URL is not configured");
  }
  return portal.replace(/\/$/, "");
}

export function getBitrixClientId(): string {
  const clientId = process.env.BITRIX_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error("BITRIX_CLIENT_ID is not configured");
  }
  return clientId;
}

export function getBitrixClientSecret(): string {
  const clientSecret = process.env.BITRIX_CLIENT_SECRET?.trim();
  if (!clientSecret) {
    throw new Error("BITRIX_CLIENT_SECRET is not configured");
  }
  return clientSecret;
}

function isBitrixActive(profile: BitrixProfile): boolean {
  if (profile.ACTIVE === false || profile.ACTIVE === "N") return false;
  return true;
}

function displayName(profile: BitrixProfile): string {
  const name = [profile.NAME, profile.LAST_NAME]
    .map((part) => (part || "").trim())
    .filter(Boolean)
    .join(" ");
  return name || `Bitrix #${profile.ID}`;
}

function profileEmail(profile: BitrixProfile): string {
  const email = (profile.EMAIL || "").trim().toLowerCase();
  if (email) return email;
  return `bitrix-${profile.ID}@users.bitrix.local`;
}

export function getProfileDisplay(profile: BitrixProfile): {
  name: string;
  email: string;
} {
  return {
    name: displayName(profile),
    email: profileEmail(profile),
  };
}

/** Пользователь Bitrix синхронизируется в локальную таблицу User при входе. */
export async function syncBitrixUser(profile: BitrixProfile): Promise<{
  id: string;
  name: string;
  email: string;
  role: AppRole;
} | null> {
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
    const superAdmins = getBitrixSuperAdminEmails();
    const isSuperAdmin = superAdmins.has(email);
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        bitrixId,
        name,
        email,
        passwordHash: null,
        ...(isSuperAdmin ? { role: "SUPER_ADMIN" as const } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });
  }

  const role = resolveRoleFromEmail(email);

  return prisma.user.create({
    data: {
      bitrixId,
      email,
      name,
      role,
      passwordHash: null,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });
}

export async function exchangeBitrixCode(
  code: string,
  redirectUri?: string,
): Promise<BitrixTokenResponse> {
  const url = new URL("https://oauth.bitrix24.tech/oauth/token/");
  url.searchParams.set("grant_type", "authorization_code");
  url.searchParams.set("client_id", getBitrixClientId());
  url.searchParams.set("client_secret", getBitrixClientSecret());
  url.searchParams.set("code", code);
  if (redirectUri) {
    url.searchParams.set("redirect_uri", redirectUri);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
  });
  const payload = (await response.json()) as BitrixTokenResponse;
  if (!response.ok || !payload.access_token) {
    throw new Error(
      payload.error_description || payload.error || "Bitrix token exchange failed",
    );
  }
  return payload;
}

export async function fetchBitrixProfile(
  accessToken: string,
  clientEndpoint?: string,
): Promise<BitrixProfile> {
  const endpoint = (clientEndpoint || `${getBitrixPortalBase()}/rest`).replace(/\/$/, "");

  const response = await fetch(`${endpoint}/user.current`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ auth: accessToken }),
    cache: "no-store",
  });

  const payload = (await response.json()) as {
    result?: BitrixProfile;
    error?: string;
    error_description?: string;
  };
  if (!response.ok || !payload.result) {
    throw new Error(
      payload.error_description || payload.error || "Bitrix user.current failed",
    );
  }
  return payload.result;
}
