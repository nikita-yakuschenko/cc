import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db";
import { getShortLinkUrl } from "@/server/links/service";
import { canManageAllLinks } from "@/server/auth/guards";
import { checkRateLimit } from "@/server/rate-limit";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = checkRateLimit(`qr:${session.user.id}`, 60, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { id } = await context.params;
  const link = await prisma.shortLink.findFirst({
    where: { id, deletedAt: null },
    include: { category: true },
  });

  if (!link) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (
    session.user.role === "USER" &&
    link.createdById !== session.user.id &&
    !canManageAllLinks(session.user.role)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = getShortLinkUrl(link);
  const png = await QRCode.toBuffer(url, {
    type: "png",
    width: 512,
    margin: 2,
  });

  const format = request.nextUrl.searchParams.get("format");
  if (format === "dataurl") {
    const dataUrl = await QRCode.toDataURL(url, { width: 512, margin: 2 });
    return NextResponse.json({ url, dataUrl });
  }

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="qr-${link.code}.png"`,
    },
  });
}
