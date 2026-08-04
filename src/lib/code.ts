import {
  CODE_LENGTH_MAX,
  CODE_LENGTH_MIN,
  CODE_LENGTH_WITH_CATEGORY,
  CODE_LENGTH_WITHOUT_CATEGORY,
  CUSTOM_ALIAS_MAX,
  CUSTOM_ALIAS_MIN,
  RESERVED_PATHS,
  SAFE_CODE_ALPHABET,
} from "@/lib/constants";

export function normalizeUtmValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_\-.]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function normalizeCode(code: string): string {
  return code.trim().toLowerCase();
}

export function generateShortCode(length: number): string {
  let result = "";
  const alphabet = SAFE_CODE_ALPHABET;
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < length; i++) {
    result += alphabet[bytes[i]! % alphabet.length];
  }
  return result;
}

export function defaultCodeLength(hasCategory: boolean): number {
  return hasCategory
    ? CODE_LENGTH_WITH_CATEGORY
    : CODE_LENGTH_WITHOUT_CATEGORY;
}

export function resolveCodeLength(
  hasCategory: boolean,
  requested?: number | null,
): number {
  if (
    typeof requested === "number" &&
    Number.isInteger(requested) &&
    requested >= CODE_LENGTH_MIN &&
    requested <= CODE_LENGTH_MAX
  ) {
    return requested;
  }
  return defaultCodeLength(hasCategory);
}

export function isValidCodeLength(length: number): boolean {
  return (
    Number.isInteger(length) &&
    length >= CODE_LENGTH_MIN &&
    length <= CODE_LENGTH_MAX
  );
}

export function isReservedPath(segment: string): boolean {
  return (RESERVED_PATHS as readonly string[]).includes(
    segment.trim().toLowerCase(),
  );
}

export function isValidCustomAlias(alias: string): boolean {
  if (alias.length < CUSTOM_ALIAS_MIN || alias.length > CUSTOM_ALIAS_MAX) {
    return false;
  }
  if (!/^[a-zA-Z0-9-]+$/.test(alias)) {
    return false;
  }
  if (isReservedPath(alias)) {
    return false;
  }
  return true;
}

export function buildPublicPath(
  code: string,
  categorySlug?: string | null,
): string {
  const normalized = code.trim();
  if (categorySlug) {
    return `${categorySlug}/${normalized}`;
  }
  return normalized;
}

export function buildShortUrl(
  appUrl: string,
  code: string,
  categorySlug?: string | null,
): string {
  const base = appUrl.replace(/\/$/, "");
  return `${base}/${buildPublicPath(code, categorySlug)}`;
}
