const PRIVATE_IPV4 =
  /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/;

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
]);

export type UrlAnalysis = {
  ok: true;
  url: URL;
  href: string;
  origin: string;
  pathname: string;
  searchParams: Record<string, string>;
  hasUtm: boolean;
  utm: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  };
};

export type UrlAnalysisError = {
  ok: false;
  error: string;
};

export function analyzeUrl(input: string): UrlAnalysis | UrlAnalysisError {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, error: "Укажите URL" };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, error: "Некорректный URL" };
  }

  const protocol = url.protocol.toLowerCase();
  if (protocol !== "http:" && protocol !== "https:") {
    return { ok: false, error: "Разрешены только протоколы http и https" };
  }

  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(hostname) || hostname.endsWith(".local")) {
    return { ok: false, error: "Локальные адреса запрещены" };
  }

  if (PRIVATE_IPV4.test(hostname) || hostname === "::1") {
    return { ok: false, error: "Приватные IP-адреса запрещены" };
  }

  if (hostname.includes(":")) {
    if (
      hostname.startsWith("fc") ||
      hostname.startsWith("fd") ||
      hostname.startsWith("fe80")
    ) {
      return { ok: false, error: "Приватные IP-адреса запрещены" };
    }
  }

  const searchParams: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    searchParams[key] = value;
  });

  const utm = {
    source: url.searchParams.get("utm_source") ?? undefined,
    medium: url.searchParams.get("utm_medium") ?? undefined,
    campaign: url.searchParams.get("utm_campaign") ?? undefined,
    content: url.searchParams.get("utm_content") ?? undefined,
    term: url.searchParams.get("utm_term") ?? undefined,
  };

  const hasUtm = Boolean(
    utm.source || utm.medium || utm.campaign || utm.content || utm.term,
  );

  return {
    ok: true,
    url,
    href: url.href,
    origin: url.origin,
    pathname: url.pathname,
    searchParams,
    hasUtm,
    utm,
  };
}

export function isSafeRedirectTarget(targetUrl: string): boolean {
  return analyzeUrl(targetUrl).ok;
}

export function applyUtmToUrl(
  baseUrl: string,
  utm: {
    source?: string | null;
    medium?: string | null;
    campaign?: string | null;
    content?: string | null;
    term?: string | null;
  },
  mode: "keep" | "replace" | "remove" = "replace",
): string {
  const analysis = analyzeUrl(baseUrl);
  if (!analysis.ok) {
    throw new Error(analysis.error);
  }

  const url = new URL(analysis.href);

  if (mode === "remove") {
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(
      (key) => url.searchParams.delete(key),
    );
    return url.toString();
  }

  if (mode === "keep") {
    return url.toString();
  }

  ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(
    (key) => url.searchParams.delete(key),
  );

  if (utm.source) url.searchParams.set("utm_source", utm.source);
  if (utm.medium) url.searchParams.set("utm_medium", utm.medium);
  if (utm.campaign) url.searchParams.set("utm_campaign", utm.campaign);
  if (utm.content) url.searchParams.set("utm_content", utm.content);
  if (utm.term) url.searchParams.set("utm_term", utm.term);

  return url.toString();
}
