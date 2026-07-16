import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/server/auth/guards";
import { prisma } from "@/server/db";
import { getLinkStats } from "@/server/analytics/service";
import { LinkDetailClient } from "@/components/admin/link-detail-client";

export default async function LinkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;

  const link = await prisma.shortLink.findFirst({
    where: { id, deletedAt: null },
    include: {
      category: { select: { name: true, slug: true } },
      createdBy: { select: { name: true, email: true } },
    },
  });

  if (!link) notFound();

  if (
    session.user.role === "USER" &&
    link.createdById !== session.user.id
  ) {
    redirect("/admin/links");
  }

  const stats = await getLinkStats(link.id, { excludeBots: true, days: 30 });

  return (
    <LinkDetailClient
      link={link}
      stats={stats}
      canDelete={
        session.user.role === "ADMIN" || session.user.role === "MANAGER"
      }
    />
  );
}
