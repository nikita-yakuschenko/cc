import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getPublicAppUrl } from "@/lib/env";
import { getBitrixClientId, getBitrixPortalBase } from "@/server/auth/bitrix";
import { OAUTH_STATE_COOKIE } from "@/server/auth/constants";
import { makeOAuthStateToken } from "@/server/auth/session";

export async function GET() {
  const state = randomBytes(24).toString("base64url");
  const redirectUri = `${getPublicAppUrl()}/api/bitrix/callback`;
  const url = new URL(`${getBitrixPortalBase()}/oauth/authorize/`);
  url.searchParams.set("client_id", getBitrixClientId());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  url.searchParams.set("redirect_uri", redirectUri);

  const response = NextResponse.redirect(url);
  response.cookies.set(OAUTH_STATE_COOKIE, makeOAuthStateToken(state), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
