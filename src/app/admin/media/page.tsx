import { requireRole } from "@/server/auth/guards";
import { prisma } from "@/server/db";
import { CatalogManager } from "@/components/admin/catalog-manager";
import { upsertUtmMediumAction } from "@/server/actions/links";

export default async function MediaPage() {
  await requireRole(["ADMIN"]);
  const items = await prisma.utmMedium.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return (
    <CatalogManager
      title="Справочник каналов"
      description="utm_medium: понятные названия и технические значения"
      items={items}
      mode="medium"
      action={upsertUtmMediumAction}
    />
  );
}
