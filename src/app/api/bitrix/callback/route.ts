import { NextRequest, NextResponse } from "next/server";
import { getPublicAppUrl } from "@/lib/env";
import {
  exchangeBitrixCode,
  fetchBitrixProfile,
  syncBitrixUser,
} from "@/server/auth/bitrix";
import {
  getSessionMaxAge,
  makeSessionToken,
  unsignPayload,
} from "@/server/auth/session";
import { OAUTH_STATE_COOKIE, SESSION_COOKIE } from "@/server/auth/constants";

export async function GET(request: NextRequest) {
  const error = request.nextUrl.searchParams.get("error");
  if (error) {
    return NextResponse.redirect(new URL("/login?error=bitrix", request.url));
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const stateToken = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  const saved = unsignPayload<{ state: string; exp: number }>(stateToken);

  if (!code || !state || !saved || saved.state !== state) {
    return NextResponse.redirect(new URL("/login?error=state", request.url));
  }

  try {
    const redirectUri = `${getPublicAppUrl()}/api/bitrix/callback`;
    const token = await exchangeBitrixCode(code, redirectUri);
    const profile = await fetchBitrixProfile(
      token.access_token,
      token.client_endpoint,
    );
    const user = await syncBitrixUser(profile);
    if (!user) {
      return NextResponse.redirect(new URL("/login?error=inactive", request.url));
    }

    const response = NextResponse.redirect(new URL("/admin", getPublicAppUrl()));
    response.cookies.set(SESSION_COOKIE, makeSessionToken(user.id), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: getSessionMaxAge(),
      path: "/",
    });
    response.cookies.delete(OAUTH_STATE_COOKIE);
    return response;
  } catch {
    const response = NextResponse.redirect(new URL("/login?error=bitrix", request.url));
    response.cookies.delete(OAUTH_STATE_COOKIE);
    return response;
  }
}
