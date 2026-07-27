import { createHmac, timingSafeEqual } from "node:crypto";
import { getEnv } from "@/lib/env";
import { OAUTH_STATE_COOKIE, SESSION_COOKIE } from "@/server/auth/constants";
const SESSION_TTL_SEC = 60 * 60 * 24 * 30;

type SignedPayload = Record<string, unknown>;

function encodeBase64Url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function decodeBase64Url(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function signValue(value: string): string {
  return createHmac("sha256", getEnv().AUTH_SECRET).update(value).digest("base64url");
}

export function signPayload(payload: SignedPayload): string {
  const json = JSON.stringify(payload);
  const encoded = encodeBase64Url(json);
  const signature = signValue(encoded);
  return `${encoded}.${signature}`;
}

export function unsignPayload<T extends SignedPayload>(token: string | null | undefined): T | null {
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = signValue(encoded);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return null;
  if (!timingSafeEqual(left, right)) return null;

  try {
    const payload = JSON.parse(decodeBase64Url(encoded)) as T & { exp?: number };
    if (typeof payload.exp === "number" && payload.exp < Date.now() / 1000) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function makeOAuthStateToken(state: string): string {
  return signPayload({
    state,
    exp: Math.floor(Date.now() / 1000) + 600,
  });
}

export function makeSessionToken(userId: string): string {
  return signPayload({
    userId,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SEC,
  });
}

export function getSessionMaxAge(): number {
  return SESSION_TTL_SEC;
}
