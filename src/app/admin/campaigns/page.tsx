import { requireSession } from "@/server/auth/guards";
import { prisma } from "@/server/db";
import { CatalogManager } from "@/components/admin/catalog-manager";
import { upsertCampaignAction } from "@/server/actions/links";

export default async function CampaignsPage() {
  const session = await requireSession();
  const items = await prisma.campaign.findMany({
    where:
      session.user.role === "USER"
        ? { createdById: session.user.id }
        : undefined,
    orderBy: { createdAt: "desc" },
  });

  return (
    <CatalogManager
      title="Кампании"
      description="Группировка UTM-кампаний для фильтров и отчётности"
      items={items.map((c) => ({
        ...c,
        isActive: true,
        sortOrder: 0,
      }))}
      mode="campaign"
      action={upsertCampaignAction}
    />
  );
}
