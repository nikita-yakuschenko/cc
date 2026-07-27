import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/server/auth/constants";

const PROTECTED_EXACT = new Set(["/"]);
const PROTECTED_PREFIXES = [
  "/links",
  "/utm-settings",
  "/categories",
  "/stats",
  "/users",
  "/settings",
];

function isProtectedPath(pathname: string): boolean {
  if (PROTECTED_EXACT.has(pathname)) return true;
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function mapLegacyAdminPath(pathname: string): string | null {
  if (pathname === "/admin" || pathname === "/admin/") return "/";
  if (pathname === "/admin/campaigns") return "/utm-settings?tab=campaigns";
  if (pathname === "/admin/sources") return "/utm-settings?tab=sources";
  if (pathname === "/admin/media") return "/utm-settings?tab=channels";
  if (pathname.startsWith("/admin/")) {
    return pathname.slice("/admin".length) || "/";
  }
  return null;
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoggedIn = !!request.cookies.get(SESSION_COOKIE)?.value;

  const legacy = mapLegacyAdminPath(pathname);
  if (legacy) {
    const url = request.nextUrl.clone();
    if (legacy.includes("?")) {
      const [path, query] = legacy.split("?");
      url.pathname = path || "/";
      url.search = query ? `?${query}` : "";
    } else {
      url.pathname = legacy;
      url.search = request.nextUrl.search;
    }
    return NextResponse.redirect(url);
  }

  if (isProtectedPath(pathname) && !isLoggedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (pathname === "/login" && isLoggedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/admin",
    "/admin/:path*",
    "/links",
    "/links/:path*",
    "/utm-settings",
    "/utm-settings/:path*",
    "/categories",
    "/categories/:path*",
    "/stats",
    "/stats/:path*",
    "/users",
    "/users/:path*",
    "/settings",
    "/settings/:path*",
  ],
};
