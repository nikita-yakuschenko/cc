import { isSafeRedirectTarget } from "@/lib/url";

const MAX_HTML_BYTES = 256 * 1024;
const FETCH_TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 5;

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    );
}

function normalizeHeading(text: string): string {
  return decodeHtmlEntities(text)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

export function parsePageHeadingFromHtml(html: string): string | null {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  if (h1) {
    const value = normalizeHeading(h1);
    if (value) return value;
  }

  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  if (title) {
    const value = normalizeHeading(title);
    if (value) return value;
  }

  return null;
}

async function fetchHtml(url: string): Promise<string | null> {
  let current = url;

  for (let hop = 0; hop < MAX_REDIRECTS; hop++) {
    if (!isSafeRedirectTarget(current)) {
      return null;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(current, {
        signal: controller.signal,
        redirect: "manual",
        headers: {
          "User-Agent": "go.avgst.ru LinkBot/1.0",
          Accept: "text/html,application/xhtml+xml",
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) return null;
        current = new URL(location, current).href;
        continue;
      }

      if (!response.ok) return null;

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html")) return null;

      const html = (await response.text()).slice(0, MAX_HTML_BYTES);
      return html;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  return null;
}

/** Читает H1 целевой страницы, при отсутствии — title. */
export async function fetchPageHeading(url: string): Promise<string | null> {
  if (!isSafeRedirectTarget(url)) {
    return null;
  }

  const html = await fetchHtml(url);
  if (!html) {
    return null;
  }

  return parsePageHeadingFromHtml(html);
}
