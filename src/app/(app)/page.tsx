import { prisma } from "@/server/db";
import { CreateLinkWizard } from "@/components/admin/create-link-wizard";

export default async function AdminHomePage() {
  const [categories, sources, media, campaigns] = await Promise.all([
    prisma.linkCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    prisma.utmSource.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, value: true },
    }),
    prisma.utmMedium.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, value: true },
    }),
    prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, slug: true },
    }),
  ]);

  return (
    <CreateLinkWizard
      categories={categories}
      sources={sources}
      media={media}
      campaigns={campaigns}
    />
  );
}
