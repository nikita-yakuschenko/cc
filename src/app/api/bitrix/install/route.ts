import { NextResponse } from "next/server";

/**
 * Callback установки локального приложения Bitrix («Использует только API»).
 * Портал шлёт POST с OAuth-токенами — достаточно ответить 200.
 */
export async function POST() {
  return new NextResponse("OK", { status: 200 });
}

export async function GET() {
  return new NextResponse("OK", { status: 200 });
}
