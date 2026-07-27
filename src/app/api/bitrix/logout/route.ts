import { NextResponse } from "next/server";
import { OAUTH_STATE_COOKIE, SESSION_COOKIE } from "@/server/auth/constants";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(OAUTH_STATE_COOKIE);
  return response;
}
