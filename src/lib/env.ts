import { z } from "zod";
import type { Role } from "@prisma/client";

const coreEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(16),
  APP_URL: z.string().url().default("http://localhost:3330"),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  IP_HASH_SALT: z.string().min(8).default("change-me-ip-salt"),
});

const bitrixEnvSchema = z.object({
  BITRIX_PORTAL_URL: z.string().url(),
  BITRIX_CLIENT_ID: z.string().min(1),
  BITRIX_CLIENT_SECRET: z.string().min(1),
  BITRIX_ADMIN_EMAILS: z.string().default(""),
  BITRIX_SUPER_ADMIN_EMAILS: z.string().default(""),
});

export type ServerEnv = z.infer<typeof coreEnvSchema> &
  z.infer<typeof bitrixEnvSchema>;

let cachedCore: z.infer<typeof coreEnvSchema> | null = null;
let cachedBitrix: z.infer<typeof bitrixEnvSchema> | null = null;

export function getEnv(): z.infer<typeof coreEnvSchema> {
  if (cachedCore) return cachedCore;
  const parsed = coreEnvSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    APP_URL: process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    IP_HASH_SALT: process.env.IP_HASH_SALT,
  });
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.message}`);
  }
  cachedCore = parsed.data;
  return cachedCore;
}

export function getBitrixEnv(): z.infer<typeof bitrixEnvSchema> {
  if (cachedBitrix) return cachedBitrix;
  const parsed = bitrixEnvSchema.safeParse({
    BITRIX_PORTAL_URL: process.env.BITRIX_PORTAL_URL,
    BITRIX_CLIENT_ID: process.env.BITRIX_CLIENT_ID,
    BITRIX_CLIENT_SECRET: process.env.BITRIX_CLIENT_SECRET,
    BITRIX_ADMIN_EMAILS: process.env.BITRIX_ADMIN_EMAILS,
    BITRIX_SUPER_ADMIN_EMAILS: process.env.BITRIX_SUPER_ADMIN_EMAILS,
  });
  if (!parsed.success) {
    throw new Error(`Invalid Bitrix environment: ${parsed.error.message}`);
  }
  cachedBitrix = parsed.data;
  return cachedBitrix;
}

export function getPublicAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "http://localhost:3330"
  ).replace(/\/$/, "");
}

export function getBitrixAdminEmails(): Set<string> {
  const raw = process.env.BITRIX_ADMIN_EMAILS || "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function getBitrixSuperAdminEmails(): Set<string> {
  const raw = process.env.BITRIX_SUPER_ADMIN_EMAILS || "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function resolveRoleFromEmail(email: string): Role {
  const normalized = email.trim().toLowerCase();
  if (getBitrixSuperAdminEmails().has(normalized)) return "SUPER_ADMIN";
  if (getBitrixAdminEmails().has(normalized)) return "ADMIN";
  return "USER";
}
