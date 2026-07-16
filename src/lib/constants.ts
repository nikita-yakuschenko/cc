export const RESERVED_PATHS = [
  "admin",
  "api",
  "login",
  "auth",
  "health",
  "docs",
  "qr",
  "stats",
  "settings",
  "register",
] as const;

export const SAFE_CODE_ALPHABET =
  "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const CODE_LENGTH_WITH_CATEGORY = 5;
export const CODE_LENGTH_WITHOUT_CATEGORY = 7;

export const CUSTOM_ALIAS_MIN = 3;
export const CUSTOM_ALIAS_MAX = 64;

export const APP_NAME = "Relay";

export const GUEST_USER_EMAIL = "guest@system.go.avgst.ru";
export const ANONYMOUS_LINK_LIMIT_PER_IP = 5;
